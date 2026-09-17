import { DIMENSION_LABELS, type DimensionKey } from '../lib/questions'
import { WEIGHTS } from '../lib/scoring'
import type { Evaluation } from '../lib/types'
import { VERDICT_THRESHOLDS } from '../lib/verdict'

const f = (n: number, d = 3) => (Number.isFinite(n) ? n.toFixed(d) : String(n))
const probs = (p: Record<string, number>) =>
  Object.entries(p)
    .map(([k, v]) => `${k}:${f(v, 2)}`)
    .join(' ')

export function DebugPanel({ evaluation, defaultOpen = false }: { evaluation: Evaluation; defaultOpen?: boolean }) {
  const d = evaluation.debug
  return (
    <details open={defaultOpen} className="group mt-14 border-2 border-paper/30 font-mono text-xs text-paper open:border-fix">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 uppercase tracking-widest hover:bg-paper/5 group-open:bg-fix group-open:font-bold group-open:text-ink group-open:hover:bg-fix [&::-webkit-details-marker]:hidden">
        <span>How Jev decided · raw data {d.mock && '· MOCK DATA (not Jev)'}</span>
        <span aria-hidden className="transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="space-y-6 overflow-x-auto p-4">
        <p>
          model={d.model} latency={d.latencyMs}ms usage=
          {d.usage ? `in:${d.usage.input_tokens} out:${d.usage.output_tokens}` : 'n/a'}
        </p>

        <table className="w-full min-w-[640px] text-left">
          <thead className="opacity-60">
            <tr>
              <th className="pr-3">question</th>
              <th className="pr-3">jev 0-4</th>
              <th className="pr-3">× 25</th>
              <th className="pr-3">weight</th>
              <th className="pr-3">conf</th>
              <th>probabilities per level</th>
            </tr>
          </thead>
          <tbody>
            {d.dimensions.map((r) => (
              <tr key={r.key} className="border-t border-paper/15">
                <td className="pr-3">{DIMENSION_LABELS[r.key as DimensionKey] ?? r.key}</td>
                <td className="pr-3">{f(r.raw, 2)}</td>
                <td className="pr-3">{r.normalized}</td>
                <td className="pr-3">×{WEIGHTS[r.key as DimensionKey] ?? 1}</td>
                <td className="pr-3">{f(r.confidence, 2)}</td>
                <td className="whitespace-nowrap">{probs(r.probabilities)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="leading-relaxed">
          score = ({d.dimensions.map((r) => `${r.normalized}×${WEIGHTS[r.key as DimensionKey] ?? 1}`).join(' + ')}) /{' '}
          {Object.values(WEIGHTS).reduce((a, b) => a + b, 0)} = <b>{evaluation.score}</b>
          <br />
          verdict: KILL &lt;{VERDICT_THRESHOLDS.fix} · FIX {VERDICT_THRESHOLDS.fix}–{VERDICT_THRESHOLDS.ship - 1} · SHIP{' '}
          {VERDICT_THRESHOLDS.ship}+ → <b>{evaluation.verdict}</b>
          <br />
          category = {d.category.choice} (conf {f(d.category.confidence, 2)}) · understandable = {f(d.understandable, 2)}
        </p>

        <pre className="max-h-96 overflow-auto bg-paper/5 p-3">{JSON.stringify(d.response, null, 2)}</pre>
      </div>
    </details>
  )
}
