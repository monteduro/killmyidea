// Server-side pipeline: validate → ask Jev → 0-100 per question → average → verdict.
import { CATEGORIES, DECISION_COUNT, DIMENSIONS, type DimensionKey } from './questions.js'
import { averageScore, normalizeScore, type Normalized } from './scoring.js'
import { readChoice, readNoul, readScore, type SystemOneResponse } from './typesafe.js'
import type { Evaluation } from './types.js'
import { getVerdict } from './verdict.js'

export const IDEA_MIN = 20
export const IDEA_MAX = 5000

export function validateIdea(input: unknown): { ok: true; idea: string } | { ok: false; error: string } {
  if (typeof input !== 'string') return { ok: false, error: 'Describe your idea.' }
  const idea = input.trim()
  if (idea.length < IDEA_MIN) return { ok: false, error: `At least ${IDEA_MIN} characters.` }
  if (idea.length > IDEA_MAX) return { ok: false, error: `At most ${IDEA_MAX} characters.` }
  return { ok: true, idea }
}

/** The state Jev sees. Questions reference `startup_idea`. */
export const buildState = (idea: string) => ({ startup_idea: idea })

export function composeEvaluation(response: SystemOneResponse, latencyMs: number, mock = false): Evaluation {
  const { answers } = response

  const scores = Object.fromEntries(DIMENSIONS.map((k) => [k, readScore(answers, k)])) as Record<
    DimensionKey,
    ReturnType<typeof readScore>
  >
  const dimensions = Object.fromEntries(
    DIMENSIONS.map((k) => [k, Math.round(normalizeScore(scores[k].score))]),
  ) as Normalized
  const category = readChoice(answers, 'category', CATEGORIES, 'Other')
  const understandable = readNoul(answers, 'is_understandable')
  const score = averageScore(dimensions)

  return {
    score,
    verdict: getVerdict(score),
    dimensions,
    category: category.choice,
    understandable,
    decisions: DECISION_COUNT,
    latencyMs,
    debug: {
      model: response.model,
      latencyMs,
      usage: response.usage,
      mock,
      dimensions: DIMENSIONS.map((k) => ({
        key: k,
        raw: scores[k].score,
        normalized: dimensions[k],
        confidence: scores[k].confidence,
        probabilities: scores[k].probabilities,
      })),
      category: { choice: category.choice, confidence: category.confidence, probabilities: category.probabilities },
      understandable,
      response,
    },
  }
}
