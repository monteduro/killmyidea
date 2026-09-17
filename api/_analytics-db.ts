import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { Evaluation } from '../src/lib/types.js'

const DEFAULT_DB_PATH = resolve(process.cwd(), 'data', 'analytics.sqlite')

const schema = `
  CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    idea TEXT NOT NULL,
    idea_length INTEGER NOT NULL,
    score INTEGER NOT NULL,
    verdict TEXT NOT NULL,
    category TEXT NOT NULL,
    understandable REAL NOT NULL,
    decisions INTEGER NOT NULL,
    latency_ms INTEGER NOT NULL,
    model TEXT NOT NULL,
    mock INTEGER NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    problem INTEGER NOT NULL,
    customer INTEGER NOT NULL,
    demand INTEGER NOT NULL,
    money INTEGER NOT NULL,
    reach INTEGER NOT NULL,
    different INTEGER NOT NULL,
    buildable INTEGER NOT NULL,
    shareable INTEGER NOT NULL,
    debug_json TEXT NOT NULL
  ) STRICT;

  CREATE INDEX IF NOT EXISTS evaluations_created_at_idx ON evaluations(created_at);
  CREATE INDEX IF NOT EXISTS evaluations_verdict_idx ON evaluations(verdict);
  CREATE INDEX IF NOT EXISTS evaluations_category_idx ON evaluations(category);
`

export type ArchivedEvaluation = {
  requestId: string
  createdAt: string
  idea: string
  evaluation: Evaluation
}

export class EvaluationArchive {
  readonly path: string
  private readonly db: DatabaseSync

  constructor(path = process.env.ANALYTICS_DB_PATH || DEFAULT_DB_PATH) {
    this.path = path
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;')
    this.db.exec(schema)
  }

  save({ requestId, createdAt, idea, evaluation }: ArchivedEvaluation) {
    const d = evaluation.dimensions
    this.db
      .prepare(`
        INSERT INTO evaluations (
          request_id, created_at, idea, idea_length, score, verdict, category,
          understandable, decisions, latency_ms, model, mock, input_tokens, output_tokens,
          problem, customer, demand, money, reach, different, buildable, shareable, debug_json
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `)
      .run(
        requestId,
        createdAt,
        idea,
        idea.length,
        evaluation.score,
        evaluation.verdict,
        evaluation.category,
        evaluation.understandable,
        evaluation.decisions,
        evaluation.latencyMs,
        evaluation.debug.model,
        evaluation.debug.mock ? 1 : 0,
        evaluation.debug.usage?.input_tokens ?? null,
        evaluation.debug.usage?.output_tokens ?? null,
        d.problem,
        d.customer,
        d.demand,
        d.money,
        d.reach,
        d.different,
        d.buildable,
        d.shareable,
        JSON.stringify(evaluation.debug),
      )
  }

  close() {
    this.db.close()
  }
}

let archive: EvaluationArchive | undefined

/** Lazily opens one connection per server process. */
export function saveEvaluation(record: ArchivedEvaluation) {
  archive ??= new EvaluationArchive()
  archive.save(record)
}
