import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { Evaluation } from '../src/lib/types.js'

const DEFAULT_DB_PATH = resolve(process.cwd(), 'data', 'analytics.sqlite')

const table = (name: string) => `
  CREATE TABLE IF NOT EXISTS ${name} (
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
    scoring_version INTEGER NOT NULL DEFAULT 1,
    needs_detail INTEGER NOT NULL DEFAULT 0,
    goal TEXT NOT NULL DEFAULT 'money',
    problem INTEGER,
    appeal INTEGER,
    customer INTEGER NOT NULL,
    demand INTEGER NOT NULL,
    money INTEGER,
    adoption INTEGER,
    fun INTEGER,
    reach INTEGER NOT NULL,
    different INTEGER NOT NULL,
    buildable INTEGER NOT NULL,
    shareable INTEGER NOT NULL,
    debug_json TEXT NOT NULL
  ) STRICT;
`

const indexes = `
  CREATE INDEX IF NOT EXISTS evaluations_created_at_idx ON evaluations(created_at);
  CREATE INDEX IF NOT EXISTS evaluations_verdict_idx ON evaluations(verdict);
  CREATE INDEX IF NOT EXISTS evaluations_category_idx ON evaluations(category);
  CREATE INDEX IF NOT EXISTS evaluations_goal_idx ON evaluations(goal);
  CREATE INDEX IF NOT EXISTS evaluations_scoring_version_idx ON evaluations(scoring_version);
`

/** Columns shared by the pre-goal table and the current one. */
const LEGACY_COLUMNS = `request_id, created_at, idea, idea_length, score, verdict, category,
  understandable, decisions, latency_ms, model, mock, input_tokens, output_tokens,
  problem, customer, demand, money, reach, different, buildable, shareable, debug_json`

const GOAL_V1_COLUMNS = `request_id, created_at, idea, idea_length, score, verdict, category,
  understandable, decisions, latency_ms, model, mock, input_tokens, output_tokens, goal,
  problem, customer, demand, money, adoption, fun, reach, different, buildable, shareable, debug_json`

/** Tables created before goals had `money NOT NULL` and no goal columns: rebuild them once. */
function migrateLegacyGoalTable(db: DatabaseSync) {
  const columns = db.prepare(`PRAGMA table_info(evaluations)`).all() as { name: string }[]
  if (columns.length === 0 || columns.some((c) => c.name === 'goal')) return
  db.exec('BEGIN')
  try {
    db.exec(table('evaluations_next'))
    db.exec(`INSERT INTO evaluations_next (${LEGACY_COLUMNS}) SELECT ${LEGACY_COLUMNS} FROM evaluations`)
    db.exec('DROP TABLE evaluations')
    db.exec('ALTER TABLE evaluations_next RENAME TO evaluations')
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

/** Scoring v2 lets Fun replace Problem with Appeal, so Problem must become nullable. */
function migrateFunAppealTable(db: DatabaseSync) {
  const columns = db.prepare(`PRAGMA table_info(evaluations)`).all() as { name: string; notnull: number }[]
  const problem = columns.find((column) => column.name === 'problem')
  if (!problem?.notnull || !columns.some((column) => column.name === 'goal')) return
  db.exec('BEGIN')
  try {
    db.exec(table('evaluations_next'))
    db.exec(`INSERT INTO evaluations_next (${GOAL_V1_COLUMNS}) SELECT ${GOAL_V1_COLUMNS} FROM evaluations`)
    db.exec('DROP TABLE evaluations')
    db.exec('ALTER TABLE evaluations_next RENAME TO evaluations')
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

/** Additive migrations for later scoring revisions. Existing rows belong to scoring v1. */
function migrateScoringColumns(db: DatabaseSync) {
  const columns = new Set(
    (db.prepare(`PRAGMA table_info(evaluations)`).all() as { name: string }[]).map((column) => column.name),
  )
  if (!columns.has('scoring_version')) {
    db.exec('ALTER TABLE evaluations ADD COLUMN scoring_version INTEGER NOT NULL DEFAULT 1')
  }
  if (!columns.has('needs_detail')) {
    db.exec('ALTER TABLE evaluations ADD COLUMN needs_detail INTEGER NOT NULL DEFAULT 0')
  }
  if (!columns.has('appeal')) db.exec('ALTER TABLE evaluations ADD COLUMN appeal INTEGER')
  db.exec('UPDATE evaluations SET needs_detail = understandable < 0.3 WHERE scoring_version = 1')
}

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
    migrateLegacyGoalTable(this.db)
    migrateFunAppealTable(this.db)
    this.db.exec(table('evaluations'))
    migrateScoringColumns(this.db)
    this.db.exec(indexes)
  }

  save({ requestId, createdAt, idea, evaluation }: ArchivedEvaluation) {
    const d = evaluation.dimensions
    this.db
      .prepare(`
        INSERT INTO evaluations (
          request_id, created_at, idea, idea_length, score, verdict, category,
          understandable, decisions, latency_ms, model, mock, input_tokens, output_tokens,
          scoring_version, needs_detail, goal, problem, appeal, customer, demand, money, adoption, fun,
          reach, different, buildable, shareable, debug_json
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
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
        evaluation.scoringVersion,
        evaluation.needsDetail ? 1 : 0,
        evaluation.goal ?? 'money',
        d.problem ?? null,
        d.appeal ?? null,
        d.customer,
        d.demand,
        d.money ?? null,
        d.adoption ?? null,
        d.fun ?? null,
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
