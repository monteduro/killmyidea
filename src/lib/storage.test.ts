import { describe, expect, it } from 'vitest'
import { STORAGE_KEY, deserializeIdeas, localIdeaStore, serializeIdeas, toSavedIdea, type SavedIdea } from './storage'

const result = {
  score: 74,
  verdict: 'SHIP' as const,
  needsDetail: false,
  scoringVersion: 2,
  goal: 'money' as const,
  dimensions: { problem: 91, different: 43 },
  category: 'Consumer',
  latencyMs: 143,
}

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  }
}

describe('serialization', () => {
  it('round-trips saved ideas', () => {
    const saved = toSavedIdea('Instagram digest by email', result, new Date('2026-09-17T10:00:00Z'))
    const back = deserializeIdeas(serializeIdeas([saved]))
    expect(back).toEqual([saved])
    expect(back[0].createdAt).toBe('2026-09-17T10:00:00.000Z')
    expect(back[0]).toMatchObject({ needsDetail: false, scoringVersion: 2, goal: 'money' })
  })
  it('ignores corrupt data and invalid entries', () => {
    expect(deserializeIdeas(null)).toEqual([])
    expect(deserializeIdeas('{not json')).toEqual([])
    const good = toSavedIdea('x'.repeat(20), result)
    const bad = { ...good, verdict: 'MAYBE' } as unknown as SavedIdea
    expect(deserializeIdeas(serializeIdeas([good, bad]))).toEqual([good])
  })
})

describe('localIdeaStore', () => {
  it('saves, lists newest first, removes and clears', async () => {
    const storage = memoryStorage()
    const store = localIdeaStore(storage)
    const a = toSavedIdea('first idea here', result, new Date('2026-01-01'))
    const b = toSavedIdea('second idea here', result, new Date('2026-02-01'))
    await store.save(a)
    await store.save(b)
    expect((await store.list()).map((i) => i.id)).toEqual([b.id, a.id])
    await store.remove(b.id)
    expect((await store.list()).map((i) => i.id)).toEqual([a.id])
    await store.clear()
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })
})
