// Fixed copy. No generated prose anywhere.
// BEST SIGNAL uses the highest-scoring dimension, BIGGEST RISK the lowest.
import type { DimensionKey } from './questions'

export const strengthCopy: Record<DimensionKey, string> = {
  problem: 'People really feel this problem.',
  customer: 'You know exactly who this is for.',
  demand: 'People already try to solve this today.',
  money: 'The money part is obvious.',
  reach: 'You know where your users hang out.',
  different: "It doesn't look like everything else.",
  buildable: 'You could ship a first version this week.',
  shareable: 'Using it is a reason to talk about it.',
}

export const riskCopy: Record<DimensionKey, string> = {
  problem: 'The solution is clearer than the problem.',
  customer: "It's unclear who desperately needs this.",
  demand: 'Nobody is doing this today. You have to create the habit.',
  money: 'Getting users may be easier than getting customers.',
  reach: 'Building it looks easier than finding users.',
  different: 'Makes sense, but so do several alternatives.',
  buildable: 'The MVP may cost too much before you learn anything.',
  shareable: 'Nobody has a reason to tell a friend.',
}

export const LOW_CLARITY_COPY = [
  "Jev isn't very sure what you're building.",
  'Add more detail and try again.',
]

export const dimensionCopy = (kind: 'strength' | 'risk', key: string) =>
  (kind === 'strength' ? strengthCopy : riskCopy)[key as DimensionKey] ?? ''
