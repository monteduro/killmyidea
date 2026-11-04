/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import type { IncomingMessage } from 'node:http'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { forwardedHeaders } from './api/_headers'
import { aiCatalog, serverCard } from './api/_mcp-meta'

// Serves api/*.ts during `npm run dev`, mirroring the production server (server.ts).
const API_ROUTES: Record<string, { module: string; methods: string[] }> = {
  '/api/evaluate': { module: '/api/evaluate.ts', methods: ['POST'] },
  '/api/stats': { module: '/api/stats.ts', methods: ['GET'] },
  '/api/usage': { module: '/api/usage.ts', methods: ['GET'] },
  '/api/mcp': { module: '/api/mcp.ts', methods: ['POST', 'GET', 'OPTIONS'] },
  '/api/mcp/server-card': { module: '/api/mcp-server-card.ts', methods: ['GET', 'OPTIONS'] },
}

function localApi(): Plugin {
  return {
    name: 'local-api',
    configureServer(server) {
      for (const [path, { module, methods }] of Object.entries(API_ROUTES)) {
        server.middlewares.use(path, async (req, res, next) => {
          // `use` also matches sub-paths such as /api/mcp/x.
          if (req.url !== '/' && !req.url?.startsWith('/?')) return next()
          try {
            const method = req.method ?? 'GET'
            if (!methods.includes(method)) {
              res.statusCode = 405
              return res.end()
            }
            const mod = await server.ssrLoadModule(module)
            const body = method === 'POST' ? await readBody(req) : undefined
            const response: Response = await mod[method](
              new Request(`http://localhost${path}`, { method, body, headers: forwardedHeaders(req.headers) }),
            )
            res.statusCode = response.status
            response.headers.forEach((v, k) => res.setHeader(k, v))
            res.end(await response.text())
          } catch (err) {
            server.ssrFixStacktrace(err as Error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: String(err) }))
          }
        })
      }
    },
  }
}

// Absolute URLs for canonical/OG tags, robots.txt, sitemap.xml and the agent docs
// (/mcp.md from mcp/mcp.md, /llms.txt) and the MCP discovery files under /.well-known/.
// Set SITE_URL for previews; defaults to production.
function siteUrl(): Plugin {
  const base = () => (process.env.SITE_URL || 'https://killmyidea.biz').replace(/\/$/, '')
  const withBase = (text: string) => text.replaceAll('__SITE_URL__', base())
  const agentDocs = (): Record<string, string> => ({
    'mcp.md': withBase(readFileSync(resolve(import.meta.dirname, 'mcp/mcp.md'), 'utf8')),
    'llms.txt': `# Kill My Idea

> Describe a startup idea; Jev (TypeSafe AI) decides: KILL IT, FIX IT or SHIP IT, with a 0-100 score. Also a free, public MCP server for AI agents (no API key).

## Docs

- [MCP server setup and tools](${base()}/mcp.md): endpoint, per-client config, tool schemas, output format
- [MCP server (HTML)](${base()}/mcp/): the same, for humans
- [Source code](https://github.com/monteduro/killmyidea)
- [Privacy policy](${base()}/privacy/) and [terms of service](${base()}/terms/)

## MCP

- Endpoint: ${base()}/api/mcp (Streamable HTTP, stateless, no auth)
- Tools: judge_idea(idea, goal?, do_not_archive?), get_stats()
`,
    // Domain-level discovery. The canonical card is served by the API at /api/mcp/server-card.
    '.well-known/ai-catalog.json': `${JSON.stringify(aiCatalog(base()), null, 2)}\n`,
    '.well-known/mcp/server-card.json': `${JSON.stringify(serverCard(base()), null, 2)}\n`,
  })
  return {
    name: 'site-url',
    transformIndexHtml: (html) => withBase(html),
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const doc = agentDocs()[req.url?.split('?')[0].slice(1) ?? '']
        if (doc === undefined) return next()
        const path = req.url?.split('?')[0] ?? ''
        const type = path.endsWith('.md') ? 'text/markdown' : path.endsWith('.json') ? 'application/json' : 'text/plain'
        res.setHeader('Content-Type', `${type}; charset=utf-8`)
        res.end(doc)
      })
    },
    generateBundle() {
      if (this.environment.name !== 'client') return
      for (const [fileName, source] of Object.entries(agentDocs())) this.emitFile({ type: 'asset', fileName, source })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${base()}/sitemap.xml\n` })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${base()}/</loc></url>
  <url><loc>${base()}/mcp/</loc></url>
  <url><loc>${base()}/stats/</loc></url>
  <url><loc>${base()}/privacy/</loc></url>
  <url><loc>${base()}/terms/</loc></url>
</urlset>
`,
      })
    },
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
      const domain = process.env.DATAFAST_DOMAIN || 'killmyidea.biz'
      // Keeps counting visits on the old domain during the move to killmyidea.biz.
      const allowed = process.env.DATAFAST_ALLOWED_HOSTNAMES ?? 'killmyidea.stemonte.io'
      const snippet = id
        ? `<script>window.datafast=window.datafast||function(){(window.datafast.q=window.datafast.q||[]).push(arguments)};</script>
    <script defer data-website-id="${id}" data-domain="${domain}"${allowed ? ` data-allowed-hostnames="${allowed}"` : ''} src="https://datafa.st/js/script.cookieless.js"></script>`
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
    // Static pages next to the SPA: MCP docs, usage numbers, privacy and terms.
    build: { rollupOptions: { input: { main: resolve(import.meta.dirname, 'index.html'), mcp: resolve(import.meta.dirname, 'mcp/index.html'), stats: resolve(import.meta.dirname, 'stats/index.html'), privacy: resolve(import.meta.dirname, 'privacy/index.html'), terms: resolve(import.meta.dirname, 'terms/index.html') } } },
    test: { environment: 'node' },
  }
})
