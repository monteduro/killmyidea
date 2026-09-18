import { useEffect, useId, useRef } from 'react'
import { IDEA_MAX, IDEA_MIN } from '../lib/evaluate'
import { GOAL_LABELS, GOALS, type Goal } from '../lib/questions'
import { Logo } from './Logo'

const PLACEHOLDER =
  "A service that emails you a daily digest of posts from Instagram accounts you follow, so you don't need to open Instagram."

type Props = {
  idea: string
  goal: Goal
  save: boolean
  doNotArchive: boolean
  error: string | null
  onIdea: (v: string) => void
  onGoal: (v: Goal) => void
  onSave: (v: boolean) => void
  onDoNotArchive: (v: boolean) => void
  onSubmit: () => void
}

export function IdeaForm(p: Props) {
  const id = useId()
  const length = p.idea.trim().length
  const tooShort = length < IDEA_MIN
  const textarea = useRef<HTMLTextAreaElement>(null)

  // When refining, the idea is already there: put the caret after it.
  useEffect(() => {
    const el = textarea.current
    el?.setSelectionRange(el.value.length, el.value.length)
  }, [])

  return (
    <form
      className="mx-auto w-full max-w-3xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14"
      onSubmit={(e) => {
        e.preventDefault()
        if (!tooShort) p.onSubmit()
      }}
    >
      <h1>
        <Logo className="text-[clamp(4.5rem,24vw,11rem)]" />
      </h1>

      <label htmlFor={id} className="mt-10 block text-xl font-medium leading-snug sm:text-2xl">
        Describe the thing you're thinking about building.
      </label>

      <div className="mt-4 border-2 border-ink bg-white/40 focus-within:bg-white/80">
        <textarea
          id={id}
          ref={textarea}
          value={p.idea}
          maxLength={IDEA_MAX}
          onChange={(e) => p.onIdea(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !tooShort) p.onSubmit()
          }}
          placeholder={PLACEHOLDER}
          rows={6}
          autoFocus
          className="block min-h-44 w-full resize-y bg-transparent p-4 text-lg leading-relaxed outline-none placeholder:text-ink/35 sm:text-xl"
        />
        <div className="flex justify-between border-t-2 border-ink px-4 py-2 font-mono text-[11px] uppercase tracking-wider">
          <span className={tooShort ? 'opacity-60' : 'opacity-0'}>min {IDEA_MIN} chars</span>
          <span className="tabular-nums opacity-60">
            {length} / {IDEA_MAX}
          </span>
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium">What's the goal?</legend>
        <div className="mt-2 grid grid-cols-3 border-2 border-ink">
          {GOALS.map((g) => (
            <label key={g} className="cursor-pointer border-ink [&+&]:border-l-2">
              <input
                type="radio"
                name={`${id}-goal`}
                value={g}
                checked={p.goal === g}
                onChange={() => p.onGoal(g)}
                className="peer sr-only"
              />
              <span className="block px-2 py-3 text-center text-sm font-bold uppercase tracking-tight transition-colors peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-4 peer-focus-visible:outline-kill hover:bg-ink/10 peer-checked:hover:bg-ink sm:text-base">
                {GOAL_LABELS[g]}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-1 font-mono text-[11px] leading-snug opacity-60">
          Jev adapts the weighted questions to what success means for you.
        </p>
      </fieldset>

      <Checkbox checked={p.save} onChange={p.onSave} label="Save my idea to my private history">
        Off by default. Saved only in this browser.
      </Checkbox>

      <Checkbox
        checked={p.doNotArchive}
        onChange={p.onDoNotArchive}
        label="Don't archive this evaluation for product analysis"
      >
        By default, the idea and its scores are stored on the server to help measure and improve the tool.
      </Checkbox>

      {p.error && (
        <p role="alert" className="mt-6 border-2 border-kill px-4 py-3 font-mono text-sm text-kill">
          {p.error}
        </p>
      )}

      <button
        type="submit"
        disabled={tooShort}
        className="mt-6 w-full cursor-pointer border-2 border-ink bg-ink px-6 py-5 text-3xl font-black uppercase tracking-tight text-paper transition-colors hover:bg-kill hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-ink disabled:hover:text-paper sm:text-4xl"
      >
        Kill my idea
      </button>

      <p className="mt-6 font-mono text-xs uppercase leading-relaxed tracking-widest opacity-70">
        No encouragement.
        <br />
        No startup therapy.
        <br />
        Just probabilities.
      </p>
    </form>
  )
}

function Checkbox({
  checked,
  onChange,
  label,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  children?: React.ReactNode
}) {
  return (
    <label className="mt-5 flex cursor-pointer select-none items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="mt-0.5 grid size-5 shrink-0 place-items-center border-2 border-ink font-mono text-xs leading-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
      >
        {checked ? '✕' : ''}
      </span>
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {children && <span className="mt-1 block font-mono text-[11px] leading-snug opacity-60">{children}</span>}
      </span>
    </label>
  )
}
