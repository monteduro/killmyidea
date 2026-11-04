import { describe, expect, it } from 'vitest'
import { aiCatalog, PROTOCOL_VERSIONS, SERVER_INFO, serverCard } from './_mcp-meta'
import { GET, OPTIONS } from './mcp-server-card'

describe('MCP Server Card', () => {
  it('is served with the Server Card media type and open CORS', async () => {
    const res = GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/mcp-server-card+json')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Cache-Control')).toMatch(/max-age/)
    expect(await res.json()).toEqual(serverCard())
    expect(OPTIONS().status).toBe(204)
  })

  it('follows the v1 schema and declares this endpoint', () => {
    const card = serverCard()
    expect(card.$schema).toBe('https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json')
    expect(card.name).toMatch(/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/)
    expect(card.name).toBe('biz.killmyidea/killmyidea')
    expect(card.description.length).toBeGreaterThan(0)
    expect(card.description.length).toBeLessThanOrEqual(100)
    expect(card.title.length).toBeLessThanOrEqual(100)
    expect(card.remotes).toEqual([
      { type: 'streamable-http', url: 'https://killmyidea.biz/api/mcp', supportedProtocolVersions: PROTOCOL_VERSIONS },
    ])
  })

  it('agrees with the initialize handshake', () => {
    const card = serverCard()
    expect(card.version).toBe(SERVER_INFO.version)
    expect(card.title).toBe(SERVER_INFO.title)
    expect(card.icons).toEqual(SERVER_INFO.icons)
    expect(card.websiteUrl).toBe(SERVER_INFO.websiteUrl)
  })

  it('is listed in the AI Catalog', () => {
    expect(aiCatalog()).toEqual({
      specVersion: '1.0',
      entries: [
        {
          identifier: 'urn:air:killmyidea.biz:mcp:killmyidea',
          type: 'application/mcp-server-card+json',
          url: 'https://killmyidea.biz/api/mcp/server-card',
        },
      ],
    })
  })
})
