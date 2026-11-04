# Kill My Idea for Cursor

Adds the [Kill My Idea](https://killmyidea.biz/mcp/) MCP server to Cursor. It judges startup and
side-project ideas with Jev (TypeSafe AI): KILL IT, FIX IT or SHIP IT, a 0-100 score, the best
signal, the biggest risk and eight 0-100 sub-scores.

- Endpoint: `https://killmyidea.biz/api/mcp` (remote, Streamable HTTP)
- Auth: none. No API key, no account.
- Tools: `judge_idea` (judges an idea) and `get_stats` (how many ideas were judged and how they ended)

## Use it

Ask the agent things like:

- "Judge this idea: a Slack bot that turns standups into a weekly changelog for clients."
- "Kill my idea: an open source CLI that lints Dockerfiles for security issues. It's open source, not for money."
- "How many ideas has Kill My Idea judged so far?"

Ideas are archived anonymously for product analytics. Ask the agent to set `do_not_archive` for
confidential ideas and the text is not stored.

## Without the plugin

Add it to `~/.cursor/mcp.json` yourself:

```json
{ "mcpServers": { "killmyidea": { "url": "https://killmyidea.biz/api/mcp" } } }
```

Setup for other clients: https://killmyidea.biz/mcp/
