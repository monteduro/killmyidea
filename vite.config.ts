/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Serves api/evaluate.ts and api/stats.ts during `npm run dev`, mirroring the Vercel functions.
function localApi(): Plugin {
  return {
    name: 'local-api',
    configureServer(server) {
      const respond = async (res: import('node:http').ServerResponse, response: Response) => {
        res.statusCode = response.status
        response.headers.forEach((v, k) => res.setHeader(k, v))
        res.end(await response.text())
      }
      server.middlewares.use('/api/evaluate', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/evaluate.ts')
          if (req.method !== 'POST') {
            res.statusCode = 405
            return res.end()
          }
          const body = await readBody(req)
          const response: Response = await mod.POST(
            new Request('http://localhost/api/evaluate', { method: 'POST', body, headers: { 'Content-Type': 'application/json' } }),
          )
          await respond(res, response)
        } catch (err) {
          server.ssrFixStacktrace(err as Error)
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(err) }))
        }
      })
      server.middlewares.use('/api/stats', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/stats.ts')
          if (req.method !== 'GET') {
            res.statusCode = 405
            return res.end()
          }
          await respond(res, await mod.GET())
        } catch (err) {
          server.ssrFixStacktrace(err as Error)
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(err) }))
        }
      })
    },
  }
}

// Absolute URLs for OG tags. Set SITE_URL for previews; defaults to production.
function siteUrl(): Plugin {
  return {
    name: 'site-url',
    transformIndexHtml: (html) =>
      html.replaceAll('__SITE_URL__', (process.env.SITE_URL || 'https://killmyidea.stemonte.io').replace(/\/$/, '')),
  }
}

// DataFast cookieless analytics. The website id is public (it ships in the HTML).
// Production builds use it by default; dev only tracks if DATAFAST_WEBSITE_ID is set.
// Set DATAFAST_WEBSITE_ID=off to disable.
const DATAFAST_DEFAULT_ID = 'dfid_UvVlC3fid8kOr95YTMIho'

function datafast(mode: string): Plugin {
  return {
    name: 'datafast',
    transformIndexHtml(html) {
      const env = process.env.DATAFAST_WEBSITE_ID
      const id = env === 'off' ? '' : env || (mode === 'production' ? DATAFAST_DEFAULT_ID : '')
      const domain = process.env.DATAFAST_DOMAIN || 'killmyidea.stemonte.io'
      const snippet = id
        ? `<script>window.datafast=window.datafast||function(){(window.datafast.q=window.datafast.q||[]).push(arguments)};</script>
    <script defer data-website-id="${id}" data-domain="${domain}" src="https://datafa.st/js/script.cookieless.js"></script>`
        : ''
      return html.replace('<!--DATAFAST-->', snippet)
    },
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), tailwindcss(), localApi(), siteUrl(), datafast(mode)],
    server: { host: '127.0.0.1', port: 5317, strictPort: true },
    test: { environment: 'node' },
  }
})
