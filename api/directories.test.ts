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

describe('ChatGPT plugin', () => {
  const plugin = read('chatgpt-plugin/plugin.json')
  const mcp = read('chatgpt-plugin/mcp.json')
  const openai = plugin.extensions['com.openai']

  it('describes the same server', () => {
    expect(plugin.name).toBe(SERVER_INFO.name)
    expect(plugin.version).toBe(SERVER_INFO.version)
    expect(plugin.description).toBe(SHORT_DESCRIPTION)
    expect(plugin.homepage).toBe(SERVER_INFO.websiteUrl)
    expect(plugin.license).toBe('MIT')
    expect(openai.interface.displayName).toBe(SERVER_INFO.title)
    expect(mcp.mcpServers).toEqual({ [SERVER_INFO.name]: { type: 'streamable-http', url: card.remotes[0].url } })
  })

  it('stays within the listing limits', () => {
    const ui = openai.interface
    expect(ui.displayName.length).toBeLessThanOrEqual(30)
    expect(ui.shortDescription.length).toBeLessThanOrEqual(30)
    expect(ui.longDescription.length).toBeLessThanOrEqual(4000)
    expect(ui.defaultPrompt.length).toBeLessThanOrEqual(3)
    for (const prompt of ui.defaultPrompt) expect(prompt.length).toBeLessThanOrEqual(128)
    for (const key of ['websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL']) expect(ui[key]).toMatch(/^https:\/\//)
  })

  it('has the review test cases and only real tools', () => {
    const { positive, negative } = openai.review.test_cases
    expect(positive).toHaveLength(5)
    expect(negative).toHaveLength(3)
    const tools = new Set(['judge_idea', 'get_stats'])
    for (const t of positive) {
      expect(t.expected_behavior).toBeTruthy()
      for (const name of t.tools_triggered.split(',')) expect(tools.has(name.trim())).toBe(true)
    }
  })

  it('ships its logo', () => {
    expect(readFileSync(resolve(import.meta.dirname, '../chatgpt-plugin', openai.interface.logo), 'utf8')).toMatch(/^<svg[^>]*viewBox="0 0 64 64"/)
  })
})
