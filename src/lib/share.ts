import { DEFAULT_GOAL, DIMENSION_LABELS, GOAL_LABELS } from './questions'
import { rankDimensions } from './scoring'
import { SITE_URL } from './features'
import type { ResultModel } from './types'
import { verdictLabel } from './verdict'

// Falls back to a readable key for ideas saved with older questions.
export const dimensionLabel = (key: string) =>
  DIMENSION_LABELS[key as keyof typeof DIMENSION_LABELS] ?? key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

/** Label for non-default goals, so a score judged without Money says so wherever it's shown. */
export const goalTag = (result: ResultModel): string | null =>
  result.goal && result.goal !== DEFAULT_GOAL ? GOAL_LABELS[result.goal] : null

export function bestAndWorst(result: ResultModel) {
  const ranked = rankDimensions(result.dimensions)
  const best = ranked[0]
  const worst = ranked[ranked.length - 1]
  return {
    best: { key: best, label: dimensionLabel(best), value: result.dimensions[best] },
    worst: { key: worst, label: dimensionLabel(worst), value: result.dimensions[worst] },
  }
}

export const CARD_IDEA_MAX = 150

/** Shortens at a word boundary so the quote fits in two or three lines. */
export function cardIdea(idea: string, max = CARD_IDEA_MAX): string {
  const flat = idea.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  return `${cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : max).replace(/[\s.,;:!?-]+$/, '')}…`
}

export function shareText(result: ResultModel): string {
  const { best, worst } = bestAndWorst(result)
  const speed = result.latencyMs != null ? ` in ${result.latencyMs}ms` : ''
  const goal = goalTag(result)
  return [
    result.verdict === 'KILL' ? `I let an AI kill my startup idea${speed}.` : `I let an AI judge my startup idea${speed}.`,
    '',
    goal ? `${result.score}/100 · ${goal}` : `${result.score}/100`,
    verdictLabel(result.verdict),
    '',
    `Best: ${best.label}`,
    `Worst: ${worst.label}`,
    '',
    'Judged by Jev (TypeSafe AI).',
    'Try yours:',
  ].join('\n')
}

/** Full copy for X, including the evaluated idea exactly as entered. */
export function xShareText(result: ResultModel, idea: string): string {
  return [shareText(result), '', `Idea: “${idea.trim()}”`].join('\n')
}

export function xIntentUrl(result: ResultModel, idea: string): string {
  const params = new URLSearchParams({ text: xShareText(result, idea), url: SITE_URL })
  return `https://x.com/intent/post?${params}`
}

export const clipboardText = (result: ResultModel) => `${shareText(result)}\n${SITE_URL}`
