// Local UI development only (TYPESAFE_MOCK=1, never on Vercel).
// Deterministic fake answers derived from the idea text. Not Jev.
import { CATEGORIES, DEFAULT_GOAL, dimensionsFor, questionsFor, type Goal } from '../src/lib/questions.js'
import type { Answer, SystemOneResponse } from '../src/lib/typesafe.js'

function rng(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

function choice(options: readonly string[], rand: () => number): Answer {
  const weights = options.map(() => rand() ** 3)
  const total = weights.reduce((a, b) => a + b, 0)
  const probabilities = Object.fromEntries(options.map((o, i) => [o, weights[i] / total]))
  const best = options[weights.indexOf(Math.max(...weights))]
  return { type: 'choice', choice: best, probabilities, confidence: Math.max(...weights) / total }
}

export async function mockJev(
  idea: string,
  goal: Goal = DEFAULT_GOAL,
): Promise<{ response: SystemOneResponse; latencyMs: number }> {
  const started = performance.now()
  const rand = rng(idea)
  const questions = questionsFor(goal)
  const answers: Record<string, Answer> = {}
  for (const k of dimensionsFor(goal)) {
    const peak = rand() * 4
    const lo = Math.floor(peak)
    const frac = peak - lo
    const probabilities: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0 }
    probabilities[String(lo)] = 1 - frac
    if (lo < 4) probabilities[String(lo + 1)] = frac
    const q = questions[k]
    answers[k] = {
      type: 'score',
      score: peak,
      probabilities,
      confidence: Math.abs(frac - 0.5) * 2,
      legend: Object.fromEntries((q.type === 'score' ? q.criteria : []).map((c, i) => [String(i), c])),
    }
  }
  answers.category = choice(CATEGORIES, rand)
  answers.is_understandable = { type: 'noul', noul: idea.length < 40 ? 0.2 : 0.6 + rand() * 0.4 }
  await new Promise((r) => setTimeout(r, 80 + rand() * 120))
  return {
    response: { model: 'mock', answers, usage: { input_tokens: 0, output_tokens: 0 } },
    latencyMs: Math.round(performance.now() - started),
  }
}
