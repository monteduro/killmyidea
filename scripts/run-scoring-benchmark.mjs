import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cases = JSON.parse(await readFile(resolve(root, 'benchmarks/cases.json'), 'utf8'))
const goals = ['money', 'open_source', 'fun']
const baseUrl = (process.env.BENCHMARK_URL || 'http://127.0.0.1:5317').replace(/\/$/, '')
const runs = positiveInteger(process.env.BENCHMARK_RUNS, 1)
const concurrency = positiveInteger(process.env.BENCHMARK_CONCURRENCY, 3)
const outputPath = resolve(root, process.env.BENCHMARK_OUTPUT || 'benchmarks/results/latest.json')

if (process.argv.includes('--help')) {
  console.log(`Usage: npm run benchmark

Runs every case in benchmarks/cases.json against every goal without archiving it.

Environment:
  BENCHMARK_URL          App URL (default: http://127.0.0.1:5317)
  BENCHMARK_RUNS         Repetitions per case and goal (default: 1)
  BENCHMARK_CONCURRENCY  Simultaneous requests (default: 3)
  BENCHMARK_OUTPUT       JSON output path (default: benchmarks/results/latest.json)`)
  process.exit(0)
}

const jobs = cases.flatMap((testCase) =>
  goals.flatMap((goal) => Array.from({ length: runs }, (_, run) => ({ testCase, goal, run: run + 1 }))),
)
const records = await mapConcurrent(jobs, concurrency, evaluate)
const report = {
  generatedAt: new Date().toISOString(),
  endpoint: `${baseUrl}/api/evaluate`,
  caseCount: cases.length,
  requestCount: records.length,
  runsPerCaseAndGoal: runs,
  summary: summarize(records),
  records,
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report.summary, null, 2))
if (report.summary.mockResponses) {
  console.warn('\nWarning: mock responses are only useful for testing the runner, not scoring analysis.')
}
console.log(`\nFull report: ${outputPath}`)

async function evaluate({ testCase, goal, run }) {
  const started = performance.now()
  const response = await fetch(`${baseUrl}/api/evaluate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idea: testCase.idea, goal, doNotArchive: true }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${testCase.id}/${goal}/${run}: HTTP ${response.status} ${JSON.stringify(body)}`)
  return {
    id: testCase.id,
    expectedCategory: testCase.category,
    goal,
    run,
    score: body.score,
    verdict: body.verdict,
    category: body.category,
    understandable: body.understandable,
    needsDetail: body.needsDetail,
    scoringVersion: body.scoringVersion,
    mock: body.debug?.mock === true,
    latencyMs: body.latencyMs,
    wallTimeMs: Math.round(performance.now() - started),
    dimensions: body.dimensions,
  }
}

function summarize(records) {
  const categoryMatches = records.filter((record) => record.category === record.expectedCategory).length
  const repeats = groupBy(records, (record) => `${record.id}/${record.goal}`)
  const scoreRanges = [...repeats.values()].map(
    (group) => Math.max(...group.map((record) => record.score)) - Math.min(...group.map((record) => record.score)),
  )
  return {
    scoringVersions: [...new Set(records.map((record) => record.scoringVersion))].sort(),
    mockResponses: records.filter((record) => record.mock).length,
    categoryAccuracy: ratio(categoryMatches, records.length),
    clarityGates: records.filter((record) => record.needsDetail).length,
    byGoal: Object.fromEntries(
      goals.map((goal) => {
        const group = records.filter((record) => record.goal === goal)
        return [
          goal,
          {
            averageScore: average(group.map((record) => record.score)),
            verdicts: counts(group.map((record) => record.verdict)),
            averageUnderstandable: average(group.map((record) => record.understandable)),
          },
        ]
      }),
    ),
    byExpectedCategory: Object.fromEntries(
      [...new Set(cases.map((testCase) => testCase.category))].map((category) => {
        const group = records.filter((record) => record.expectedCategory === category)
        return [
          category,
          {
            averageScore: average(group.map((record) => record.score)),
            categoryAccuracy: ratio(
              group.filter((record) => record.category === category).length,
              group.length,
            ),
          },
        ]
      }),
    ),
    repeatStability: {
      meanScoreRange: average(scoreRanges),
      maxScoreRange: Math.max(...scoreRanges),
    },
  }
}

async function mapConcurrent(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++
        results[index] = await fn(items[index])
      }
    }),
  )
  return results
}

function groupBy(items, keyFor) {
  const groups = new Map()
  for (const item of items) {
    const key = keyFor(item)
    groups.set(key, [...(groups.get(key) || []), item])
  }
  return groups
}

function counts(values) {
  return Object.fromEntries(
    [...new Set(values)].sort().map((value) => [value, values.filter((candidate) => candidate === value).length]),
  )
}

function average(values) {
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100 : null
}

function ratio(numerator, denominator) {
  return denominator ? Math.round((numerator / denominator) * 1000) / 1000 : null
}

function positiveInteger(raw, fallback) {
  const value = Number(raw ?? fallback)
  if (!Number.isInteger(value) || value < 1) throw new Error(`Expected a positive integer, received ${raw}`)
  return value
}
