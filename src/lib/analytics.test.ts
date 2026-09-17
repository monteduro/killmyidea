import { afterEach, describe, expect, it, vi } from 'vitest'
import { resultParams, track } from './analytics'

const result = {
  score: 42,
  verdict: 'KILL' as const,
  dimensions: { problem: 34, money: 19, buildable: 77 },
  category: 'Consumer',
}

afterEach(() => vi.unstubAllGlobals())

describe('track', () => {
  it('sends string params, drops undefined, caps at 10 params and 255 chars', () => {
    const datafast = vi.fn()
    vi.stubGlobal('window', { datafast })
    const many = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`p${i}`, i]))
    track('idea_judged', { a: 'x'.repeat(300), skip: undefined, ...many })
    const [goal, params] = datafast.mock.calls[0]
    expect(goal).toBe('idea_judged')
    expect(Object.keys(params)).toHaveLength(10)
    expect(params.a).toHaveLength(255)
    expect('skip' in params).toBe(false)
    expect(params.p0).toBe('0')
  })

  it('does nothing when DataFast is not loaded and never throws', () => {
    vi.stubGlobal('window', {})
    expect(() => track('x')).not.toThrow()
    vi.stubGlobal('window', { datafast: () => { throw new Error('boom') } })
    expect(() => track('x')).not.toThrow()
  })
})

describe('resultParams', () => {
  it('describes the result without the idea text', () => {
    expect(resultParams({ ...result, idea: 'secret idea' } as never)).toEqual({
      verdict: 'kill',
      score: 42,
      category: 'Consumer',
      best: 'buildable',
      worst: 'money',
    })
  })
})
