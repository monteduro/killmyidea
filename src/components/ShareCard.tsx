import { forwardRef } from 'react'
import { SITE_HOST } from '../lib/features'
import { DECISION_COUNT } from '../lib/questions'
import { bestAndWorst, cardIdea } from '../lib/share'
import type { ResultModel } from '../lib/types'
import { verdictBg } from '../lib/ui'
import { verdictLabel } from '../lib/verdict'

/** 1200×630 card. Sized in container units so it scales and exports cleanly. */
export const ShareCard = forwardRef<HTMLDivElement, { result: ResultModel; idea?: string }>(function ShareCard(
  { result, idea },
  ref,
) {
  const { best, worst } = bestAndWorst(result)
  const quote = idea ? cardIdea(idea) : null
  return (
    <div className="@container w-full">
      <div
        ref={ref}
        className="relative flex aspect-[1200/630] w-full flex-col justify-between overflow-hidden bg-paper p-[4cqw] text-ink"
      >
        <div className="flex items-start justify-between">
          <span className="block text-[3.4cqw] font-black uppercase leading-[0.82] tracking-[-0.04em]">
            Kill
            <br />
            My
            <br />
            Idea
          </span>
          <span className="text-right font-mono uppercase leading-snug tracking-widest">
            <span className="block bg-ink px-[1cqw] py-[0.4cqw] text-[1.6cqw] font-bold text-paper">Judged by Jev</span>
            <span className="mt-[0.6cqw] block text-[1.3cqw] opacity-60">
              TypeSafe AI
              {result.latencyMs != null && (
                <>
                  <br />
                  {result.decisions ?? DECISION_COUNT} decisions · {result.latencyMs}ms
                </>
              )}
            </span>
          </span>
        </div>

        {quote && (
          <p
            className={`line-clamp-3 border-l-[0.5cqw] border-ink pl-[1.6cqw] font-semibold leading-[1.12] tracking-tight ${
              quote.length > 90 ? 'text-[2.5cqw]' : 'text-[3.3cqw]'
            }`}
          >
            “{quote}”
          </p>
        )}

        <div className="flex items-end justify-between gap-[4cqw]">
          <div className="min-w-0">
            <div
              className={`font-black leading-[0.74] tracking-[-0.07em] tabular-nums ${quote ? 'text-[18cqw]' : 'text-[25cqw]'}`}
            >
              {result.score}
            </div>
            <div
              className={`mt-[2cqw] inline-block px-[1.4cqw] pb-[0.5cqw] pt-[0.3cqw] ${quote ? 'text-[6cqw]' : 'text-[7.4cqw]'} font-black uppercase leading-none tracking-[-0.04em] ${verdictBg[result.verdict]}`}
            >
              {verdictLabel(result.verdict)}
            </div>
          </div>

          <dl className="w-[38%] shrink-0 border-t-[0.3cqw] border-ink pb-[0.5cqw] font-mono uppercase">
            <CardStat term="Best" label={best.label} value={best.value} />
            <CardStat term="Worst" label={worst.label} value={worst.value} />
          </dl>
        </div>

        <div className="flex items-end justify-between font-mono text-[1.6cqw] tracking-wider">
          <span>jev made the call.</span>
          <span className="font-bold">{SITE_HOST}</span>
        </div>
      </div>
    </div>
  )
})

function CardStat({ term, label, value }: { term: string; label: string; value: number }) {
  return (
    <div className="border-b-[0.3cqw] border-ink py-[1.2cqw]">
      <dt className="text-[1.3cqw] tracking-widest opacity-60">{term}</dt>
      <dd className="flex items-baseline justify-between gap-[1cqw] font-sans text-[3.1cqw] font-black leading-none tracking-tight">
        <span className="truncate">{label}</span>
        <span className="tabular-nums">{value}</span>
      </dd>
    </div>
  )
}
