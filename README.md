# Kill My Idea

Describe a startup idea. Jev decides: **KILL IT**, **FIX IT** or **SHIP IT**.

No generative LLM. One request asks [TypeSafe](https://typesafe.ai) Jev 10
questions in parallel: 8 plain indie-hacker questions scored 0–4, plus the
category and whether the idea is understandable.

```
idea → Jev (8 scores) → each × 25 → weighted average → clarity gate → KILL / FIX / SHIP
```

## 1. Install

```bash
npm install
```

## 2. Environment

```bash
cp .env.example .env
```

```
TYPESAFE_API_KEY=your_key
```

The key is only read by `api/evaluate.ts` and never reaches the browser.

Successful evaluations are archived in SQLite at `data/analytics.sqlite` by
default. Set `ANALYTICS_DB_PATH` to an absolute path on a persistent disk in
production. Users can opt out per request with the checkbox below private history.

`SITE_URL` (optional) sets the absolute URL used in the canonical and OG/Twitter
tags, `robots.txt`, `sitemap.xml`, `/mcp.md` and `llms.txt` (generated at build time).
It defaults to `https://killmyidea.biz`. The image itself is `public/og.png` (1200×630).

For UI work without a key, set `TYPESAFE_MOCK=1`. The API then returns
deterministic fake answers labelled `MOCK DATA` in the raw-data panel. Mock mode is
ignored in production.

## 3. Run locally

```bash
npm run dev          # http://127.0.0.1:5317 (serves /api/* and /mcp/ too)
npm test             # unit tests
npm run benchmark    # balanced scoring benchmark; requires the app to be running
```

Every result has a collapsed "How Jev decided" panel with raw Jev answers, probabilities, confidence,
the average, the verdict, latency and token usage. `?debug=1` opens it by default.

## 4. Build

```bash
npm run build        # typecheck + static build in dist/
```

## 5. Deploy (Laravel Forge)

The site runs on Forge as a Node server: `npm run build` for the static
assets in `dist/`, then `npm run build:server && npm start` to serve the API
endpoints. Set `TYPESAFE_API_KEY` in the site's environment file.

SQLite needs a persistent local disk, which the Forge server provides
directly (`data/analytics.sqlite`); set `ANALYTICS_DB_PATH` to an absolute
path on that disk in production.

Because the SPA is served with an nginx fallback (`try_files ... /index.html`),
every unknown path returns the index page with HTTP 200. Bots probing random
URLs therefore show up as pageviews in DataFast. To stop that, change the
fallback in the site's nginx configuration (Forge → site → Edit Nginx
Configuration) to return 404 for unknown paths if the app has no real routes:

```nginx
location / {
    try_files $uri $uri/ =404;
}
```

### Domain move (killmyidea.stemonte.io → killmyidea.biz)

Both domains belong to the same Forge site. The old one answers every request
with a 301 to the same path and query on `killmyidea.biz`, via
`deploy/nginx-old-domain-redirect.conf`, pasted into the site's nginx
configuration inside the `server` block. Keep that redirect for at least a year.

Idea history lives in `localStorage`, which is per origin. The 301 adds
`#moved`; the inline script in `index.html` then makes one hop to
`public/history-transfer.html` on the old domain, which returns with its
history in the URL fragment (never sent to a server) to be merged. It runs
at most once per browser. Remove both once the old domain is retired.

## MCP server

`api/mcp.ts` is a free, public MCP server at `/api/mcp` (Streamable HTTP, no auth).
It is stateless: every POST is one JSON-RPC message answered with plain JSON, there
are no sessions and GET returns 405. Tools:

- `judge_idea(idea, goal?, do_not_archive?)`: same pipeline as `/api/evaluate`
  (`api/_judge.ts`), returns the verdict, score, best signal, biggest risk and the
  eight sub-scores, without the raw Jev response
- `get_stats()`: analyzed count and verdict split

MCP evaluations are archived like web ones, with `source = 'mcp'`.

Usage is tracked in the `mcp_requests` table: one row per JSON-RPC message with the
method, tool name, client name and version (sent with `initialize`), user agent,
protocol version, success or error, and latency. It never stores tool arguments or
IP addresses. Summary for the last 7 days (or `-- 30` for 30):

```bash
npm run mcp:usage
```

That report includes user agents and error messages, so it stays private. The public
`/stats/` page (`stats/index.html` + `src/stats-page.tsx`, linked in the footer) reads
`GET /api/usage` (`api/usage.ts`, cached 5 minutes): ideas analyzed on the web and via
MCP, a 30-day daily chart, tool calls, clients and verdicts. Client and tool names come
from callers, so only known ones are published (`clientLabel`), everything else is "Other".

Docs: `mcp/index.html` is the static SEO page at `/mcp/` (a second Vite entry);
`mcp/mcp.md` is served as `/mcp.md` for agents and `llms.txt` is generated in
`vite.config.ts`. Both are emitted at build time and served by the dev server.

```bash
claude mcp add --transport http killmyidea https://killmyidea.biz/api/mcp
```

nginx already proxies `/api/` to the Node server, so no extra config is needed.

## 6. Scoring

`src/lib/scoring.ts` and `src/lib/verdict.ts`. That's all there is:

- each question: Jev score 0–4 × 25 → 0–100
- **score = weighted average of the 8 questions** (`WEIGHTS`)
- **Make money** weights Real problem and Money twice; **Open source** replaces Money with
  Adoption; **Just for fun** replaces Real problem and Money with Immediate appeal and Fun.
  The two goal-defining questions always count twice. The API takes `goal`
  (`money` default, `open_source`, `fun`).
- **KILL** below 50 · **FIX** 50–64 · **SHIP** 65+ (`VERDICT_THRESHOLDS`)
- if understandability is below 0.3, the raw scores are retained for analysis but the UI
  asks for more detail instead of presenting a score or verdict
- `SCORING_VERSION` identifies the exact questions, weights, thresholds and gating semantics

BEST SIGNAL / BIGGEST RISK are the highest / lowest question, with fixed copy in
`src/lib/copy.ts`.

## 7. Jev questions

`src/lib/questions.ts`: Real problem, Clear customer, Demand, Money, Reach,
Different, Buildable, Shareable, plus Adoption, Immediate appeal and Fun for goal-specific scoring. Each has five levels written as concrete situations
(Jev judges each level on its own). The HTTP client is `src/lib/typesafe.ts`.

## Layout

```
api/evaluate.ts           API endpoint for the website
api/mcp.ts                MCP server (JSON-RPC over POST /api/mcp)
api/_judge.ts             shared pipeline (validate → Jev → score → archive)
api/stats.ts              API endpoint (ideas submitted + verdict split, 5-min cache)
api/usage.ts              public usage numbers for /stats/ (5-min cache)
api/_analytics-db.ts      SQLite archive for evaluation requests and scores
api/_mock.ts              local-only fake answers
src/lib/questions.ts      Jev questions
src/lib/scoring.ts        0-4 → 0-100, average
src/lib/verdict.ts        KILL / FIX / SHIP thresholds
src/lib/copy.ts           fixed copy per question
src/lib/storage.ts        history (IdeaStore interface, localStorage implementation)
src/lib/share.ts          share text and X intent URL
src/lib/features.ts       public site and repository URLs
src/components/           UI
mcp/index.html            /mcp/ docs page (SEO)
mcp/mcp.md                /mcp.md docs for agents
stats/index.html          /stats/ public usage page
benchmarks/cases.json     balanced, synthetic benchmark cases
scripts/run-scoring-benchmark.mjs  benchmark runner and summary
```

## Analytics (DataFast, cookieless)

Production builds load DataFast's cookieless script (`script.cookieless.js`) with
the site id `dfid_UvVlC3fid8kOr95YTMIho` (`vite.config.ts`). Dev builds only track
when `DATAFAST_WEBSITE_ID` is set; `DATAFAST_WEBSITE_ID=off` disables tracking.
`DATAFAST_DOMAIN` defaults to `killmyidea.biz`; `DATAFAST_ALLOWED_HOSTNAMES` defaults to
`killmyidea.stemonte.io` so the old domain still counts during the move. In DataFast, enable **Settings → General → Cookieless / privacy mode**
so the dashboard matches the script.

There is one custom goal (`src/lib/analytics.ts`): `idea_submitted`, with
`length`, `saved`, and `archived` params. The idea text is never sent to DataFast.

## Evaluation archive (SQLite)

Unless the user checks the opt-out, each successful evaluation creates one row
in the `evaluations` table. It includes the idea, where it came from (`source`: `web` or `mcp`), scoring version, total score,
raw verdict, clarity-gate status, category, all eight dimension scores, understandability, latency, model, token usage and
the complete diagnostic response JSON. It deliberately excludes IP addresses,
cookies and browser identifiers.

For example:

```bash
sqlite3 data/analytics.sqlite \
  'SELECT scoring_version, goal, COUNT(*), ROUND(AVG(score), 1) FROM evaluations GROUP BY scoring_version, goal;'
```

Rows collected before scoring v2 are migrated without being reinterpreted: they remain
`scoring_version = 1`, while v2 stores the new `appeal` score for fun ideas. To export:

```bash
sqlite3 -header -csv data/analytics.sqlite 'SELECT * FROM evaluations;' > evaluations.csv
```

## Scoring benchmark

`benchmarks/cases.json` contains two similarly detailed, synthetic ideas for each category.
The runner evaluates every case against all three goals and always sends `doNotArchive: true`.
With the app running against Jev:

```bash
BENCHMARK_RUNS=3 npm run benchmark
```

It reports score and verdict distributions by goal, category accuracy, clarity gates and
repeat-score range. The full JSON is written to the ignored
`benchmarks/results/latest.json`; set `BENCHMARK_URL` to test a deployed instance.

`.mcp.json` registers the official DataFast MCP server (`https://datafa.st/api/mcp`).
In Claude Code, run `/mcp` and sign in with OAuth to query these analytics.

## Privacy

The public policy is `privacy/index.html` (`/privacy/`), with the terms in `terms/index.html` (`/terms/`).
Keep them in step with what the code stores. Contact: `hello@killmyidea.biz` (Cloudflare Email Routing).

- Private history is off by default and stays in the browser's `localStorage`. There are no accounts.
- Successful evaluations are archived server-side for product analysis by default; the form provides an explicit opt-out.
- DataFast never receives idea text. To move private history to Supabase, implement
  `IdeaStore` in `src/lib/storage.ts`.

## License

MIT. See [LICENSE](LICENSE).
