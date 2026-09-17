import { useCallback, useEffect, useState } from 'react'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { HistoryDrawer } from './components/HistoryDrawer'
import { IdeaForm } from './components/IdeaForm'
import { Judging } from './components/Judging'
import { Result } from './components/Result'
import { ideaStore, toSavedIdea, type SavedIdea } from './lib/storage'
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
  const [save, setSave] = useState(false)
  const [datasetOptIn, setDatasetOptIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ResultModel | null>(null)
  const [saved, setSaved] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<SavedIdea[]>([])

  const refreshHistory = useCallback(() => ideaStore.list().then(setHistory), [])
  useEffect(() => void refreshHistory(), [refreshHistory])

  useEffect(() => {
    document.body.dataset.mode = view === 'form' ? 'light' : 'dark'
    window.scrollTo({ top: 0 })
  }, [view])

  async function submit() {
    setError(null)
    setView('judging')
    try {
      const [evaluation] = await Promise.all([
        evaluate({ idea, datasetOptIn: datasetOptIn || undefined }),
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

  function openSaved(item: SavedIdea) {
    setIdea(item.idea)
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
        onHome={reset}
        onHistory={() => setHistoryOpen(true)}
      />

      <main className="flex-1">
        {view === 'form' && (
          <IdeaForm
            idea={idea}
            save={save}
            datasetOptIn={datasetOptIn}
            error={error}
            onIdea={setIdea}
            onSave={setSave}
            onDatasetOptIn={setDatasetOptIn}
            onSubmit={submit}
          />
        )}
        {view === 'judging' && <Judging />}
        {view === 'result' && result && (
          <Result key={JSON.stringify(result.dimensions)} result={result} idea={idea} saved={saved} debug={debug} onAgain={reset} />
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
    </div>
  )
}
