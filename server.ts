// Production server for non-Vercel hosts (e.g. Laravel Forge).
// Only handles /api/evaluate; nginx serves dist/ statically and proxies /api/ here.
import { createServer } from 'node:http'
import { POST } from './api/evaluate.js'

const port = Number(process.env.PORT || 3001)

createServer(async (req, res) => {
  if (req.url?.split('?')[0] !== '/api/evaluate') {
    res.statusCode = 404
    return res.end()
  }
  if (req.method !== 'POST') {
    res.statusCode = 405
    return res.end()
  }
  try {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const response = await POST(
      new Request('http://localhost/api/evaluate', {
        method: 'POST',
        body: Buffer.concat(chunks).toString(),
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    res.statusCode = response.status
    response.headers.forEach((v, k) => res.setHeader(k, v))
    res.end(await response.text())
  } catch (err) {
    console.error('[server] failed:', err instanceof Error ? err.name : 'unknown')
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Internal error.' }))
  }
}).listen(port, '127.0.0.1', () => console.log(`API listening on 127.0.0.1:${port}`))
