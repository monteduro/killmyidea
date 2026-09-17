// DataFast custom goals (cookieless script, see index.html).
// Never send the idea text: ideas are only stored when the user opts in.
import { bestAndWorst } from './share'
import type { ResultModel } from './types'

type Params = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    datafast?: (goal: string, params?: Record<string, string>) => void
  }
}

/** Goal names: lowercase, digits, `_`, `-`, `:`; max 10 params, values ≤ 255 chars. */
export function track(goal: string, params: Params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .slice(0, 10)
      .map(([k, v]) => [k, String(v).slice(0, 255)]),
  )
  try {
    window.datafast?.(goal, clean)
  } catch {
    // Analytics must never break the app.
  }
}

export function resultParams(result: ResultModel): Params {
  const { best, worst } = bestAndWorst(result)
  return {
    verdict: result.verdict.toLowerCase(),
    score: result.score,
    category: result.category,
    best: best.key,
    worst: worst.key,
  }
}
