// Idea history. v1 keeps everything in localStorage; swap `ideaStore` for a
// Supabase/API implementation of IdeaStore later without touching the UI.
import type { Goal } from './questions'
import type { ResultModel } from './types'
import type { Verdict } from './verdict'

export type SavedIdea = {
  id: string
  idea: string
  createdAt: string
  score: number
  verdict: Verdict
  needsDetail?: boolean
  scoringVersion?: number
  goal?: Goal
  dimensions: Record<string, number>
  category: string
  understandable?: number
  decisions?: number
  latencyMs?: number
}

export interface IdeaStore {
  list(): Promise<SavedIdea[]>
  save(idea: SavedIdea): Promise<void>
  remove(id: string): Promise<void>
  clear(): Promise<void>
}

export const STORAGE_KEY = 'killmyidea:history:v1'
const MAX_ITEMS = 100
const VERDICTS: Verdict[] = ['KILL', 'FIX', 'SHIP']

export function toSavedIdea(idea: string, result: ResultModel, now = new Date()): SavedIdea {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${now.getTime()}-${Math.random()}`,
    idea,
    createdAt: now.toISOString(),
    score: result.score,
    verdict: result.verdict,
    needsDetail: result.needsDetail,
    scoringVersion: result.scoringVersion,
    goal: result.goal,
    dimensions: { ...result.dimensions },
    category: result.category,
    understandable: result.understandable,
    decisions: result.decisions,
    latencyMs: result.latencyMs,
  }
}

function isSavedIdea(v: unknown): v is SavedIdea {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.idea === 'string' &&
    typeof o.createdAt === 'string' &&
    typeof o.score === 'number' &&
    VERDICTS.includes(o.verdict as Verdict) &&
    !!o.dimensions &&
    typeof o.dimensions === 'object' &&
    typeof o.category === 'string'
  )
}

export const serializeIdeas = (ideas: SavedIdea[]) => JSON.stringify({ version: 1, ideas })

/** Tolerates missing/corrupt data: returns only valid entries. */
export function deserializeIdeas(raw: string | null): SavedIdea[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    const list: unknown = Array.isArray(parsed) ? parsed : parsed?.ideas
    return Array.isArray(list) ? list.filter(isSavedIdea) : []
  } catch {
    return []
  }
}

export function localIdeaStore(storage: Storage): IdeaStore {
  const read = () => deserializeIdeas(storage.getItem(STORAGE_KEY))
  const write = (ideas: SavedIdea[]) => storage.setItem(STORAGE_KEY, serializeIdeas(ideas.slice(0, MAX_ITEMS)))
  return {
    async list() {
      return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async save(idea) {
      write([idea, ...read().filter((i) => i.id !== idea.id)])
    },
    async remove(id) {
      write(read().filter((i) => i.id !== id))
    },
    async clear() {
      storage.removeItem(STORAGE_KEY)
    },
  }
}

export const ideaStore: IdeaStore = localIdeaStore(
  typeof window !== 'undefined' ? window.localStorage : (undefined as unknown as Storage),
)
