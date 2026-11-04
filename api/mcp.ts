// POST /api/mcp — free, public MCP server (Streamable HTTP, stateless, no auth).
// Every request is one JSON-RPC message answered with plain JSON: no sessions, no SSE.
// Docs for humans and agents: /mcp/ and /mcp.md.
import { SITE_URL } from '../src/lib/features.js'
import { DECISION_COUNT, DIMENSION_HINTS, DIMENSION_LABELS, GOALS, GOAL_LABELS, type DimensionKey } from '../src/lib/questions.js'
import { dimensionCopy, LOW_CLARITY_COPY } from '../src/lib/copy.js'
import { IDEA_MAX, IDEA_MIN } from '../src/lib/evaluate.js'
import { WEIGHTS } from '../src/lib/scoring.js'
import { bestAndWorst } from '../src/lib/share.js'
import type { Evaluation } from '../src/lib/types.js'
import { VERDICT_THRESHOLDS, verdictLabel } from '../src/lib/verdict.js'
import { evaluationStats, logMcpRequest } from './_analytics-db.js'
import { judge } from './_judge.js'

/** Newest first. An unknown requested version gets the newest one. */
export const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']

const SERVER_INFO = {
  name: 'killmyidea',
  title: 'Kill My Idea',
  version: '1.0.0',
  description:
    'Helps an agent judge a startup or side-project idea before anyone builds it: send a plain-words description and get a KILL IT, FIX IT or SHIP IT verdict, a 0-100 score, the best signal, the biggest risk and eight 0-100 sub-scores from Jev (TypeSafe AI). Also reports how many ideas have been judged and how they ended.',
  icons: [{ src: `${SITE_URL}/favicon.svg`, mimeType: 'image/svg+xml', sizes: ['any'] }],
  websiteUrl: `${SITE_URL}/mcp/`,
}

const INSTRUCTIONS = `Kill My Idea judges startup and side-project ideas with Jev (TypeSafe AI), a classifier, not a chatbot.
Call judge_idea with a concrete description: who it is for, what it does, how it makes money or spreads.
It returns KILL IT (<${VERDICT_THRESHOLDS.fix}), FIX IT (${VERDICT_THRESHOLDS.fix}-${VERDICT_THRESHOLDS.ship - 1}) or SHIP IT (${VERDICT_THRESHOLDS.ship}+), a 0-100 score and eight 0-100 sub-scores.
The text result is a ready-made card with bar charts in a code block: show it to the user exactly as returned, then add at most one sentence on what to test next.
If needs_detail is true, ask the user for more detail instead of inventing a verdict.
Ideas are archived anonymously for product analytics unless do_not_archive is true: set it for confidential ideas.`

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
}

const TOOLS = [
  {
    name: 'judge_idea',
    title: 'Judge a startup idea',
    description: `Judge a startup or side-project idea. Returns a verdict (verdict KILL, FIX or SHIP, shown as verdict_label KILL IT, FIX IT or SHIP IT), an overall score, the best_signal, the biggest_risk and the eight scored dimensions. If the idea is too vague to judge, needs_detail is true and verdict, verdict_label, score, best_signal and biggest_risk are null: ask the user for more detail. ${DECISION_COUNT} Jev decisions in about a second. Deterministic rubric, no generated prose. The text result is a terminal-ready card with bar charts: show it as returned.`,
    inputSchema: {
      type: 'object',
      properties: {
        idea: {
          type: 'string',
          minLength: IDEA_MIN,
          maxLength: IDEA_MAX,
          description: 'The idea in plain words: who it is for, what it does, how it makes money or spreads. More detail, better verdict.',
        },
        goal: {
          type: 'string',
          enum: [...GOALS],
          default: 'money',
          description:
            'Why the idea is being built, which decides the questions it is scored on. Making money judges it as a business. Open source scores Adoption instead of Money. Just for fun scores Immediate appeal and Fun instead of Real problem and Money.',
        },
        do_not_archive: {
          type: 'boolean',
          default: false,
          description: 'Set true for confidential ideas: the idea text is then not stored. Otherwise it is archived anonymously (no IP, no identity).',
        },
      },
      required: ['idea'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        verdict: {
          type: ['string', 'null'],
          enum: ['KILL', 'FIX', 'SHIP', null],
          description: 'Verdict code from the score and the thresholds below. null when needs_detail is true.',
        },
        verdict_label: { type: ['string', 'null'], description: 'Display form of the verdict, e.g. "KILL IT". null when needs_detail is true.' },
        score: {
          type: ['integer', 'null'],
          minimum: 0,
          maximum: 100,
          description: 'Overall score: weighted average of the dimension scores, rounded. null when needs_detail is true.',
        },
        needs_detail: {
          type: 'boolean',
          description: 'True when Jev could not understand the idea well enough to judge it: no verdict, score or signals are given. Ask the user for more detail.',
        },
        message: { type: 'string', description: 'One-line summary such as "SHIP IT. 72/100.", or the request for more detail when needs_detail is true.' },
        goal: { type: 'string', enum: [...GOALS], description: 'The goal the idea was judged against.' },
        category: { type: 'string', description: 'Product category Jev assigned to the idea.' },
        best_signal: {
          type: ['object', 'null'],
          description: 'The highest-scoring dimension. null when needs_detail is true.',
          properties: {
            dimension: { type: 'string', description: 'Dimension key.' },
            label: { type: 'string', description: 'Dimension name for display.' },
            score: { type: 'integer', minimum: 0, maximum: 100, description: 'Dimension score.' },
            note: { type: 'string', description: 'Fixed one-line comment on this strength.' },
          },
          required: ['dimension', 'label', 'score', 'note'],
        },
        biggest_risk: {
          type: ['object', 'null'],
          description: 'The lowest-scoring dimension. null when needs_detail is true.',
          properties: {
            dimension: { type: 'string', description: 'Dimension key.' },
            label: { type: 'string', description: 'Dimension name for display.' },
            score: { type: 'integer', minimum: 0, maximum: 100, description: 'Dimension score.' },
            note: { type: 'string', description: 'Fixed one-line comment on this risk.' },
          },
          required: ['dimension', 'label', 'score', 'note'],
        },
        dimensions: {
          type: 'array',
          description: 'The scored questions for this goal, in display order.',
          minItems: 8,
          maxItems: 8,
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Dimension key.' },
              label: { type: 'string', description: 'Dimension name for display.' },
              question: { type: 'string', description: 'What this dimension asks about the idea.' },
              score: { type: 'integer', minimum: 0, maximum: 100, description: 'Score for this dimension.' },
              weight: { type: 'integer', description: 'Weight of this dimension in the overall score.' },
            },
            required: ['key', 'label', 'question', 'score', 'weight'],
          },
        },
        thresholds: {
          type: 'object',
          description: 'Score ranges for each verdict.',
          properties: {
            kill: { type: 'string', description: 'Score range for KILL, e.g. "<50".' },
            fix: { type: 'string', description: 'Score range for FIX, e.g. "50-64".' },
            ship: { type: 'string', description: 'Score range for SHIP, e.g. "65+".' },
          },
          required: ['kill', 'fix', 'ship'],
        },
        scoring_version: { type: 'integer', description: 'Version of the questions, weights and thresholds used.' },
        latency_ms: { type: 'integer', description: 'Time Jev took to answer, in milliseconds.' },
        judged_by: { type: 'string', description: 'The model that judged the idea.' },
        try_it: { type: 'string', description: 'Link to the Kill My Idea website.' },
      },
      required: [
        'verdict',
        'verdict_label',
        'score',
        'needs_detail',
        'message',
        'goal',
        'category',
        'best_signal',
        'biggest_risk',
        'dimensions',
        'thresholds',
        'scoring_version',
        'latency_ms',
        'judged_by',
        'try_it',
      ],
    },
    annotations: { title: 'Judge a startup idea', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  {
    name: 'get_stats',
    title: 'Kill My Idea stats',
    description: 'How many ideas Kill My Idea has analyzed so far and how many were killed, fixed or shipped. Cached for 5 minutes.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    outputSchema: {
      type: 'object',
      properties: {
        analyzed: {
          type: 'integer',
          description: 'Ideas judged and archived so far. Ideas judged with do_not_archive (or the website privacy opt-out) are not counted.',
        },
        verdicts: {
          type: 'object',
          description: 'How many of the archived ideas got each verdict.',
          properties: {
            KILL: { type: 'integer', description: 'Ideas that got KILL IT.' },
            FIX: { type: 'integer', description: 'Ideas that got FIX IT.' },
            SHIP: { type: 'integer', description: 'Ideas that got SHIP IT.' },
          },
        },
      },
      required: ['analyzed', 'verdicts'],
    },
    annotations: { title: 'Kill My Idea stats', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
]

/** Tool names safe to publish: tools/call can carry any string. */
export const TOOL_NAMES = TOOLS.map((t) => t.name)

type JsonRpcId = string | number | null
type JsonRpcMessage = { jsonrpc?: unknown; id?: JsonRpcId; method?: unknown; params?: Record<string, unknown> }

class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message)
  }
}

const label = (key: string) => DIMENSION_LABELS[key as DimensionKey] ?? key

/** The agent-facing view of an evaluation: no raw Jev response, no debug. */
export function toToolResult(evaluation: Evaluation) {
  const { best, worst } = bestAndWorst(evaluation)
  const signal = (kind: 'strength' | 'risk', d: typeof best) => ({
    dimension: d.key,
    label: d.label,
    score: d.value,
    note: dimensionCopy(kind, d.key),
  })
  const hidden = evaluation.needsDetail
  return {
    verdict: hidden ? null : evaluation.verdict,
    verdict_label: hidden ? null : verdictLabel(evaluation.verdict),
    score: hidden ? null : evaluation.score,
    needs_detail: hidden,
    message: hidden ? LOW_CLARITY_COPY.join(' ') : `${verdictLabel(evaluation.verdict)}. ${evaluation.score}/100.`,
    goal: evaluation.goal,
    category: evaluation.category,
    best_signal: hidden ? null : signal('strength', best),
    biggest_risk: hidden ? null : signal('risk', worst),
    dimensions: Object.entries(evaluation.dimensions).map(([key, score]) => ({
      key,
      label: label(key),
      question: DIMENSION_HINTS[key as DimensionKey] ?? '',
      score,
      weight: WEIGHTS[key as DimensionKey] ?? 1,
    })),
    thresholds: { kill: `<${VERDICT_THRESHOLDS.fix}`, fix: `${VERDICT_THRESHOLDS.fix}-${VERDICT_THRESHOLDS.ship - 1}`, ship: `${VERDICT_THRESHOLDS.ship}+` },
    scoring_version: evaluation.scoringVersion,
    latency_ms: evaluation.latencyMs,
    judged_by: 'Jev by TypeSafe AI (typesafe.ai)',
    try_it: SITE_URL,
  }
}

const BAR_WIDTH = 20
const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']

/** 0-100 → fixed-width Unicode bar with eighth-block precision. */
export function bar(score: number, width = BAR_WIDTH): string {
  const eighths = Math.round((Math.max(0, Math.min(100, score)) / 100) * width * 8)
  const full = Math.floor(eighths / 8)
  const partial = EIGHTHS[eighths % 8]
  return '█'.repeat(full) + partial + '░'.repeat(width - full - (partial ? 1 : 0))
}

/**
 * The text content is a ready-made terminal card: verdict, score bar and one bar per question,
 * in a code block so it stays aligned. Agents are told to show it as returned.
 */
export function toText(result: ReturnType<typeof toToolResult>): string {
  const footer = `Judged by Jev (TypeSafe AI) in ${result.latency_ms}ms · ${result.try_it}`
  if (result.needs_detail) {
    return [
      '```',
      'NEEDS DETAIL · Jev cannot judge this yet',
      '',
      'Say who it is for, what it does and how it makes money or spreads.',
      '```',
      footer,
    ].join('\n')
  }
  const pad = Math.max(...result.dimensions.map((d) => d.label.length))
  const rule = '─'.repeat(pad + BAR_WIDTH + 12)
  const best = result.best_signal!
  const risk = result.biggest_risk!
  const tags = [`${best.label} ${best.score}`, `${risk.label} ${risk.score}`]
  const tag = Math.max(...tags.map((t) => t.length)) + 3
  return [
    '```',
    `${result.verdict_label!.padEnd(9)} ${bar(result.score!)}  ${result.score}/100`,
    `${result.category} · goal: ${GOAL_LABELS[result.goal as keyof typeof GOAL_LABELS] ?? result.goal}`,
    rule,
    ...result.dimensions.map(
      (d) => `${d.label.padEnd(pad)}  ${bar(d.score)}  ${String(d.score).padStart(3)}${d.weight > 1 ? `  ×${d.weight}` : ''}`,
    ),
    rule,
    `+ ${tags[0].padEnd(tag)}${best.note}`,
    `- ${tags[1].padEnd(tag)}${risk.note}`,
    '```',
    footer,
  ].join('\n')
}

async function callTool(name: unknown, args: Record<string, unknown> = {}) {
  if (name === 'judge_idea') {
    const result = await judge({ idea: args.idea, goal: args.goal, doNotArchive: args.do_not_archive, source: 'mcp' })
    if (!result.ok) return { content: [{ type: 'text', text: result.error }], isError: true }
    const structured = toToolResult(result.evaluation)
    return { content: [{ type: 'text', text: toText(structured) }], structuredContent: structured, isError: false }
  }
  if (name === 'get_stats') {
    const { count, verdicts } = evaluationStats()
    const structured = { analyzed: count, verdicts }
    const text = `${count.toLocaleString('en-US')} ideas analyzed: ${verdicts.KILL} killed, ${verdicts.FIX} to fix, ${verdicts.SHIP} shipped.`
    return { content: [{ type: 'text', text }], structuredContent: structured, isError: false }
  }
  throw new RpcError(-32602, `Unknown tool: ${String(name)}`)
}

async function dispatch(message: JsonRpcMessage): Promise<unknown> {
  const params = message.params ?? {}
  switch (message.method) {
    case 'initialize': {
      const requested = params.protocolVersion
      return {
        protocolVersion: PROTOCOL_VERSIONS.includes(requested as string) ? requested : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      }
    }
    case 'ping':
      return {}
    case 'tools/list':
      return { tools: TOOLS }
    case 'tools/call':
      return callTool(params.name, (params.arguments as Record<string, unknown>) ?? {})
    case 'resources/list':
      return { resources: [] }
    case 'prompts/list':
      return { prompts: [] }
    default:
      throw new RpcError(-32601, `Method not found: ${String(message.method)}`)
  }
}

/** Request headers worth keeping for usage analytics. */
type RequestContext = { userAgent?: string; protocolVersion?: string }

type RpcResponse = { jsonrpc: '2.0'; id: JsonRpcId; result?: unknown; error?: { code: number; message: string } }

/** One JSON-RPC message → its response, or null for notifications and client responses. */
async function handle(message: JsonRpcMessage, context: RequestContext = {}): Promise<RpcResponse | null> {
  const started = performance.now()
  const response = await respond(message)
  track(message, response, context, performance.now() - started)
  return response
}

async function respond(message: JsonRpcMessage): Promise<RpcResponse | null> {
  if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') {
    return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } }
  }
  if (message.id === undefined || typeof message.method !== 'string') return null
  try {
    return { jsonrpc: '2.0', id: message.id, result: await dispatch(message) }
  } catch (err) {
    const code = err instanceof RpcError ? err.code : -32603
    if (!(err instanceof RpcError)) console.error('[mcp] failed:', err instanceof Error ? err.name : 'unknown')
    return { jsonrpc: '2.0', id: message.id, error: { code, message: err instanceof RpcError ? err.message : 'Internal error' } }
  }
}

const short = (v: unknown, max = 200) => (typeof v === 'string' ? v.slice(0, max) : undefined)

/** One row per message in mcp_requests. Never stores arguments, so no idea text. */
function track(message: JsonRpcMessage, response: RpcResponse | null, context: RequestContext, latencyMs: number) {
  try {
    const method = typeof message?.method === 'string' ? message.method : 'invalid'
    const params = message?.params ?? {}
    const client = method === 'initialize' ? (params.clientInfo as Record<string, unknown> | undefined) : undefined
    const result = response?.result as { isError?: boolean; content?: { text?: string }[] } | undefined
    const error = response?.error ? String(response.error.code) : result?.isError ? short(result.content?.[0]?.text) : undefined
    logMcpRequest({
      createdAt: new Date().toISOString(),
      method: short(method, 100)!,
      tool: method === 'tools/call' ? short(params.name, 100) : undefined,
      clientName: short(client?.name, 100),
      clientVersion: short(client?.version, 50),
      userAgent: context.userAgent?.slice(0, 200),
      protocolVersion: short(method === 'initialize' ? params.protocolVersion : context.protocolVersion, 20),
      ok: !error,
      error,
      latencyMs,
    })
  } catch (err) {
    // Tracking must never break the server.
    console.error('[mcp] usage log failed:', err instanceof Error ? err.message : 'unknown')
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  })

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400)
  }

  const context: RequestContext = {
    userAgent: request.headers.get('user-agent') ?? undefined,
    protocolVersion: request.headers.get('mcp-protocol-version') ?? undefined,
  }

  // Batches were allowed in 2025-03-26; answering them costs nothing.
  if (Array.isArray(body)) {
    if (body.length === 0) return json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } }, 400)
    const responses = (await Promise.all(body.map((m) => handle(m, context)))).filter((r) => r !== null)
    return responses.length ? json(responses) : new Response(null, { status: 202, headers: CORS })
  }

  const response = await handle(body as JsonRpcMessage, context)
  return response === null ? new Response(null, { status: 202, headers: CORS }) : json(response)
}

/** No server-initiated stream: the spec says answer GET with 405. Browsers get a pointer to the docs. */
export function GET(): Response {
  return new Response(`Kill My Idea MCP server. POST JSON-RPC here. Setup: ${SITE_URL}/mcp/\n`, {
    status: 405,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'POST, OPTIONS', ...CORS },
  })
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Max-Age': '86400' } })
}
