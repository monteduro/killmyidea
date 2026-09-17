// Server-side pipeline: validate → ask Jev → 0-100 per question → average → verdict.
import { CATEGORIES, DECISION_COUNT, DEFAULT_GOAL, dimensionsFor, isGoal, type Goal } from './questions.js'
import { averageScore, normalizeScore } from './scoring.js'
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

/** Missing goal means the default; anything else must be a known goal. */
export function validateGoal(input: unknown): { ok: true; goal: Goal } | { ok: false; error: string } {
  if (input == null) return { ok: true, goal: DEFAULT_GOAL }
  return isGoal(input) ? { ok: true, goal: input } : { ok: false, error: 'Unknown goal.' }
}

/** The state Jev sees. Questions reference `startup_idea`. */
export const buildState = (idea: string) => ({ startup_idea: idea })

export function composeEvaluation(
  response: SystemOneResponse,
  latencyMs: number,
  mock = false,
  goal: Goal = DEFAULT_GOAL,
): Evaluation {
  const { answers } = response
  const keys = dimensionsFor(goal)

  const scores = Object.fromEntries(keys.map((k) => [k, readScore(answers, k)])) as Record<
    string,
    ReturnType<typeof readScore>
  >
  const dimensions = Object.fromEntries(keys.map((k) => [k, Math.round(normalizeScore(scores[k].score))]))
  const category = readChoice(answers, 'category', CATEGORIES, 'Other')
  const understandable = readNoul(answers, 'is_understandable')
  const score = averageScore(dimensions, keys)

  return {
    score,
    verdict: getVerdict(score),
    goal,
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
      dimensions: keys.map((k) => ({
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
