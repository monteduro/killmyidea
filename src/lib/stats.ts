import type { Verdict } from './verdict'

export type Stats = { count: number; verdicts: Record<Verdict, number> }

/** Browser HTTP cache (max-age=300) keeps this to one request per 5 minutes. */
export async function fetchStats(): Promise<Stats | null> {
  try {
    const res = await fetch('/api/stats')
    if (!res.ok) return null
    const data = (await res.json()) as Stats
    return typeof data?.count === 'number' ? data : null
  } catch {
    return null
  }
}
