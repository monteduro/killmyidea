import { useEffect } from 'react'
import { LOW_CLARITY_WARNING } from '../lib/scoring'
import type { SavedIdea } from '../lib/storage'
import { verdictBg } from '../lib/ui'

type Props = {
  open: boolean
  items: SavedIdea[]
  onClose: () => void
  onOpen: (item: SavedIdea) => void
  onDelete: (id: string) => void
  onClear: () => void
}

export function HistoryDrawer({ open, items, onClose, onOpen, onDelete, onClear }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Close history" onClick={onClose} className="absolute inset-0 cursor-default bg-ink/60" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="History"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l-2 border-ink bg-paper text-ink"
      >
        <div className="flex items-center justify-between border-b-2 border-ink px-5 py-4">
          <h2 className="text-2xl font-black uppercase tracking-tight">History</h2>
          <button onClick={onClose} className="cursor-pointer font-mono text-xs uppercase tracking-widest hover:underline">
            Close ✕
          </button>
        </div>

        {items.length === 0 ? (
          <p className="px-5 py-8 font-mono text-xs leading-relaxed opacity-60">
            Nothing saved. Tick "Save my idea to my history" before judging. Everything stays in this browser.
          </p>
        ) : (
          <ul className="flex-1 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="group flex items-stretch border-b border-ink/20">
                <button
                  onClick={() => onOpen(item)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-5 py-3 text-left hover:bg-ink/5"
                >
                  {item.needsDetail || (item.understandable != null && item.understandable < LOW_CLARITY_WARNING) ? (
                    <span className="w-[5.25rem] shrink-0 bg-fix py-0.5 text-center font-mono text-[10px] font-bold tracking-widest">
                      DETAIL
                    </span>
                  ) : (
                    <>
                      <span className="w-9 shrink-0 text-2xl font-black tabular-nums">{item.score}</span>
                      <span
                        className={`w-12 shrink-0 py-0.5 text-center font-mono text-[10px] font-bold tracking-widest ${verdictBg[item.verdict]}`}
                      >
                        {item.verdict}
                      </span>
                    </>
                  )}
                  <span className="min-w-0 truncate text-sm">{item.idea}</span>
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  aria-label="Delete idea"
                  className="cursor-pointer px-4 font-mono text-sm opacity-40 hover:bg-kill hover:opacity-100"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto border-t-2 border-ink px-5 py-4">
          {items.length > 0 && (
            <button
              onClick={() => window.confirm('Delete all saved ideas from this browser?') && onClear()}
              className="cursor-pointer font-mono text-xs uppercase tracking-widest text-kill hover:underline"
            >
              Clear all history
            </button>
          )}
          <p className="mt-2 font-mono text-[10px] opacity-50">Stored only in this browser (localStorage).</p>
        </div>
      </aside>
    </div>
  )
}
