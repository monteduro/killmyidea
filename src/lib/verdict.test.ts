import { describe, expect, it } from 'vitest'
import { dimensionCopy, riskCopy, strengthCopy } from './copy'
import { composeEvaluation } from './evaluate'
import { DIMENSIONS, type DimensionKey } from './questions'
import { bestAndWorst, cardIdea, xIntentUrl, xShareText } from './share'
import type { Answer } from './typesafe'

// Raw Jev 0-4 answers → composeEvaluation → score + verdict.
function jev(raw: Record<DimensionKey, number>) {
  const answers: Record<string, Answer> = {}
  for (const k of DIMENSIONS) answers[k] = { type: 'score', score: raw[k], confidence: 0.7, legend: {}, probabilities: {} }
  answers.category = { type: 'choice', choice: 'Other', confidence: 0.5, probabilities: {} }
  answers.is_understandable = { type: 'noul', noul: 0.9 }
  return composeEvaluation({ model: 'test', answers }, 100)
}

describe('idea profiles', () => {
  it('superficially stupid idea → KILL', () => {
    // Real Jev answers for "Uber for dog walking, but every walk is an NFT": the market
    // exists, but there is no real problem and little money, and those count double.
    const e = jev({ problem: 0.64, customer: 2.92, demand: 3.12, money: 1.32, reach: 2.48, different: 2.48, buildable: 1.84, shareable: 1.68 })
    expect(e.score).toBe(46)
    expect(e.verdict).toBe('KILL')
  })

  it('interesting idea with a couple of big weaknesses → FIX', () => {
    // Real problem and easy to build, but hard to monetize and to stand out.
    const e = jev({ problem: 3, customer: 3, demand: 2.8, money: 0.8, reach: 2.4, different: 1, buildable: 3.4, shareable: 2 })
    expect(e.score).toBe(56)
    expect(e.verdict).toBe('FIX')
    expect(bestAndWorst(e).worst.key).toBe('money')
  })

  it('strong executable idea → SHIP', () => {
    // "Automatic invoice chasing for freelancers, $19/month"
    const e = jev({ problem: 3.4, customer: 3.6, demand: 3.4, money: 3.3, reach: 2.8, different: 2, buildable: 3.3, shareable: 2.2 })
    expect(e.score).toBe(77)
    expect(e.verdict).toBe('SHIP')
  })

  it('keeps every Jev value, only scaled to 0-100', () => {
    const e = jev(Object.fromEntries(DIMENSIONS.map((k) => [k, 2.2])) as Record<DimensionKey, number>)
    for (const k of DIMENSIONS) expect(e.dimensions[k]).toBe(55)
    expect(e.score).toBe(55)
  })
})

describe('best signal / biggest risk', () => {
  it('uses the highest and lowest questions', () => {
    const e = jev({ problem: 2, customer: 2, demand: 2, money: 0.4, reach: 2, different: 2, buildable: 3.9, shareable: 2 })
    const { best, worst } = bestAndWorst(e)
    expect(best).toMatchObject({ key: 'buildable', value: 98 })
    expect(worst).toMatchObject({ key: 'money', value: 10 })
    expect(dimensionCopy('strength', best.key)).toBe(strengthCopy.buildable)
    expect(dimensionCopy('risk', worst.key)).toBe(riskCopy.money)
  })

  it('has copy for every question', () => {
    for (const k of DIMENSIONS) {
      expect(strengthCopy[k]).toBeTruthy()
      expect(riskCopy[k]).toBeTruthy()
    }
  })
})

describe('cardIdea', () => {
  it('keeps short ideas and collapses whitespace', () => {
    expect(cardIdea('  An app\n\nfor   dogs  ')).toBe('An app for dogs')
  })
  it('cuts long ideas at a word boundary', () => {
    const out = cardIdea('word '.repeat(60))
    expect(out.length).toBeLessThanOrEqual(151)
    expect(out.endsWith('word…')).toBe(true)
  })
})

describe('X sharing', () => {
  const result = {
    score: 42,
    verdict: 'KILL' as const,
    dimensions: { problem: 34, money: 19, buildable: 77 },
    category: 'Consumer',
  }

  it('includes the idea in concise, readable share copy', () => {
    expect(xShareText(result, 'An app for dogs')).toContain('“An app for dogs”')
    const url = new URL(xIntentUrl(result, 'An app for dogs'))
    expect(url.searchParams.get('text')).toContain('“An app for dogs”')
  })

  it('shortens a long idea for X', () => {
    expect(xShareText(result, 'word '.repeat(60))).toContain('word…')
  })
})
