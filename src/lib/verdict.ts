export type Verdict = 'KILL' | 'FIX' | 'SHIP'

/** score < 50 → KILL · 50-64 → FIX · 65+ → SHIP */
export const VERDICT_THRESHOLDS = { fix: 50, ship: 65 } as const

export function getVerdict(score: number): Verdict {
  if (score >= VERDICT_THRESHOLDS.ship) return 'SHIP'
  if (score >= VERDICT_THRESHOLDS.fix) return 'FIX'
  return 'KILL'
}

export const verdictLabel = (v: Verdict) => `${v} IT`
