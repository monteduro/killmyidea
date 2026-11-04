import type { IncomingHttpHeaders } from 'node:http'

/** Headers the handlers read: the MCP server logs user agent and protocol version, and its GET checks Accept. */
export function forwardedHeaders(h: IncomingHttpHeaders): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  for (const name of ['user-agent', 'mcp-protocol-version', 'accept']) {
    const value = h[name]
    if (typeof value === 'string') headers[name] = value
  }
  return headers
}
