import { useCallback, useEffect, useState } from 'react'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { HistoryDrawer } from './components/HistoryDrawer'
import { IdeaForm } from './components/IdeaForm'
import { Judging } from './components/Judging'
import { Result } from './components/Result'
import { StatsModal } from './components/StatsModal'
import { trackIdeaSubmitted } from './lib/analytics'
import { DEFAULT_GOAL, type Goal } from './lib/questions'
import { ideaStore, toSavedIdea, type SavedIdea } from './lib/storage'
import { fetchStats, type Stats } from './lib/stats'
import type { EvaluateRequest, Evaluation, ResultModel } from './lib/types'

type View = 'form' | 'judging' | 'result'

/** Enough to glimpse the judging sequence, never more. */
const MIN_JUDGING_MS = 480

/** `?debug=1` opens the raw-data panel by default. */
const debug = new URLSearchParams(window.location.search).get('debug') === '1'

async function evaluate(body: EvaluateRequest): Promise<Evaluation> {
  const res = await fetch('/api/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error ?? 'Jev could not judge this one.')
  return data as Evaluation
}

export default function App() {
  const [view, setView] = useState<View>('form')
  const [idea, setIdea] = useState('')
  const [goal, setGoal] = useState<Goal>(DEFAULT_GOAL)
  const [save, setSave] = useState(false)
  const [doNotArchive, setDoNotArchive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultModel | null>(null)
  const [saved, setSaved] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<SavedIdea[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)

  const refreshHistory = useCallback(() => ideaStore.list().then(setHistory), [])
  useEffect(() => void refreshHistory(), [refreshHistory])

  /** Browser HTTP cache (max-age=300) keeps this to one request per 5 minutes. */
  useEffect(() => void fetchStats().then(setStats), [])

  useEffect(() => {
    document.body.dataset.mode = view === 'form' ? 'light' : 'dark'
    window.scrollTo({ top: 0 })
  }, [view])

  async function submit() {
    setError(null)
    setView('judging')
    trackIdeaSubmitted({ length: idea.trim().length, goal, saved: save, archived: !doNotArchive })
    try {
      const [evaluation] = await Promise.all([
        evaluate({ idea, goal, doNotArchive: doNotArchive || undefined }),
        new Promise((r) => setTimeout(r, MIN_JUDGING_MS)),
      ])
      if (save) {
        await ideaStore.save(toSavedIdea(idea.trim(), evaluation))
        void refreshHistory()
      }
      setResult(evaluation)
      setSaved(save)
      setView('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setView('form')
    }
  }

  function reset() {
    setResult(null)
    setIdea('')
    setView('form')
  }

  /** Back to the form with the idea and goal still filled in. */
  function refine() {
    setResult(null)
    setView('form')
  }

  function openSaved(item: SavedIdea) {
    setIdea(item.idea)
    setGoal(item.goal ?? DEFAULT_GOAL)
    setResult(item)
    setSaved(true)
    setHistoryOpen(false)
    setView('result')
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header
        showLogo={view !== 'form'}
        historyCount={history.length}
        killedCount={stats?.count ?? null}
        onHome={reset}
        onHistory={() => setHistoryOpen(true)}
        onStats={() => setStatsOpen(true)}
      />

      <main className="flex-1">
        {view === 'form' && (
          <IdeaForm
            idea={idea}
            goal={goal}
            save={save}
            doNotArchive={doNotArchive}
            error={error}
            onIdea={setIdea}
            onGoal={setGoal}
            onSave={setSave}
            onDoNotArchive={setDoNotArchive}
            onSubmit={submit}
          />
        )}
        {view === 'judging' && <Judging goal={goal} />}
        {view === 'result' && result && (
          <Result key={JSON.stringify(result.dimensions)} result={result} idea={idea} saved={saved} debug={debug} onAgain={reset} onRefine={refine} />
        )}
      </main>

      <Footer />

      <HistoryDrawer
        open={historyOpen}
        items={history}
        onClose={() => setHistoryOpen(false)}
        onOpen={openSaved}
        onDelete={(id) => ideaStore.remove(id).then(refreshHistory)}
        onClear={() => ideaStore.clear().then(refreshHistory)}
      />

      <StatsModal open={statsOpen} stats={stats} onClose={() => setStatsOpen(false)} />
    </div>
  )
}
