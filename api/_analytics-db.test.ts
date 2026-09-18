import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, expect, it } from 'vitest'
import type { Evaluation } from '../src/lib/types'
import { EvaluationArchive } from './_analytics-db'

const dirs: string[] = []

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('EvaluationArchive', () => {
  it('stores the request, scores and diagnostics in SQLite', () => {
    const dir = mkdtempSync(join(tmpdir(), 'killmyidea-'))
    dirs.push(dir)
    const path = join(dir, 'analytics.sqlite')
    const archive = new EvaluationArchive(path)
    const evaluation: Evaluation = {
      score: 61,
      verdict: 'FIX',
      needsDetail: false,
      scoringVersion: 2,
      goal: 'money',
      dimensions: {
        problem: 75,
        customer: 50,
        demand: 50,
        money: 50,
        reach: 75,
        different: 25,
        buildable: 100,
        shareable: 50,
      },
      category: 'SaaS',
      understandable: 0.87,
      decisions: 10,
      latencyMs: 321,
      debug: {
        model: 'jev-test',
        latencyMs: 321,
        usage: { input_tokens: 123, output_tokens: 45 },
        mock: false,
        dimensions: [],
        category: { choice: 'SaaS', confidence: 0.8, probabilities: { SaaS: 0.8 } },
        understandable: 0.87,
        response: { model: 'jev-test', answers: {} },
      },
    }

    archive.save({
      requestId: 'request-1',
      createdAt: '2026-09-17T12:00:00.000Z',
      idea: 'A sufficiently detailed startup idea',
      evaluation,
    })
    archive.close()

    const db = new DatabaseSync(path, { readOnly: true })
    const row = db.prepare('SELECT * FROM evaluations').get() as Record<string, unknown>
    db.close()

    expect(row).toMatchObject({
      request_id: 'request-1',
      created_at: '2026-09-17T12:00:00.000Z',
      idea: 'A sufficiently detailed startup idea',
      idea_length: 36,
      score: 61,
      verdict: 'FIX',
      category: 'SaaS',
      model: 'jev-test',
      input_tokens: 123,
      output_tokens: 45,
      goal: 'money',
      scoring_version: 2,
      needs_detail: 0,
      problem: 75,
      appeal: null,
      money: 50,
      adoption: null,
      buildable: 100,
    })
    expect(JSON.parse(row.debug_json as string)).toMatchObject({ model: 'jev-test', latencyMs: 321 })
  })

  it('stores the goal question in its own column', () => {
    const path = tempDb()
    const archive = new EvaluationArchive(path)
    archive.save({
      requestId: 'request-oss',
      createdAt: '2026-09-17T12:00:00.000Z',
      idea: 'An open source idea',
      evaluation: evaluation({ goal: 'open_source', dimensions: { ...DIMS, adoption: 80 } }),
    })
    archive.close()

    const row = readRows(path)[0]
    expect(row).toMatchObject({ scoring_version: 2, goal: 'open_source', money: null, adoption: 80, appeal: null, fun: null })
  })

  it('migrates a table created before goals, keeping its rows', () => {
    const path = tempDb()
    const legacy = new DatabaseSync(path)
    legacy.exec(`
      CREATE TABLE evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL,
        idea TEXT NOT NULL, idea_length INTEGER NOT NULL, score INTEGER NOT NULL, verdict TEXT NOT NULL,
        category TEXT NOT NULL, understandable REAL NOT NULL, decisions INTEGER NOT NULL,
        latency_ms INTEGER NOT NULL, model TEXT NOT NULL, mock INTEGER NOT NULL, input_tokens INTEGER,
        output_tokens INTEGER, problem INTEGER NOT NULL, customer INTEGER NOT NULL, demand INTEGER NOT NULL,
        money INTEGER NOT NULL, reach INTEGER NOT NULL, different INTEGER NOT NULL,
        buildable INTEGER NOT NULL, shareable INTEGER NOT NULL, debug_json TEXT NOT NULL
      ) STRICT;
      CREATE INDEX evaluations_verdict_idx ON evaluations(verdict);
      INSERT INTO evaluations VALUES (
        NULL, 'old', '2026-01-01', 'An old idea', 11, 56, 'FIX', 'AI', 0.9, 10, 100, 'jev', 0, NULL, NULL,
        60, 74, 78, 22, 75, 41, 75, 50, '{}'
      );
    `)
    legacy.close()

    const archive = new EvaluationArchive(path)
    archive.save({
      requestId: 'new',
      createdAt: '2026-09-17',
      idea: 'A fun idea',
      evaluation: evaluation({
        goal: 'fun',
        dimensions: { appeal: 50, customer: 50, demand: 50, fun: 90, reach: 50, different: 50, buildable: 50, shareable: 50 },
      }),
    })
    archive.close()

    const rows = readRows(path)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ request_id: 'old', scoring_version: 1, needs_detail: 0, goal: 'money', money: 22, appeal: null, fun: null })
    expect(rows[1]).toMatchObject({ request_id: 'new', scoring_version: 2, goal: 'fun', problem: null, money: null, appeal: 50, fun: 90 })
  })

  it('migrates the goal-aware v1 production schema to scoring v2', () => {
    const path = tempDb()
    const v1 = new DatabaseSync(path)
    v1.exec(`
      CREATE TABLE evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL,
        idea TEXT NOT NULL, idea_length INTEGER NOT NULL, score INTEGER NOT NULL, verdict TEXT NOT NULL,
        category TEXT NOT NULL, understandable REAL NOT NULL, decisions INTEGER NOT NULL,
        latency_ms INTEGER NOT NULL, model TEXT NOT NULL, mock INTEGER NOT NULL, input_tokens INTEGER,
        output_tokens INTEGER, goal TEXT NOT NULL DEFAULT 'money', problem INTEGER NOT NULL,
        customer INTEGER NOT NULL, demand INTEGER NOT NULL, money INTEGER, adoption INTEGER, fun INTEGER,
        reach INTEGER NOT NULL, different INTEGER NOT NULL, buildable INTEGER NOT NULL,
        shareable INTEGER NOT NULL, debug_json TEXT NOT NULL
      ) STRICT;
      INSERT INTO evaluations VALUES (
        NULL, 'v1-fun', '2026-09-17', 'A fun v1 idea', 13, 57, 'FIX', 'Consumer', 0.2, 10, 100,
        'jev', 0, NULL, NULL, 'fun', 25, 50, 50, NULL, NULL, 75, 50, 50, 75, 50, '{}'
      );
    `)
    v1.close()

    const archive = new EvaluationArchive(path)
    archive.save({
      requestId: 'v2-fun',
      createdAt: '2026-09-18',
      idea: 'A fun v2 idea',
      evaluation: evaluation({
        goal: 'fun',
        dimensions: { appeal: 75, customer: 50, demand: 50, fun: 75, reach: 50, different: 50, buildable: 50, shareable: 50 },
      }),
    })
    archive.close()

    const rows = readRows(path)
    expect(rows[0]).toMatchObject({ request_id: 'v1-fun', scoring_version: 1, needs_detail: 1, problem: 25, appeal: null, fun: 75 })
    expect(rows[1]).toMatchObject({ request_id: 'v2-fun', scoring_version: 2, problem: null, appeal: 75, fun: 75 })

    const db = new DatabaseSync(path, { readOnly: true })
    const problem = db.prepare("SELECT \"notnull\" FROM pragma_table_info('evaluations') WHERE name = 'problem'").get() as {
      notnull: number
    }
    db.close()
    expect(problem.notnull).toBe(0)
  })
})

const DIMS = { problem: 50, customer: 50, demand: 50, reach: 50, different: 50, buildable: 50, shareable: 50 }

function tempDb() {
  const dir = mkdtempSync(join(tmpdir(), 'killmyidea-'))
  dirs.push(dir)
  return join(dir, 'analytics.sqlite')
}

function readRows(path: string) {
  const db = new DatabaseSync(path, { readOnly: true })
  const rows = db.prepare('SELECT * FROM evaluations ORDER BY id').all() as Record<string, unknown>[]
  db.close()
  return rows
}

function evaluation(overrides: Partial<Evaluation>): Evaluation {
  return {
    score: 50,
    verdict: 'FIX',
    needsDetail: false,
    scoringVersion: 2,
    goal: 'money',
    dimensions: {},
    category: 'Other',
    understandable: 0.9,
    decisions: 10,
    latencyMs: 1,
    debug: {
      model: 'jev-test',
      latencyMs: 1,
      mock: false,
      dimensions: [],
      category: { choice: 'Other', confidence: 1, probabilities: {} },
      understandable: 0.9,
      response: { model: 'jev-test', answers: {} },
    },
    ...overrides,
  }
}
