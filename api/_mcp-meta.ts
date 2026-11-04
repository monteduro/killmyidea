// MCP server identity, shared by the initialize handshake (api/mcp.ts), the Server Card
// (api/mcp-server-card.ts) and the static discovery files emitted at build time (vite.config.ts).
// Server Card spec: https://github.com/modelcontextprotocol/experimental-ext-server-card
import { REPO_URL, SITE_URL } from '../src/lib/features.js'

/** Newest first. An unknown requested version gets the newest one. */
export const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']

export const SERVER_VERSION = '1.0.0'

const description =
  'Helps an agent judge a startup or side-project idea before anyone builds it: send a plain-words description and get a KILL IT, FIX IT or SHIP IT verdict, a 0-100 score, the best signal, the biggest risk and eight 0-100 sub-scores from Jev (TypeSafe AI). Also reports how many ideas have been judged and how they ended.'

/** The Server Card caps description at 100 characters. */
const shortDescription = 'Judges startup and side-project ideas: KILL IT, FIX IT or SHIP IT, a 0-100 score and 8 sub-scores.'

const icons = (base: string) => [{ src: `${base}/favicon.svg`, mimeType: 'image/svg+xml', sizes: ['any'] }]

/** `serverInfo` of the initialize result (MCP `Implementation`). */
export const SERVER_INFO = {
  name: 'killmyidea',
  title: 'Kill My Idea',
  version: SERVER_VERSION,
  description,
  icons: icons(SITE_URL),
  websiteUrl: `${SITE_URL}/mcp/`,
}

export const SERVER_CARD_TYPE = 'application/mcp-server-card+json'

/** Pass a different base for preview builds; production uses SITE_URL. */
export function serverCard(base = SITE_URL) {
  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
    name: `${new URL(base).hostname.split('.').reverse().join('.')}/killmyidea`,
    version: SERVER_VERSION,
    title: SERVER_INFO.title,
    description: shortDescription,
    websiteUrl: `${base}/mcp/`,
    repository: { url: REPO_URL, source: 'github' },
    icons: icons(base),
    remotes: [{ type: 'streamable-http', url: `${base}/api/mcp`, supportedProtocolVersions: PROTOCOL_VERSIONS }],
  }
}

/** Domain-level discovery: /.well-known/ai-catalog.json points at the hosted card. */
export function aiCatalog(base = SITE_URL) {
  return {
    specVersion: '1.0',
    entries: [
      {
        identifier: `urn:air:${new URL(base).hostname}:mcp:killmyidea`,
        type: SERVER_CARD_TYPE,
        url: `${base}/api/mcp/server-card`,
      },
    ],
  }
}
