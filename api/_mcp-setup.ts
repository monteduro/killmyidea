// What GET /api/mcp shows: a landing page for browsers, plain text for everyone else.
// Both come from the same list, so they cannot drift apart.
import { REPO_URL, SITE_URL } from '../src/lib/features.js'
import { SERVER_INFO } from './_mcp-meta.js'

const ENDPOINT = `${SITE_URL}/api/mcp`

const FACTS: [string, string][] = [
  ['Endpoint', ENDPOINT],
  ['Transport', 'Streamable HTTP, stateless: POST one JSON-RPC message, get application/json back. No SSE stream.'],
  ['Auth', 'None. No API key, no account, no OAuth.'],
  ['Tools', 'judge_idea(idea, goal?, do_not_archive?), get_stats()'],
]

/** One per client: a command or config to copy, or steps when there is nothing to copy. */
const CLIENTS: { name: string; code?: string; steps?: string }[] = [
  { name: 'Claude Code', code: `claude mcp add --transport http killmyidea ${ENDPOINT}` },
  { name: 'Codex', code: `codex mcp add killmyidea --url ${ENDPOINT}` },
  { name: 'Cursor (~/.cursor/mcp.json)', code: `{ "mcpServers": { "killmyidea": { "url": "${ENDPOINT}" } } }` },
  { name: 'VS Code (.vscode/mcp.json)', code: `{ "servers": { "killmyidea": { "type": "http", "url": "${ENDPOINT}" } } }` },
  { name: 'Claude Desktop / claude.ai', steps: 'Settings > Connectors > Add custom connector, URL above, no authentication.' },
  { name: 'ChatGPT', steps: 'Settings > Apps > Advanced > Developer mode, create an app with the URL above, no authentication.' },
]

const LINKS: [string, string][] = [
  ['Setup for every client', `${SITE_URL}/mcp/`],
  ['Setup for agents (Markdown)', `${SITE_URL}/mcp.md`],
  ['Server Card', `${SITE_URL}/api/mcp/server-card`],
  ['Source', REPO_URL],
]

const SUMMARY = 'Judges startup and side-project ideas: KILL IT, FIX IT or SHIP IT, a 0-100 score and eight sub-scores.'

export function setupText(): string {
  const width = Math.max(...FACTS.map(([k]) => k.length)) + 2
  return [
    `${SERVER_INFO.title} MCP server`,
    '',
    SUMMARY,
    '',
    ...FACTS.map(([k, v]) => `${`${k}:`.padEnd(width)}${v}`),
    '',
    ...CLIENTS.flatMap((c) => (c.code ? [`${c.name}:`, `  ${c.code}`, ''] : [`${c.name}: ${c.steps}`])),
    '',
    ...LINKS.map(([k, v]) => `${k}: ${v}`),
    '',
  ].join('\n')
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function setupHtml(): string {
  const title = `${SERVER_INFO.title} MCP server`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(SUMMARY)}">
<link rel="canonical" href="${SITE_URL}/mcp/">
<link rel="icon" href="${SITE_URL}/favicon.svg" type="image/svg+xml">
<link rel="alternate" type="text/markdown" href="${SITE_URL}/mcp.md">
<style>
  :root { --ink: #0b0b0b; --paper: #f1efe8; --muted: #5c5a55; --line: #d8d5cc; --kill: #ff3b1f; --code: #e6e3da; color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { :root { --ink: #f1efe8; --paper: #0b0b0b; --muted: #a29f97; --line: #2a2926; --code: #1a1917; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.55 'Inter Tight', ui-sans-serif, system-ui, sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 48px 16px 64px; }
  h1 { font-size: 32px; line-height: 1.15; margin: 0 0 8px; letter-spacing: -0.02em; }
  h1 span { color: var(--kill); }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 40px 0 12px; }
  p { margin: 0 0 12px; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 0; }
  dt { color: var(--muted); }
  dd { margin: 0; overflow-wrap: anywhere; }
  code, pre { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; }
  pre { background: var(--code); padding: 12px 14px; margin: 4px 0 16px; overflow-x: auto; white-space: pre; }
  h3 { font-size: 16px; margin: 20px 0 4px; }
  a { color: inherit; text-decoration-color: var(--kill); text-underline-offset: 3px; }
  ul { padding-left: 20px; margin: 0; }
  footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--line); color: var(--muted); font-size: 14px; }
</style>
</head>
<body>
<main>
<h1><span>✕</span> ${esc(title)}</h1>
<p>${esc(SUMMARY)}</p>
<p>This URL is the MCP endpoint: add it to your client, don't browse it. Free and public.</p>

<h2>Connection</h2>
<dl>
${FACTS.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${k === 'Endpoint' || k === 'Tools' ? `<code>${esc(v)}</code>` : esc(v)}</dd>`).join('\n')}
</dl>

<h2>Add it to your client</h2>
${CLIENTS.map((c) => `<h3>${esc(c.name)}</h3>\n${c.code ? `<pre><code>${esc(c.code)}</code></pre>` : `<p>${esc(c.steps!)}</p>`}`).join('\n')}

<h2>More</h2>
<ul>
${LINKS.map(([k, v]) => `<li>${esc(k)}: <a href="${esc(v)}">${esc(v.replace(/^https:\/\//, ''))}</a></li>`).join('\n')}
</ul>

<footer>Judged by Jev (TypeSafe AI). <a href="${SITE_URL}/">Try it on the web</a>.</footer>
</main>
</body>
</html>
`
}
