import type { SystemOneResponse } from './typesafe.js'
import type { Verdict } from './verdict.js'

/** Everything the result screen needs. Evaluations and saved ideas both satisfy it. */
export type ResultModel = {
  score: number
  verdict: Verdict
  /** Dimension key → 0-100 */
  dimensions: Record<string, number>
  category: string
  /** Probability from Jev's `is_understandable` Noul. */
  understandable?: number
  decisions?: number
  latencyMs?: number
}

export type DimensionDebug = {
  key: string
  raw: number
  normalized: number
  confidence: number
  probabilities: Record<string, number>
}

export type EvaluationDebug = {
  model: string
  latencyMs: number
  usage?: SystemOneResponse['usage']
  mock: boolean
  dimensions: DimensionDebug[]
  category: { choice: string; confidence: number; probabilities: Record<string, number> }
  understandable: number
  response: SystemOneResponse
}

export type Evaluation = ResultModel & {
  understandable: number
  decisions: number
  latencyMs: number
  debug: EvaluationDebug
}

export type EvaluateRequest = {
  idea: string
  /** Future public dataset consent. Ignored until the dataset exists. */
  datasetOptIn?: boolean
}
