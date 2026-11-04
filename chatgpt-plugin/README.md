# Kill My Idea for ChatGPT

Plugin package for the ChatGPT and Codex plugin directory (Agent Plugins format). It connects
the public Kill My Idea MCP server at `https://killmyidea.biz/api/mcp`. No auth.

Build the upload ZIP with the manifest at its root:

```bash
cd chatgpt-plugin && zip -r ../killmyidea-chatgpt-plugin.zip plugin.json mcp.json assets
```

Upload it at https://platform.openai.com/plugins. The demo video URL goes in the dashboard.
