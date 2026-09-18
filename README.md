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

`SITE_URL` (optional) sets the absolute URL used in the OG/Twitter image tags.
It defaults to `https://killmyidea.stemonte.io`. The image itself is `public/og.png` (1200×630).

For UI work without a key, set `TYPESAFE_MOCK=1`. The API then returns
deterministic fake answers labelled `MOCK DATA` in the raw-data panel. Mock mode is
ignored on Vercel.

## 3. Run locally

```bash
npm run dev          # http://127.0.0.1:5317 (serves /api/evaluate too)
npm test             # unit tests
npm run benchmark    # balanced scoring benchmark; requires the app to be running
```

Every result has a collapsed "How Jev decided" panel with raw Jev answers, probabilities, confidence,
the average, the verdict, latency and token usage. `?debug=1` opens it by default.

## 4. Build

```bash
npm run build        # typecheck + static build in dist/
```

## 5. Deploy to Vercel

1. Import the repo in Vercel. The framework is detected as Vite.
2. Add `TYPESAFE_API_KEY` under Project → Settings → Environment Variables.
3. Deploy. `dist/` is served statically and `api/evaluate.ts` becomes the only function.

Or use the CLI: `npx vercel --prod`.

SQLite needs a persistent local disk. It works directly with the Node server
(`npm run build:server && npm start`) and hosts such as Forge. Vercel Functions
do not provide a durable filesystem, so use a persistent deployment or replace
the archive adapter before relying on the collected data there.

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
api/evaluate.ts           serverless endpoint (validate → Jev → score → respond)
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
benchmarks/cases.json     balanced, synthetic benchmark cases
scripts/run-scoring-benchmark.mjs  benchmark runner and summary
```

## Analytics (DataFast, cookieless)

Production builds load DataFast's cookieless script (`script.cookieless.js`) with
the site id `dfid_UvVlC3fid8kOr95YTMIho` (`vite.config.ts`). Dev builds only track
when `DATAFAST_WEBSITE_ID` is set; `DATAFAST_WEBSITE_ID=off` disables tracking.
`DATAFAST_DOMAIN` defaults to `killmyidea.stemonte.io`. In DataFast, enable **Settings → General → Cookieless / privacy mode**
so the dashboard matches the script.

There is one custom goal (`src/lib/analytics.ts`): `idea_submitted`, with
`length`, `saved`, and `archived` params. The idea text is never sent to DataFast.

## Evaluation archive (SQLite)

Unless the user checks the opt-out, each successful evaluation creates one row
in the `evaluations` table. It includes the idea, scoring version, total score,
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

- Private history is off by default and stays in the browser's `localStorage`. There are no accounts.
- Successful evaluations are archived server-side for product analysis by default; the form provides an explicit opt-out.
- DataFast never receives idea text. To move private history to Supabase, implement
  `IdeaStore` in `src/lib/storage.ts`.
