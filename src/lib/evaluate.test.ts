import { describe, expect, it } from 'vitest'
import { composeEvaluation, validateIdea } from './evaluate'
import { DECISION_COUNT, DIMENSIONS } from './questions'
import type { Answer } from './typesafe'

function response(score: number, understandable: number, category = 'Consumer') {
  const answers: Record<string, Answer> = {}
  for (const k of DIMENSIONS) answers[k] = { type: 'score', score, confidence: 0.9, legend: {}, probabilities: {} }
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
    expect(e).toMatchObject({ score: 75, verdict: 'SHIP', decisions: DECISION_COUNT, latencyMs: 120 })
  })
  it('does not penalise unclear ideas, only reports it', () => {
    const e = composeEvaluation(response(3, 0.1), 120)
    expect(e.score).toBe(75)
    expect(e.understandable).toBe(0.1)
  })
  it('falls back to Other for unknown categories', () => {
    expect(composeEvaluation(response(2, 0.9, 'Robots'), 1).category).toBe('Other')
  })
  it('throws on a malformed response', () => {
    expect(() => composeEvaluation({ model: 'x', answers: {} }, 1)).toThrow()
  })
})
