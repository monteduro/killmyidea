// The listing files are static JSON for the MCP Registry and the Cursor Marketplace:
// keep them in step with the server's own identity in _mcp-meta.ts.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SHORT_DESCRIPTION, serverCard, SERVER_INFO } from './_mcp-meta'

const read = (path: string) => JSON.parse(readFileSync(resolve(import.meta.dirname, '..', path), 'utf8'))
const card = serverCard()

describe('MCP Registry server.json', () => {
  const server = read('server.json')

  it('matches the Server Card', () => {
    expect(server.name).toBe(card.name)
    expect(server.title).toBe(card.title)
    expect(server.description).toBe(SHORT_DESCRIPTION)
    expect(server.version).toBe(card.version)
    expect(server.websiteUrl).toBe(card.websiteUrl)
    expect(server.repository).toEqual(card.repository)
    expect(server.icons).toEqual(card.icons)
    expect(server.remotes).toEqual(card.remotes.map(({ type, url }) => ({ type, url })))
  })

  it('stays within the registry limits', () => {
    expect(server.$schema).toBe('https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json')
    expect(server.description.length).toBeLessThanOrEqual(100)
    expect(server.name).toMatch(/^biz\.killmyidea\/[a-zA-Z0-9._-]+$/)
  })
})

describe('Cursor plugin', () => {
  const marketplace = read('.cursor-plugin/marketplace.json')
  const plugin = read('cursor-plugin/.cursor-plugin/plugin.json')
  const mcp = read('cursor-plugin/mcp.json')

  it('is indexed by the repo marketplace', () => {
    expect(marketplace.plugins).toEqual([{ name: plugin.name, source: './cursor-plugin', description: SHORT_DESCRIPTION }])
  })

  it('describes the same server', () => {
    expect(plugin.displayName).toBe(SERVER_INFO.title)
    expect(plugin.version).toBe(SERVER_INFO.version)
    expect(plugin.description).toBe(SHORT_DESCRIPTION)
    expect(plugin.homepage).toBe(SERVER_INFO.websiteUrl)
    expect(plugin.license).toBe('MIT')
    expect(readFileSync(resolve(import.meta.dirname, '../LICENSE'), 'utf8')).toMatch(/^MIT License/)
    expect(mcp).toEqual({ mcpServers: { [SERVER_INFO.name]: { type: 'http', url: card.remotes[0].url } } })
  })

  it('ships its logo', () => {
    expect(readFileSync(resolve(import.meta.dirname, '../cursor-plugin', plugin.logo), 'utf8')).toMatch(/^<svg/)
  })
})
