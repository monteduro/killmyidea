# Directory submissions

Ready-to-paste listing copy for the MCP server, plus how to publish where it can be done from
this repo. Facts about data handling come from the code (`api/_analytics-db.ts`, `api/_judge.ts`,
`src/lib/typesafe.ts`); anything the code cannot tell is marked **TODO**.

## Before submitting anywhere

| Missing | Needed by | Notes |
|---|---|---|
| Email routing for `hello@killmyidea.biz` | Claude, ChatGPT, Muse, Cursor | The address is published in `/privacy/` and `/terms/`. Set up Cloudflare Email Routing before submitting. |

Done: privacy policy at `https://killmyidea.biz/privacy/`, terms at `https://killmyidea.biz/terms/`,
support contact `hello@killmyidea.biz`, MIT `LICENSE`. Retention, as the policy states: archived ideas and MCP
request logs are kept while the service runs; any archived idea is deleted on request.

### What the server does with data (for the privacy policy and every data questionnaire)

- **Idea text** (`judge_idea`): sent to TypeSafe AI (`https://api.typesafe.ai/v1/systemone`), whose
  Jev classifier scores it. Kill My Idea uses TypeSafe as its classifier provider; it is not a
  pass-through to a third-party service the user signs in to.
- **Archive**: unless `do_not_archive` is true, the idea text is stored with its scores, verdict,
  category, goal, source (`web` or `mcp`), timestamp, token counts and the classifier's raw answer.
  No IP address, no account, no identity.
- **MCP request log**: one row per JSON-RPC message with method, tool name, client name and version,
  user agent, protocol version, success or error, and latency. No IP, no tool arguments, so no idea text.
- **Public stats**: `get_stats` and `/stats/` show only aggregate counts.
- **Website**: DataFast cookieless analytics.
- **Auth**: none. Nothing is tied to a user.

## Contact email (Cloudflare Email Routing)

Same setup as thedrop.so. In the Cloudflare dashboard, zone `killmyidea.biz` → **Email** →
**Email Routing**:

1. **Get started** / **Enable**: Cloudflare adds the three `route*.mx.cloudflare.net` MX records and
   the SPF record `v=spf1 include:_spf.mx.cloudflare.net ~all`. No MX exists today, so nothing is lost.
2. **Destination addresses**: add the inbox to forward to and confirm the verification email.
3. **Routing rules** → custom address `hello` → action *Send to an email* → that inbox.

Check: `dig +short MX killmyidea.biz` lists the Cloudflare routes, then send a test to
`hello@killmyidea.biz`. Replies go out from the destination inbox, not from `hello@`.

## MCP Registry (official, free)

Files: `server.json` (validated against `2025-12-11/server.schema.json`) and
`public/.well-known/mcp-registry-auth` (Ed25519 public key for the HTTP domain proof). The private
key lives outside the repo at `~/.config/killmyidea/mcp-registry-key.pem`.

After a deploy that serves `https://killmyidea.biz/.well-known/mcp-registry-auth` with a 200 (no redirect):

```bash
brew install mcp-publisher
mcp-publisher validate
PRIVATE_KEY="$(openssl pkey -in ~/.config/killmyidea/mcp-registry-key.pem -noout -text | grep -A3 'priv:' | tail -n +2 | tr -d ' :\n')"
mcp-publisher login http --domain killmyidea.biz --private-key "$PRIVATE_KEY"
mcp-publisher publish
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=biz.killmyidea/killmyidea"
```

Every publish needs a new `version`; published metadata cannot be edited. For a metadata-only
change use a prerelease such as `1.0.0-1`, or bump the server version in `api/_mcp-meta.ts`
(tests keep `server.json` in step).

## Cursor Marketplace

Files: `.cursor-plugin/marketplace.json` (repo root) points at `cursor-plugin/`, which holds
`.cursor-plugin/plugin.json`, `mcp.json`, `assets/logo.svg` and `README.md`. Manifests validated
against Cursor's `plugin.schema.json` and `marketplace.schema.json`.

1. Test locally: copy `cursor-plugin/` to `~/.cursor/plugins/local/killmyidea`, run
   *Developer: Reload Window*, check that `judge_idea` and `get_stats` appear.
2. Submit at https://cursor.com/marketplace/publish:
   - Organization name: `Kill My Idea`
   - Organization handle: `@killmyidea`
   - Contact email: `hello@killmyidea.biz`
   - Logotype URL: `https://killmyidea.biz/favicon.svg` (1:1 SVG with background plate)
   - Description: `Judges startup and side-project ideas: KILL IT, FIX IT or SHIP IT, a 0-100 score and 8 sub-scores.`
   - GitHub repository: `https://github.com/monteduro/killmyidea`
   - Owner: `Stefano Monteduro`
   - Website URL: `https://killmyidea.biz/mcp/`

## Claude Connectors Directory

Submit at https://claude.ai/directory/manage → Submit new → MCP connector (paid plan required).

- **Connection URL**: `https://killmyidea.biz/api/mcp`
- **Authentication**: None
- **Name**: `Kill My Idea`
- **One-liner** (≤200): `Judge a startup or side-project idea before you build it: KILL IT, FIX IT or SHIP IT, with a 0-100 score, the best signal, the biggest risk and eight sub-scores.`
- **Description** (≤2000):

  > Kill My Idea judges startup and side-project ideas with Jev, a classifier from TypeSafe AI.
  > Describe who the idea is for, what it does and how it makes money or spreads, and it returns a
  > verdict (KILL IT, FIX IT or SHIP IT), a 0-100 score, the strongest signal, the biggest risk and
  > eight 0-100 sub-scores: real problem, clear customer, demand, money, reach, differentiation,
  > buildability and shareability. Open-source and just-for-fun ideas are scored on adoption,
  > immediate appeal and fun instead of money.
  >
  > The rubric is deterministic: the same idea gets the same scores, and the result is a set of
  > numbers, not generated advice. Vague ideas are not scored: the tool says so and asks for more
  > detail.
  >
  > A second tool reports how many ideas have been judged and how many were killed, fixed or shipped.
  >
  > Free, no account and no API key. Ideas are archived anonymously (no IP, no identity) for product
  > analytics; confidential ideas can be judged with do_not_archive, which stores nothing.

- **Documentation URL**: `https://killmyidea.biz/mcp/`
- **Privacy policy URL**: `https://killmyidea.biz/privacy/`
- **Support contact**: `hello@killmyidea.biz`
- **Icon**: `public/favicon.svg` (size and format requirements are not documented)
- **Reads or writes**: reads and writes. `judge_idea` stores the idea unless `do_not_archive` is set;
  `get_stats` is read-only.
- **Data handling**: own service. The idea text is processed by TypeSafe AI as Kill My Idea's
  classifier provider (see above).
- **Test & launch**: no credentials needed, the server is public. Run every tool from a custom
  connector in Claude before submitting.
- **Example prompts** (at least 3):
  1. `Kill my idea: a Slack bot that turns daily standups into a weekly changelog for clients. Agencies pay $15 per workspace.`
  2. `Judge this as an open source project: a CLI that lints Dockerfiles for security issues and suggests fixes.`
  3. `Is this worth building just for fun? A browser game where you guess the year of old newspaper front pages.`
  4. `How many ideas has Kill My Idea judged, and how many got killed?`

## ChatGPT (plugins)

Upload at https://platform.openai.com/plugins. Requires individual or business verification, and
the domain proof file at `https://killmyidea.biz/.well-known/openai-apps-challenge` (token given
during submission).

- **displayName** (≤30): `Kill My Idea`
- **shortDescription** (≤30): `Judge startup ideas`
- **longDescription** (≤4000): the Claude description above.
- **developerName** (≤80): `Stefano Monteduro`
- **websiteURL**: `https://killmyidea.biz/mcp/`
- **supportURL**: `mailto:hello@killmyidea.biz` (or `https://killmyidea.biz/terms/#contact` if a URL is required)
- **privacyPolicyURL**: `https://killmyidea.biz/privacy/`
- **termsOfServiceURL**: `https://killmyidea.biz/terms/`
- **logo**: `public/favicon.svg` (square, at least 48×48)
- **mcp.json**: `streamable-http`, URL `https://killmyidea.biz/api/mcp`, `auth.type: none`
- **defaultPrompt** (≤128 each):
  1. `Kill my idea: a Slack bot that turns standups into a weekly changelog for clients.`
  2. `Judge this open source idea: a CLI that lints Dockerfiles for security issues.`
  3. `How many ideas has Kill My Idea judged so far?`
- **Demo video URL**: **TODO** (required)

### Test cases

Positive (5):

| Prompt | Tools | Expected |
|---|---|---|
| `Kill my idea: a Slack bot that turns standups into a weekly changelog for clients. Agencies pay $15 per workspace.` | `judge_idea` | Verdict, score, best signal, biggest risk and eight sub-scores for goal `money`. |
| `Judge this as an open source project: a CLI that lints Dockerfiles for security issues.` | `judge_idea` (`goal: open_source`) | Sub-scores include Adoption instead of Money. |
| `Is this worth building just for fun? A browser game where you guess the year of old newspaper front pages.` | `judge_idea` (`goal: fun`) | Sub-scores include Immediate appeal and Fun. |
| `Judge this, but don't store it, it's confidential: an invoicing tool for freelance translators.` | `judge_idea` (`do_not_archive: true`) | A verdict; the idea is not archived. |
| `How many ideas has Kill My Idea judged, and how many were shipped?` | `get_stats` | Total analyzed and counts per verdict. |

Negative (3):

| Prompt | Expected |
|---|---|
| `Write a business plan for my bakery.` | No tool call: it asks for a plan, not a verdict. |
| `What is the capital of Portugal?` | No tool call. |
| `Judge this idea: an app that helps people with things.` | `judge_idea` returns `needs_detail: true` with no verdict; the assistant asks for more detail. |

## Muse Connector Platform

Submit at https://platform.muse.ai/submission (login and business verification required; the form
fields are not public). Prepare:

- **Overview**: the Claude description above. Value beyond the browser: a deterministic, scored
  rubric over eight dimensions, the same for every idea, rather than free-form advice.
- **Endpoint**: `https://killmyidea.biz/api/mcp`, no auth, no account, plan or region restrictions.
- **Tool classification**: `judge_idea` is Write (stores the idea unless `do_not_archive`);
  `get_stats` is Read. No sensitive writes, no side effects outside Kill My Idea.
- **Data questionnaire**: the data section above. Muse terms ask to keep user data only as long as
  the request needs it and to delete it on request: archiving by default may conflict.
- **Privacy policy**: `https://killmyidea.biz/privacy/`; **terms**: `https://killmyidea.biz/terms/`
- **Support and security contact**: `hello@killmyidea.biz`; **maintainer**: Stefano Monteduro

## Review risks found in the current server

These may be flagged by the reviews above. Not changed yet:

- The server instructions tell the model to show the card "exactly as returned". Claude's review
  rejects descriptions that tell Claude how to behave.
- `latency_ms`, `judged_by` and `try_it` in the result look like the telemetry and promotional data
  that ChatGPT's review calls extraneous.
- Archiving is on by default. Making it opt-in would ease Muse and simplify every data disclosure.
