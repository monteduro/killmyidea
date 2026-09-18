// Production server for non-Vercel hosts (e.g. Laravel Forge).
// Only handles /api/evaluate and /api/stats; nginx serves dist/ statically and proxies /api/ here.
import { createServer } from 'node:http'
import { POST } from './api/evaluate.js'
import { GET } from './api/stats.js'

const port = Number(process.env.PORT || 3001)

const send = async (res: import('node:http').ServerResponse, response: Response) => {
  res.statusCode = response.status
  response.headers.forEach((v, k) => res.setHeader(k, v))
  res.end(await response.text())
}

createServer(async (req, res) => {
  const path = req.url?.split('?')[0]
  try {
    if (path === '/api/stats' && req.method === 'GET') return await send(res, await GET())
    if (path !== '/api/evaluate' || req.method !== 'POST') {
      res.statusCode = path === '/api/evaluate' || path === '/api/stats' ? 405 : 404
      return res.end()
    }
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const response = await POST(
      new Request('http://localhost/api/evaluate', {
        method: 'POST',
        body: Buffer.concat(chunks).toString(),
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await send(res, response)
  } catch (err) {
    console.error('[server] failed:', err instanceof Error ? err.name : 'unknown')
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Internal error.' }))
  }
}).listen(port, '127.0.0.1', () => console.log(`API listening on 127.0.0.1:${port}`))
