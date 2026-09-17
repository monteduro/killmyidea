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
      problem: 75,
      buildable: 100,
    })
    expect(JSON.parse(row.debug_json as string)).toMatchObject({ model: 'jev-test', latencyMs: 321 })
  })
})
