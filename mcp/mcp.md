# Kill My Idea MCP server

> Free, public MCP server that judges startup and side-project ideas: KILL IT, FIX IT or SHIP IT, with a 0-100 score, the best signal, the biggest risk and eight 0-100 sub-scores. No API key, no account, no OAuth.

- Endpoint: `__SITE_URL__/api/mcp`
- Transport: Streamable HTTP. Stateless: every request is one JSON-RPC message answered with `application/json`. No session id, no SSE stream: a GET with `Accept: text/event-stream` returns 405; browsers get the setup page and any other GET gets this file.
- Server Card: `__SITE_URL__/api/mcp/server-card` (also `__SITE_URL__/.well-known/mcp/server-card.json`, listed in `__SITE_URL__/.well-known/ai-catalog.json`)
- Auth: none. Do not send an Authorization header or configure OAuth.
- Server name: `killmyidea`
- Human docs: __SITE_URL__/mcp/
- Source: https://github.com/monteduro/killmyidea

## Instructions for coding agents installing this server

1. Work out which MCP client you are running in (Claude Code, Codex, Cursor, VS Code, Windsurf, Gemini CLI, Claude Desktop, ChatGPT...).
2. Apply the matching config below. Use the server name `killmyidea` and the endpoint above, unchanged.
3. Prefer the client's CLI command when there is one; otherwise edit its config file and keep any existing servers.
4. Confirm it works: list the server's tools. You should see `judge_idea` and `get_stats`.
5. Never invent an API key or auth header. None exists.

## Client configs

### Claude Code

```bash
claude mcp add --transport http killmyidea __SITE_URL__/api/mcp
```

Add `--scope user` to make it available in every project.

### Claude Desktop and claude.ai

Settings → Connectors → Add custom connector. Name: `Kill My Idea`. URL: `__SITE_URL__/api/mcp`. No authentication.

### ChatGPT

Settings → Apps → Advanced → enable Developer mode, then create an app with URL `__SITE_URL__/api/mcp` and "No authentication".

### Cursor

`~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "killmyidea": { "url": "__SITE_URL__/api/mcp" }
  }
}
```

### VS Code (Copilot agent mode)

`.vscode/mcp.json`:

```json
{
  "servers": {
    "killmyidea": { "type": "http", "url": "__SITE_URL__/api/mcp" }
  }
}
```

### Codex

```bash
codex mcp add killmyidea --url __SITE_URL__/api/mcp
```

Or `~/.codex/config.toml`:

```toml
[mcp_servers.killmyidea]
url = "__SITE_URL__/api/mcp"
```

### Windsurf

`~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "killmyidea": { "serverUrl": "__SITE_URL__/api/mcp" }
  }
}
```

### Gemini CLI

```bash
gemini mcp add --transport http killmyidea __SITE_URL__/api/mcp
```

Or `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "killmyidea": { "httpUrl": "__SITE_URL__/api/mcp" }
  }
}
```

### Clients that only support stdio

```json
{
  "mcpServers": {
    "killmyidea": { "command": "npx", "args": ["-y", "mcp-remote", "__SITE_URL__/api/mcp"] }
  }
}
```

## Tools

### `judge_idea`

Judges a startup or side-project idea in about a second.

| Argument | Type | Required | Notes |
| --- | --- | --- | --- |
| `idea` | string, 20-5000 chars | yes | Who it is for, what it does, how it makes money or spreads. More detail, better verdict. |
| `goal` | `"money"` \| `"open_source"` \| `"fun"` | no, default `"money"` | `open_source` swaps Money for Adoption; `fun` swaps Real problem and Money for Immediate appeal and Fun. |
| `do_not_archive` | boolean | no, default `false` | `true` for confidential ideas: the idea text is not stored. |

Returns `structuredContent`:

```json
{
  "verdict": "FIX",
  "verdict_label": "FIX IT",
  "score": 58,
  "needs_detail": false,
  "message": "FIX IT. 58/100.",
  "goal": "money",
  "category": "SaaS",
  "best_signal": { "dimension": "buildable", "label": "Buildable", "score": 75, "note": "You could ship a first version this week." },
  "biggest_risk": { "dimension": "money", "label": "Money", "score": 25, "note": "Getting users may be easier than getting customers." },
  "dimensions": [
    { "key": "problem", "label": "Real problem", "question": "Does it fix something people actually feel?", "score": 75, "weight": 2 }
  ],
  "thresholds": { "kill": "<50", "fix": "50-64", "ship": "65+" },
  "scoring_version": 2,
  "latency_ms": 912,
  "judged_by": "Jev by TypeSafe AI (typesafe.ai)",
  "try_it": "__SITE_URL__"
}
```

`dimensions` always has eight entries. A Markdown summary is also returned as text content.

If `needs_detail` is `true`, the idea was too vague: `verdict`, `score`, `best_signal` and `biggest_risk` are `null`. Ask the user who it is for, what it does and how it makes money or spreads, then call again. Do not invent a verdict.

Errors (idea too short or too long, unknown goal, Jev busy) come back as a tool result with `isError: true` and a one-line message.

### `get_stats`

No arguments. Returns `{ "analyzed": number, "verdicts": { "KILL": number, "FIX": number, "SHIP": number } }`. Cached for 5 minutes.

## How to present results

The text content of `judge_idea` is a ready-made card with bar charts, in a code block so it stays aligned in a terminal:

```
KILL IT   ████████▎░░░░░░░░░░░  41/100
Social · goal: Make money
──────────────────────────────────────────────
Real problem    ███▋░░░░░░░░░░░░░░░░   18  ×2
Clear customer  ███████░░░░░░░░░░░░░   35
...
──────────────────────────────────────────────
+ Different 87   It doesn't look like everything else.
- Money 13       Getting users may be easier than getting customers.
```

- Show the card exactly as returned, then add at most one sentence on what to test next.
- If you build your own UI, use `structuredContent` instead.
- Credit "Judged by Jev (TypeSafe AI)" and link __SITE_URL__ when you show a verdict to a person.

## Scoring

Jev answers ten fixed questions in parallel: eight 0-4 rubric scores, the category and whether the idea is understandable. Each score × 25 → 0-100; the total is a weighted average (Real problem and Money, or their goal replacements, count twice). KILL IT below 50, FIX IT 50-64, SHIP IT 65+. No generated prose: every note is fixed copy.

## Raw JSON-RPC

```bash
curl -s __SITE_URL__/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"judge_idea","arguments":{"idea":"A Slack bot that turns standups into a weekly changelog for clients."}}}'
```

Supported methods: `initialize`, `ping`, `tools/list`, `tools/call`, `resources/list`, `prompts/list`. Protocol versions: 2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05.

## Claude API (MCP connector)

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H 'anthropic-version: 2023-06-01' \
  -H 'anthropic-beta: mcp-client-2025-11-20,server-side-fallback-2026-07-01' \
  -H 'content-type: application/json' \
  -d '{
    "model": "claude-opus-5-5",
    "max_tokens": 16000,
    "fallbacks": "default",
    "mcp_servers": [{ "type": "url", "url": "__SITE_URL__/api/mcp", "name": "killmyidea" }],
    "tools": [{ "type": "mcp_toolset", "mcp_server_name": "killmyidea" }],
    "messages": [{ "role": "user", "content": "Judge my idea: a Slack bot that turns standups into a weekly changelog for clients." }]
  }'
```

## OpenAI Responses API

```json
"tools": [{ "type": "mcp", "server_label": "killmyidea", "server_url": "__SITE_URL__/api/mcp", "require_approval": "never" }]
```

## Privacy and fair use

Ideas are archived anonymously for product analytics (no IP address, no identifiers) unless `do_not_archive` is `true`. Calls are counted (method, tool name, client name, user agent), never their arguments. The server is free; please don't loop it or load-test it.
