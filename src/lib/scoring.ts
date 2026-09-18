import { dimensionsFor, type DimensionKey } from './questions.js'

/**
 * Problem and Money count double: they are what usually kills an idea. Everything else counts once.
 * Adoption and Fun take Money's place for other goals, so they count double too.
 */
export const WEIGHTS: Record<DimensionKey, number> = {
  problem: 2,
  appeal: 2,
  customer: 1,
  demand: 1,
  money: 2,
  reach: 1,
  different: 1,
  buildable: 1,
  shareable: 1,
  adoption: 2,
  fun: 2,
}

/** Increment whenever questions, weights, thresholds or gating semantics change. */
export const SCORING_VERSION = 2

/** Highest level of every Score rubric (five levels: 0-4). */
export const MAX_LEVEL = 4

/** Below this `is_understandable` probability the UI asks for more detail. It does not change the score. */
export const LOW_CLARITY_WARNING = 0.3

export type Normalized = Partial<Record<DimensionKey, number>>

/** 0-4 Jev score → 0-100. */
export function normalizeScore(raw: number, maxLevel = MAX_LEVEL): number {
  if (!Number.isFinite(raw)) return 0
  return Math.min(100, Math.max(0, (raw / maxLevel) * 100))
}

/** Sum of weights for a set of questions (10 for every goal). */
export const totalWeight = (keys: readonly DimensionKey[] = dimensionsFor(), weights = WEIGHTS) =>
  keys.reduce((sum, k) => sum + weights[k], 0)

/** The score: weighted average of the given questions, rounded. */
export function averageScore(values: Normalized, keys: readonly DimensionKey[] = dimensionsFor(), weights = WEIGHTS): number {
  let sum = 0
  let total = 0
  for (const k of keys) {
    sum += (values[k] ?? 0) * weights[k]
    total += weights[k]
  }
  return Math.round(sum / total)
}

/** Dimensions sorted from strongest to weakest. Ties keep question order. */
export function rankDimensions(values: Partial<Record<string, number>>): string[] {
  return Object.keys(values).sort((a, b) => (values[b] ?? 0) - (values[a] ?? 0))
}
