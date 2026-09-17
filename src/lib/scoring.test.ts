import { describe, expect, it } from 'vitest'
import { DIMENSIONS } from './questions'
import { averageScore, normalizeScore, rankDimensions, type Normalized } from './scoring'
import { getVerdict } from './verdict'

const all = (v: number) => Object.fromEntries(DIMENSIONS.map((k) => [k, v])) as Normalized

describe('normalizeScore', () => {
  it('maps 0-4 onto 0-100', () => {
    expect(normalizeScore(0)).toBe(0)
    expect(normalizeScore(1)).toBe(25)
    expect(normalizeScore(2.6)).toBeCloseTo(65)
    expect(normalizeScore(4)).toBe(100)
  })
  it('clamps out-of-range and non-finite values', () => {
    expect(normalizeScore(-1)).toBe(0)
    expect(normalizeScore(5)).toBe(100)
    expect(normalizeScore(Number.NaN)).toBe(0)
  })
})

describe('averageScore', () => {
  it('returns the value when all questions agree', () => {
    expect(averageScore(all(62))).toBe(62)
  })
  it('counts Problem and Money double', () => {
    const v = all(0)
    v.problem = 100
    v.money = 100
    expect(averageScore(v)).toBe(40) // (200 + 200) / 10
    const w = all(0)
    w.shareable = 100
    expect(averageScore(w)).toBe(10) // 100 / 10
  })
  it('rounds to the nearest integer', () => {
    const v = all(60)
    v.customer = 65 // 605 / 10 = 60.5
    expect(averageScore(v)).toBe(61)
  })
})

describe('getVerdict', () => {
  it.each([
    [0, 'KILL'],
    [49, 'KILL'],
    [50, 'FIX'],
    [64, 'FIX'],
    [65, 'SHIP'],
    [100, 'SHIP'],
  ])('%i → %s', (score, verdict) => {
    expect(getVerdict(score)).toBe(verdict)
  })
})

describe('rankDimensions', () => {
  it('sorts strongest first and keeps order on ties', () => {
    expect(rankDimensions({ a: 10, b: 90, c: 10 })).toEqual(['b', 'a', 'c'])
  })
})
