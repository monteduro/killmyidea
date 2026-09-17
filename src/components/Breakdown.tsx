import { useEffect, useState } from 'react'
import { dimensionsFor, type Goal } from '../lib/questions'
import { rankDimensions } from '../lib/scoring'
import { dimensionLabel } from '../lib/share'

export function Breakdown({ dimensions, goal }: { dimensions: Record<string, number>; goal?: Goal }) {
  const [grown, setGrown] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(r)
  }, [])

  const ranked = rankDimensions(dimensions)
  const top = new Set(ranked.slice(0, 3))
  const bottom = new Set(ranked.slice(-3))
  const order: string[] = dimensionsFor(goal)
  const keys = [...order.filter((k) => k in dimensions), ...Object.keys(dimensions).filter((k) => !order.includes(k))]

  return (
    <ul className="space-y-2.5">
      {keys.map((k) => {
        const v = dimensions[k]
        const tone = top.has(k) ? 'top' : bottom.has(k) ? 'bottom' : 'mid'
        return (
          <li key={k} className="grid grid-cols-[8.75rem_1fr_2rem] items-center gap-2.5 sm:grid-cols-[10rem_1fr_2.5rem] sm:gap-3">
            <span
              className={`truncate font-mono text-[11px] uppercase tracking-wider sm:text-xs ${tone === 'mid' ? 'opacity-55' : 'font-bold'}`}
            >
              {tone === 'top' && <span className="text-ship">▲ </span>}
              {tone === 'bottom' && <span className="text-kill">▼ </span>}
              {dimensionLabel(k)}
            </span>
            <span className="h-3 bg-paper/10">
              <span
                className={`block h-full transition-[width] duration-700 ease-out ${
                  tone === 'top' ? 'bg-paper' : tone === 'bottom' ? 'bg-kill' : 'bg-paper/35'
                }`}
                style={{ width: grown ? `${v}%` : '0%' }}
              />
            </span>
            <span className={`text-right font-mono text-sm tabular-nums ${tone === 'mid' ? 'opacity-55' : 'font-bold'}`}>
              {v}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
