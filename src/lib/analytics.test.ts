import { afterEach, describe, expect, it, vi } from 'vitest'
import { trackIdeaSubmitted } from './analytics'

afterEach(() => vi.unstubAllGlobals())

describe('trackIdeaSubmitted', () => {
  it('only sends the idea_submitted goal with non-sensitive params', () => {
    const datafast = vi.fn()
    vi.stubGlobal('window', { datafast })
    trackIdeaSubmitted({ length: 42, saved: false, archived: true })
    expect(datafast).toHaveBeenCalledWith('idea_submitted', {
      length: '42',
      saved: 'false',
      archived: 'true',
    })
  })

  it('does nothing when DataFast is not loaded and never throws', () => {
    vi.stubGlobal('window', {})
    expect(() => trackIdeaSubmitted({ length: 42, saved: false, archived: true })).not.toThrow()
    vi.stubGlobal('window', { datafast: () => { throw new Error('boom') } })
    expect(() => trackIdeaSubmitted({ length: 42, saved: false, archived: true })).not.toThrow()
  })
})
