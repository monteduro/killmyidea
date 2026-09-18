import { describe, expect, it } from 'vitest'
import { composeEvaluation, validateGoal, validateIdea } from './evaluate'
import { DECISION_COUNT, DIMENSIONS, dimensionsFor, GOALS, questionsFor } from './questions'
import { SCORING_VERSION } from './scoring'
import type { Answer } from './typesafe'

function response(score: number, understandable: number, category = 'Consumer', keys: readonly string[] = DIMENSIONS) {
  const answers: Record<string, Answer> = {}
  for (const k of keys) answers[k] = { type: 'score', score, confidence: 0.9, legend: {}, probabilities: {} }
  answers.category = { type: 'choice', choice: category, confidence: 0.8, probabilities: {} }
  answers.is_understandable = { type: 'noul', noul: understandable }
  return { model: 'jev-latest', answers }
}

describe('validateIdea', () => {
  it('enforces 20-5000 characters after trimming', () => {
    expect(validateIdea('   too short    ').ok).toBe(false)
    expect(validateIdea('x'.repeat(20)).ok).toBe(true)
    expect(validateIdea('x'.repeat(5001)).ok).toBe(false)
    expect(validateIdea(42).ok).toBe(false)
  })
})

describe('composeEvaluation', () => {
  it('averages the answers and picks the verdict', () => {
    const e = composeEvaluation(response(3, 0.9), 120)
    expect(e).toMatchObject({
      score: 75,
      verdict: 'SHIP',
      needsDetail: false,
      scoringVersion: SCORING_VERSION,
      decisions: DECISION_COUNT,
      latencyMs: 120,
    })
  })
  it('retains the raw score but withholds the result for unclear ideas', () => {
    const e = composeEvaluation(response(3, 0.1), 120)
    expect(e.score).toBe(75)
    expect(e.understandable).toBe(0.1)
    expect(e.needsDetail).toBe(true)
  })
  it('falls back to Other for unknown categories', () => {
    expect(composeEvaluation(response(2, 0.9, 'Robots'), 1).category).toBe('Other')
  })
  it('throws on a malformed response', () => {
    expect(() => composeEvaluation({ model: 'x', answers: {} }, 1)).toThrow()
  })
})

describe('goals', () => {
  it('defaults to money and rejects unknown goals', () => {
    expect(validateGoal(undefined)).toEqual({ ok: true, goal: 'money' })
    expect(validateGoal('open_source')).toEqual({ ok: true, goal: 'open_source' })
    expect(validateGoal('world_domination').ok).toBe(false)
  })

  it('uses the questions that fit each goal without changing the decision count', () => {
    expect(dimensionsFor('money')).toEqual([...DIMENSIONS])
    expect(dimensionsFor('open_source')).toEqual(DIMENSIONS.map((k) => (k === 'money' ? 'adoption' : k)))
    expect(dimensionsFor('fun')).toEqual(
      DIMENSIONS.map((k) => (k === 'problem' ? 'appeal' : k === 'money' ? 'fun' : k)),
    )
    for (const goal of GOALS) expect(Object.keys(questionsFor(goal))).toHaveLength(DECISION_COUNT)
    expect(questionsFor('open_source')).not.toHaveProperty('money')
    expect(questionsFor('fun')).not.toHaveProperty('problem')
    expect(questionsFor('fun')).not.toHaveProperty('money')
    expect(questionsFor('fun')).toHaveProperty('appeal')
    expect(questionsFor('fun')).toHaveProperty('fun')
  })

  it('scores open source ideas on Adoption instead of Money', () => {
    const keys = dimensionsFor('open_source')
    const r = response(2, 0.9, 'Consumer', keys)
    r.answers.adoption = { type: 'score', score: 4, confidence: 0.9, legend: {}, probabilities: {} }
    const e = composeEvaluation(r, 1, false, 'open_source')
    expect(e.goal).toBe('open_source')
    expect(Object.keys(e.dimensions)).toEqual(keys)
    expect(e.dimensions).toMatchObject({ adoption: 100 })
    expect(e.score).toBe(60) // (50 × 8 + 100 × 2) / 10
  })

  it('scores fun ideas on Appeal and Fun instead of Problem and Money', () => {
    const keys = dimensionsFor('fun')
    const r = response(2, 0.9, 'Consumer', keys)
    r.answers.appeal = { type: 'score', score: 4, confidence: 0.9, legend: {}, probabilities: {} }
    r.answers.fun = { type: 'score', score: 4, confidence: 0.9, legend: {}, probabilities: {} }
    const e = composeEvaluation(r, 1, false, 'fun')
    expect(Object.keys(e.dimensions)).toEqual(keys)
    expect(e.dimensions).toMatchObject({ appeal: 100, fun: 100 })
    expect(e.dimensions).not.toHaveProperty('problem')
    expect(e.dimensions).not.toHaveProperty('money')
    expect(e.score).toBe(70) // (50 × 6 + 100 × 4) / 10
  })

  it('needs the answer for the goal question', () => {
    expect(() => composeEvaluation(response(2, 0.9), 1, false, 'fun')).toThrow()
  })
})
