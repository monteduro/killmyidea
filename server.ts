// Production server for non-Vercel hosts (e.g. Laravel Forge).
// Only handles /api/*; nginx serves dist/ statically and proxies /api/ here.
import { createServer } from 'node:http'
import { forwardedHeaders } from './api/_headers.js'
import * as evaluate from './api/evaluate.js'
import * as mcp from './api/mcp.js'
import * as serverCard from './api/mcp-server-card.js'
import * as stats from './api/stats.js'
import * as usage from './api/usage.js'

const port = Number(process.env.PORT || 3001)

type Handler = (request: Request) => Response | Promise<Response>
const routes: Record<string, Partial<Record<string, Handler>>> = {
  '/api/evaluate': { POST: evaluate.POST },
  '/api/stats': { GET: stats.GET },
  '/api/usage': { GET: usage.GET },
  '/api/mcp': { POST: mcp.POST, GET: mcp.GET, OPTIONS: mcp.OPTIONS },
  '/api/mcp/server-card': { GET: serverCard.GET, OPTIONS: serverCard.OPTIONS },
}

const send = async (res: import('node:http').ServerResponse, response: Response) => {
  res.statusCode = response.status
  response.headers.forEach((v, k) => res.setHeader(k, v))
  res.end(await response.text())
}

createServer(async (req, res) => {
  const path = req.url?.split('?')[0] ?? ''
  const route = routes[path]
  const handler = route?.[req.method ?? '']
  if (!handler) {
    res.statusCode = route ? 405 : 404
    return res.end()
  }
  try {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS'
    const response = await handler(
      new Request(`http://localhost${path}`, {
        method: req.method,
        body: hasBody ? Buffer.concat(chunks).toString() : undefined,
        headers: forwardedHeaders(req.headers),
      }),
    )
    await send(res, response)
  } catch (err) {
    console.error('[server] failed:', err instanceof Error ? err.name : 'unknown')
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Internal error.' }))
  }
}).listen(port, '127.0.0.1', () => console.log(`API listening on 127.0.0.1:${port}`))
