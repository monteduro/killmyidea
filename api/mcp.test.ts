import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { evaluationStats, logMcpRequest, saveEvaluation } from './_analytics-db'
import { bar, GET, OPTIONS, POST, PROTOCOL_VERSIONS } from './mcp'

vi.mock('./_analytics-db', () => ({
  saveEvaluation: vi.fn(),
  logMcpRequest: vi.fn(),
  evaluationStats: vi.fn(() => ({ count: 12, verdicts: { KILL: 7, FIX: 3, SHIP: 2 } })),
}))

beforeEach(() => {
  vi.stubEnv('TYPESAFE_MOCK', '1')
  vi.stubEnv('VERCEL', '')
})

afterEach(() => {
  vi.mocked(saveEvaluation).mockClear()
  vi.mocked(logMcpRequest).mockClear()
  vi.unstubAllEnvs()
})

const rpc = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request('http://localhost/api/mcp', {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers,
    }),
  )

const call = async (name: string, args: Record<string, unknown> = {}) => {
  const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })
  return (await res.json()).result
}

type Schema = {
  type?: string | string[]
  enum?: unknown[]
  minimum?: number
  maximum?: number
  minItems?: number
  maxItems?: number
  required?: string[]
  properties?: Record<string, Schema>
  items?: Schema
}

/** Just enough JSON Schema to check our own outputSchema: returns the paths that do not conform. */
function conforms(value: unknown, schema: Schema, path = '$'): string[] {
  const kind = value === null ? 'null' : Array.isArray(value) ? 'array' : Number.isInteger(value) ? 'integer' : typeof value
  const types = schema.type === undefined ? [] : [schema.type].flat()
  if (types.length && !types.includes(kind) && !(kind === 'integer' && types.includes('number'))) return [`${path}: ${kind}`]
  if (schema.enum && !schema.enum.includes(value)) return [`${path}: ${String(value)} not in enum`]
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) return [`${path}: below minimum`]
    if (schema.maximum !== undefined && value > schema.maximum) return [`${path}: above maximum`]
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) return [`${path}: too few items`]
    if (schema.maxItems !== undefined && value.length > schema.maxItems) return [`${path}: too many items`]
    return schema.items ? value.flatMap((v, i) => conforms(v, schema.items!, `${path}[${i}]`)) : []
  }
  if (kind === 'object') {
    const obj = value as Record<string, unknown>
    const missing = (schema.required ?? []).filter((k) => !(k in obj)).map((k) => `${path}.${k}: missing`)
    const nested = Object.entries(schema.properties ?? {}).flatMap(([k, s]) => (k in obj ? conforms(obj[k], s, `${path}.${k}`) : []))
    return [...missing, ...nested]
  }
  return []
}

describe('MCP lifecycle', () => {
  it('negotiates the protocol version and advertises tools', async () => {
    const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {} } })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    const { result } = await res.json()
    expect(result.protocolVersion).toBe('2025-06-18')
    expect(result.capabilities).toHaveProperty('tools')
    expect(result.serverInfo.name).toBe('killmyidea')
    expect(result.serverInfo.title).toBe('Kill My Idea')
    expect(result.serverInfo.websiteUrl).toBe('https://killmyidea.biz/mcp/')
    expect(result.serverInfo.description).toMatch(/judge a startup or side-project idea/)
    expect(result.serverInfo.icons).toEqual([{ src: 'https://killmyidea.biz/favicon.svg', mimeType: 'image/svg+xml', sizes: ['any'] }])
    expect(result.instructions).toMatch(/judge_idea/)

    const unknown = await (await rpc({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } })).json()
    expect(unknown.result.protocolVersion).toBe(PROTOCOL_VERSIONS[0])
  })

  it('acknowledges notifications with 202 and no body', async () => {
    const res = await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' })
    expect(res.status).toBe(202)
    expect(await res.text()).toBe('')
  })

  it('lists judge_idea and get_stats', async () => {
    const { result } = await (await rpc({ jsonrpc: '2.0', id: 3, method: 'tools/list' })).json()
    expect(result.tools.map((t: { name: string }) => t.name)).toEqual(['judge_idea', 'get_stats'])
    for (const tool of result.tools) {
      for (const hint of ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint']) {
        expect(typeof tool.annotations[hint], `${tool.name}.${hint}`).toBe('boolean')
      }
      for (const [key, field] of Object.entries(tool.outputSchema.properties)) {
        expect((field as { description?: string }).description, `${tool.name} output ${key}`).toBeTruthy()
      }
    }
  })

  it('reports JSON-RPC errors', async () => {
    expect((await rpc('{nope')).status).toBe(400)
    expect((await (await rpc({ jsonrpc: '2.0', id: 4, method: 'nope' })).json()).error.code).toBe(-32601)
    expect((await (await rpc({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'nope' } })).json()).error.code).toBe(-32602)
  })

  it('answers batches', async () => {
    const res = await rpc([
      { jsonrpc: '2.0', id: 1, method: 'ping' },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
    ])
    expect(await res.json()).toEqual([{ jsonrpc: '2.0', id: 1, result: {} }])
  })

  it('refuses a GET stream but shows setup instructions to any other GET', async () => {
    const stream = GET(new Request('http://localhost/api/mcp', { headers: { Accept: 'text/event-stream' } }))
    expect(stream.status).toBe(405)
    const page = GET(new Request('http://localhost/api/mcp', { headers: { Accept: 'text/html' } }))
    expect(page.status).toBe(200)
    expect(page.headers.get('Content-Type')).toMatch(/^text\/plain/)
    const text = await page.text()
    expect(text).toContain('claude mcp add --transport http killmyidea https://killmyidea.biz/api/mcp')
    expect(text).toContain('https://killmyidea.biz/api/mcp/server-card')
    expect(GET().status).toBe(200)
    expect(OPTIONS().status).toBe(204)
  })
})

describe('judge_idea', () => {
  it('returns the verdict without debug data and archives with source mcp', async () => {
    const result = await call('judge_idea', { idea: 'A Slack bot that turns standups into a weekly changelog for clients.' })
    expect(result.isError).toBe(false)
    const out = result.structuredContent
    expect(out.dimensions).toHaveLength(8)
    expect(out.goal).toBe('money')
    expect(out).not.toHaveProperty('debug')
    if (!out.needs_detail) {
      expect(['KILL', 'FIX', 'SHIP']).toContain(out.verdict)
      expect(out.best_signal.note).toBeTruthy()
    }
    expect(result.content[0].type).toBe('text')
    expect(vi.mocked(saveEvaluation).mock.calls[0][0]).toMatchObject({ source: 'mcp' })
  })

  it('honours goal and do_not_archive', async () => {
    const result = await call('judge_idea', {
      idea: 'An open source CLI that lints Dockerfiles for security issues.',
      goal: 'open_source',
      do_not_archive: true,
    })
    expect(result.structuredContent.dimensions.map((d: { key: string }) => d.key)).toContain('adoption')
    expect(saveEvaluation).not.toHaveBeenCalled()
  })

  it('matches its declared outputSchema, with and without needs_detail', async () => {
    const { result: list } = await (await rpc({ jsonrpc: '2.0', id: 9, method: 'tools/list' })).json()
    const schema = list.tools.find((t: { name: string }) => t.name === 'judge_idea').outputSchema
    // The mock marks ideas under 40 characters as not understandable.
    const judged = await call('judge_idea', { idea: 'A Slack bot that turns standups into a weekly changelog for clients.' })
    const vague = await call('judge_idea', { idea: 'An app for everyone, basically.' })
    expect(judged.structuredContent.needs_detail).toBe(false)
    expect(vague.structuredContent.needs_detail).toBe(true)
    expect(conforms(judged.structuredContent, schema)).toEqual([])
    expect(conforms(vague.structuredContent, schema)).toEqual([])
  })

  it('returns validation problems as tool errors', async () => {
    const result = await call('judge_idea', { idea: 'too short' })
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toMatch(/at least/i)
  })
})

describe('terminal card', () => {
  it('draws fixed-width bars with eighth blocks', () => {
    expect(bar(0)).toBe('░'.repeat(20))
    expect(bar(100)).toBe('█'.repeat(20))
    expect(bar(41)).toBe('████████▎░░░░░░░░░░░')
    for (const n of [3, 19, 50, 87]) expect([...bar(n)]).toHaveLength(20)
  })

  it('returns the verdict card in a code block, one bar per question', async () => {
    const result = await call('judge_idea', { idea: 'A Slack bot that turns standups into a weekly changelog for clients.', do_not_archive: true })
    const text: string = result.content[0].text
    const lines = text.split('\n')
    expect(lines[0]).toBe('```')
    if (!result.structuredContent.needs_detail) {
      expect(lines[1]).toMatch(/^(KILL|FIX|SHIP) IT\s+[█▏▎▍▌▋▊▉░]{20}\s+\d+\/100$/)
      expect(lines.filter((l) => /[█░]{3}/.test(l))).toHaveLength(9)
    }
    expect(text).toContain('Judged by Jev')
  })
})

describe('usage tracking', () => {
  it('logs the client on initialize', async () => {
    await rpc(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', clientInfo: { name: 'claude-code', version: '2.1.0' } } },
      { 'user-agent': 'claude-code/2.1.0' },
    )
    expect(vi.mocked(logMcpRequest).mock.calls[0][0]).toMatchObject({
      method: 'initialize',
      clientName: 'claude-code',
      clientVersion: '2.1.0',
      userAgent: 'claude-code/2.1.0',
      protocolVersion: '2025-06-18',
      ok: true,
    })
  })

  it('logs tool calls, tool errors and RPC errors without arguments', async () => {
    await rpc(
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'judge_idea', arguments: { idea: 'A private idea for a startup.', do_not_archive: true } } },
      { 'mcp-protocol-version': '2025-11-25' },
    )
    await call('judge_idea', { idea: 'short' })
    await rpc({ jsonrpc: '2.0', id: 3, method: 'nope' })

    const [ok, toolError, rpcError] = vi.mocked(logMcpRequest).mock.calls.map((c) => c[0])
    expect(ok).toMatchObject({ method: 'tools/call', tool: 'judge_idea', protocolVersion: '2025-11-25', ok: true })
    expect(JSON.stringify(ok)).not.toContain('private idea')
    expect(toolError).toMatchObject({ tool: 'judge_idea', ok: false, error: expect.stringMatching(/at least/i) })
    expect(rpcError).toMatchObject({ method: 'nope', ok: false, error: '-32601' })
  })

  it('keeps answering when the log fails', async () => {
    vi.mocked(logMcpRequest).mockImplementationOnce(() => {
      throw new Error('disk full')
    })
    const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'ping' })
    expect(await res.json()).toEqual({ jsonrpc: '2.0', id: 1, result: {} })
  })
})

describe('get_stats', () => {
  it('returns the analyzed count and verdict split', async () => {
    const result = await call('get_stats')
    expect(result.structuredContent).toEqual({ analyzed: 12, verdicts: { KILL: 7, FIX: 3, SHIP: 2 } })
    expect(evaluationStats).toHaveBeenCalled()
  })
})
