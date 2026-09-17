# Kill My Idea

Describe a startup idea. Jev decides: **KILL IT**, **FIX IT** or **SHIP IT**.

No generative LLM. One request asks [TypeSafe](https://typesafe.ai) Jev 10
questions in parallel: 8 plain indie-hacker questions scored 0–4, plus the
category and whether the idea is understandable.

```
idea → Jev (8 scores) → each × 25 → average (Problem, Money ×2) → KILL / FIX / SHIP
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

`SITE_URL` (optional) sets the absolute URL used in the OG/Twitter image tags.
It defaults to `https://killmyidea.stemonte.io`. The image itself is `public/og.png` (1200×630).

For UI work without a key, set `TYPESAFE_MOCK=1`. The API then returns
deterministic fake answers labelled `MOCK DATA` in the raw-data panel. Mock mode is
ignored on Vercel.

## 3. Run locally

```bash
npm run dev          # http://127.0.0.1:5317 (serves /api/evaluate too)
npm test             # unit tests
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

## 6. Scoring

`src/lib/scoring.ts` and `src/lib/verdict.ts`. That's all there is:

- each question: Jev score 0–4 × 25 → 0–100
- **score = average of the 8 questions, with Problem and Money counting double** (`WEIGHTS`)
- **KILL** below 50 · **FIX** 50–64 · **SHIP** 65+ (`VERDICT_THRESHOLDS`)

BEST SIGNAL / BIGGEST RISK are the highest / lowest question, with fixed copy in
`src/lib/copy.ts`. The understandability check never changes the score; below
0.3 it only shows "add more detail".

## 7. Jev questions

`src/lib/questions.ts`: Real problem, Clear customer, Demand, Money, Reach,
Different, Buildable, Shareable. Each has five levels written as concrete situations
(Jev judges each level on its own). The HTTP client is `src/lib/typesafe.ts`.

## Layout

```
api/evaluate.ts           serverless endpoint (validate → Jev → score → respond)
api/_dataset.ts           no-op hook for a future public dataset (opt-in only)
api/_mock.ts              local-only fake answers
src/lib/questions.ts      Jev questions
src/lib/scoring.ts        0-4 → 0-100, average
src/lib/verdict.ts        KILL / FIX / SHIP thresholds
src/lib/copy.ts           fixed copy per question
src/lib/storage.ts        history (IdeaStore interface, localStorage implementation)
src/lib/share.ts          share text and X intent URL
src/lib/features.ts       DATASET_ENABLED flag, site URL
src/components/           UI
```

## Analytics (DataFast, cookieless)

Production builds load DataFast's cookieless script (`script.cookieless.js`) with
the site id `dfid_UvVlC3fid8kOr95YTMIho` (`vite.config.ts`). Dev builds only track
when `DATAFAST_WEBSITE_ID` is set; `DATAFAST_WEBSITE_ID=off` disables tracking.
`DATAFAST_DOMAIN` defaults to `killmyidea.stemonte.io`. In DataFast, enable **Settings → General → Cookieless / privacy mode**
so the dashboard matches the script.

Custom goals (`src/lib/analytics.ts`):

| Goal | When | Params |
|---|---|---|
| `idea_submitted` | idea sent to Jev | `length`, `saved` |
| `idea_judged` | result shown | `verdict`, `score`, `category`, `best`, `worst`, `latency_ms`, `saved` |
| `idea_failed` | evaluation error | – |
| `result_copied` / `shared_on_x` / `card_downloaded` | share actions | result params |
| `history_opened` | saved idea reopened | result params |

The idea text is never sent to DataFast.

`.mcp.json` registers the official DataFast MCP server (`https://datafa.st/api/mcp`).
In Claude Code, run `/mcp` and sign in with OAuth to query these analytics.

## Privacy

- Saving is off by default. Unsaved ideas are evaluated and then discarded.
- Saved ideas stay in the browser's `localStorage`. There are no accounts.
- The API never logs idea text, and analytics never receive it. To move history to Supabase, implement
  `IdeaStore` in `src/lib/storage.ts`.
- The public dataset checkbox is hidden (`DATASET_ENABLED = false`) until
  `api/_dataset.ts` has a real backend.
