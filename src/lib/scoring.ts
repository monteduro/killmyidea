import { DIMENSIONS, type DimensionKey } from './questions.js'

/** Problem and Money count double: they are what usually kills an idea. Everything else counts once. */
export const WEIGHTS: Record<DimensionKey, number> = {
  problem: 2,
  customer: 1,
  demand: 1,
  money: 2,
  reach: 1,
  different: 1,
  buildable: 1,
  shareable: 1,
}

/** Highest level of every Score rubric (five levels: 0-4). */
export const MAX_LEVEL = 4

/** Below this `is_understandable` probability the UI asks for more detail. It does not change the score. */
export const LOW_CLARITY_WARNING = 0.3

export type Normalized = Record<DimensionKey, number>

/** 0-4 Jev score → 0-100. */
export function normalizeScore(raw: number, maxLevel = MAX_LEVEL): number {
  if (!Number.isFinite(raw)) return 0
  return Math.min(100, Math.max(0, (raw / maxLevel) * 100))
}

/** The score: weighted average of all questions, rounded. */
export function averageScore(values: Normalized, weights = WEIGHTS): number {
  let sum = 0
  let total = 0
  for (const k of DIMENSIONS) {
    sum += values[k] * weights[k]
    total += weights[k]
  }
  return Math.round(sum / total)
}

/** Dimensions sorted from strongest to weakest. Ties keep question order. */
export function rankDimensions(values: Partial<Record<string, number>>): string[] {
  return Object.keys(values).sort((a, b) => (values[b] ?? 0) - (values[a] ?? 0))
}
