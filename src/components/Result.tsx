import { useRef, useState } from 'react'
import { LOW_CLARITY_COPY, dimensionCopy } from '../lib/copy'
import { DECISION_COUNT, DIMENSION_HINTS, DIMENSION_LABELS, DIMENSIONS } from '../lib/questions'
import { LOW_CLARITY_WARNING, WEIGHTS } from '../lib/scoring'
import { bestAndWorst } from '../lib/share'
import type { Evaluation, ResultModel } from '../lib/types'
import { verdictText } from '../lib/ui'
import { VERDICT_THRESHOLDS, verdictLabel } from '../lib/verdict'
import { Breakdown } from './Breakdown'
import { DebugPanel } from './DebugPanel'
import { ShareActions } from './ShareActions'
import { ShareCard } from './ShareCard'

type Props = {
  result: ResultModel
  idea: string
  saved: boolean
  debug: boolean
  onAgain: () => void
}

export function Result({ result, idea, saved, debug, onAgain }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const unclear = result.understandable != null && result.understandable < LOW_CLARITY_WARNING
  const evaluation = 'debug' in result ? (result as Evaluation) : null
  const { best, worst } = bestAndWorst(result)
  const [ideaOnCard, setIdeaOnCard] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const long = idea.length > 220

  return (
    <article className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
      <section className="animate-rise border-l-4 border-paper pl-4 sm:pl-6">
        <p className="font-mono text-[11px] uppercase tracking-widest opacity-60">
          The idea · {result.category} {saved && <span>· saved to history</span>}
        </p>
        <p
          className={`mt-2 max-w-4xl whitespace-pre-line text-2xl font-semibold leading-tight tracking-tight sm:text-3xl ${
            long && !expanded ? 'line-clamp-4' : ''
          }`}
        >
          “{idea}”
        </p>
        {long && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 cursor-pointer font-mono text-[11px] uppercase tracking-widest opacity-60 hover:opacity-100"
          >
            {expanded ? 'Show less' : 'Show all'}
          </button>
        )}
      </section>

      <h1 className="animate-rise mt-10 sm:mt-12">
        <span className="block text-[clamp(9rem,46vw,22rem)] font-black leading-[0.76] tracking-[-0.07em] tabular-nums">
          {result.score}
        </span>
        <span
          className={`mt-3 block text-[clamp(4.25rem,20vw,10rem)] font-black uppercase leading-[0.82] tracking-[-0.05em] ${verdictText[result.verdict]}`}
        >
          {verdictLabel(result.verdict)}
        </span>
      </h1>

      {result.latencyMs != null && (
        <p className="mt-6 font-mono text-sm sm:text-base">
          Jev made {result.decisions ?? DECISION_COUNT} decisions in <span className="font-bold">{result.latencyMs}ms</span>.
        </p>
      )}

      {unclear && (
        <p role="status" className="mt-6 border-2 border-fix px-4 py-3 font-mono text-sm text-fix">
          {LOW_CLARITY_COPY[0]}
          <br />
          {LOW_CLARITY_COPY[1]}
        </p>
      )}

      <div className="mt-12 grid gap-12 border-t-2 border-paper pt-8 md:grid-cols-[1.35fr_1fr]">
        <section>
          <h2 className="mb-5 font-mono text-[11px] uppercase tracking-widest opacity-60">Breakdown / 100</h2>
          <Breakdown dimensions={result.dimensions} />
          <Legend />
        </section>

        <section className="space-y-8">
          <Signal title="Best signal" tag={`${best.label} ${best.value}`} tone="text-ship">
            {dimensionCopy('strength', best.key)}
          </Signal>
          <Signal title="Biggest risk" tag={`${worst.label} ${worst.value}`} tone="text-kill">
            {dimensionCopy('risk', worst.key)}
          </Signal>
        </section>
      </div>

      <section className="mt-14 border-t-2 border-paper pt-8">
        <h2 className="mb-5 font-mono text-[11px] uppercase tracking-widest opacity-60">Share the verdict</h2>
        <div className="border-2 border-paper">
          <ShareCard ref={cardRef} result={result} idea={ideaOnCard ? idea : undefined} />
        </div>
        <label className="mt-3 flex cursor-pointer select-none items-center gap-2 font-mono text-[11px] uppercase tracking-widest">
          <input type="checkbox" checked={ideaOnCard} onChange={(e) => setIdeaOnCard(e.target.checked)} className="accent-paper" />
          Show my idea on the card
        </label>
        <div className="mt-3">
          <ShareActions result={result} idea={idea} cardRef={cardRef} />
        </div>
      </section>

      <section className="mt-14 border-t-2 border-paper pt-8">
        <button
          onClick={onAgain}
          className="w-full cursor-pointer bg-paper px-6 py-5 text-2xl font-black uppercase tracking-tight text-ink transition-colors hover:bg-kill sm:w-auto"
        >
          Kill another idea
        </button>
      </section>

      {evaluation ? (
        <DebugPanel evaluation={evaluation} defaultOpen={debug} />
      ) : (
        <p className="mt-10 font-mono text-[11px] uppercase tracking-widest opacity-40">
          Raw Jev data isn't kept in history.
        </p>
      )}
    </article>
  )
}

function Legend() {
  const weight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)
  return (
    <div className="mt-8 border-t border-paper/20 pt-5">
      <h3 className="font-mono text-[11px] uppercase tracking-widest opacity-60">What these mean</h3>
      <dl className="mt-4 space-y-2.5">
        {DIMENSIONS.map((k) => (
          <div key={k} className="grid grid-cols-[8.75rem_1fr] gap-2.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
            <dt className="font-mono text-[11px] uppercase tracking-wider opacity-60 sm:text-xs">
              {DIMENSION_LABELS[k]}
              {WEIGHTS[k] > 1 && <span className="ml-1 text-fix">×{WEIGHTS[k]}</span>}
            </dt>
            <dd className="text-sm leading-snug opacity-80">{DIMENSION_HINTS[k]}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 font-mono text-[11px] leading-relaxed opacity-60">
        Jev rates each question 0–4, shown as 0–100. The score is their average ({weight} parts: Problem and Money count
        double).
        <br />
        Under {VERDICT_THRESHOLDS.fix} KILL · {VERDICT_THRESHOLDS.fix}–{VERDICT_THRESHOLDS.ship - 1} FIX ·{' '}
        {VERDICT_THRESHOLDS.ship}+ SHIP.
      </p>
    </div>
  )
}

function Signal({ title, tag, tone, children }: { title: string; tag: string; tone: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className={`font-mono text-[11px] font-bold uppercase tracking-widest ${tone}`}>{title}</h3>
      <p className="mt-2 text-3xl font-black leading-[0.95] tracking-tight sm:text-4xl">{children}</p>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-widest opacity-60">{tag}</p>
    </div>
  )
}
