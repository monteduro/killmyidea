import { useEffect } from 'react'
import type { Stats } from '../lib/stats'
import { verdictBg } from '../lib/ui'
import { VERDICT_THRESHOLDS, type Verdict } from '../lib/verdict'

const ORDER: Verdict[] = ['SHIP', 'FIX', 'KILL']

export function StatsModal({ open, stats, onClose }: { open: boolean; stats: Stats | null; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const total = stats?.count ?? 0

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-5">
      <button aria-label="Close verdict breakdown" onClick={onClose} className="absolute inset-0 cursor-default bg-ink/60" />
      <div role="dialog" aria-modal="true" aria-label="Verdict breakdown" className="relative w-full max-w-sm border-2 border-ink bg-paper text-ink">
        <div className="flex items-center justify-between border-b-2 border-ink px-5 py-4">
          <h2 className="text-2xl font-black uppercase tracking-tight">Verdicts</h2>
          <button onClick={onClose} className="cursor-pointer font-mono text-xs uppercase tracking-widest hover:underline">
            Close ✕
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="font-mono text-[11px] uppercase tracking-widest opacity-60">
            {total.toLocaleString('en-US')} ideas analyzed, all time
          </p>

          {stats && total > 0 && (
            <ul className="mt-5 space-y-4">
              {ORDER.map((v) => {
                const n = stats.verdicts[v] ?? 0
                const pct = Math.round((n / total) * 100)
                return (
                  <li key={v}>
                    <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest">
                      <span className="flex items-center gap-2">
                        <span aria-hidden className={`inline-block size-3 border border-ink ${verdictBg[v]}`} />
                        {v}
                      </span>
                      <span className="tabular-nums">
                        {pct}% · {n.toLocaleString('en-US')}
                      </span>
                    </div>
                    <div aria-hidden className="mt-1.5 h-2 border border-ink">
                      <div className={`h-full ${verdictBg[v]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <p className="mt-5 font-mono text-[10px] leading-relaxed opacity-50">
            Archived evaluations, cached for 5 minutes. Under {VERDICT_THRESHOLDS.fix} KILL · {VERDICT_THRESHOLDS.fix}–
            {VERDICT_THRESHOLDS.ship - 1} FIX · {VERDICT_THRESHOLDS.ship}+ SHIP.
          </p>
        </div>
      </div>
    </div>
  )
}
