import { useEffect, useState } from 'react'
import { DIMENSION_LABELS, DIMENSIONS } from '../lib/questions'

const STEPS = [...DIMENSIONS.map((k) => DIMENSION_LABELS[k]), 'Category', 'Clarity']

export const STEP_MS = 45

export function Judging() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setN((v) => Math.min(v + 1, STEPS.length)), STEP_MS)
    return () => clearInterval(t)
  }, [])

  return (
    <section aria-live="polite" className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
      <p className="text-[clamp(2.5rem,10vw,7rem)] font-black uppercase leading-[0.85] tracking-[-0.04em]">
        Jev is judging you<span className="animate-blink">...</span>
      </p>
      <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-sm uppercase tracking-wider sm:grid-cols-4">
        {STEPS.slice(0, n).map((s) => (
          <li key={s} className="animate-rise">
            {s} <span className="text-ship">✓</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
