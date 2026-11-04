// GET /api/mcp/server-card — the MCP Server Card, at the location the spec reserves
// (<streamable-http-url>/server-card). Static, public metadata: identity and how to connect.
import { SERVER_CARD_TYPE, serverCard } from './_mcp-meta.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
  'Access-Control-Expose-Headers': 'ETag',
}

export function GET(): Response {
  return new Response(JSON.stringify(serverCard(), null, 2), {
    headers: { 'Content-Type': SERVER_CARD_TYPE, 'Cache-Control': 'public, max-age=3600', ...CORS },
  })
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Max-Age': '86400' } })
}
