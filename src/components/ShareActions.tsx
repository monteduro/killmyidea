import { useState, type RefObject } from 'react'
import { clipboardText, xIntentUrl } from '../lib/share'
import type { ResultModel } from '../lib/types'

const btn =
  'cursor-pointer border-2 border-paper px-4 py-3 text-center font-mono text-xs font-bold uppercase tracking-widest transition-colors hover:bg-paper hover:text-ink disabled:opacity-40'

export function ShareActions({ result, cardRef }: { result: ResultModel; cardRef: RefObject<HTMLDivElement | null> }) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(clipboardText(result))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      window.prompt('Copy your result:', clipboardText(result))
    }
  }

  async function download() {
    const node = cardRef.current
    if (!node) return
    setDownloading(true)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(node, { pixelRatio: 1200 / node.offsetWidth, cacheBust: true })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `kill-my-idea-${result.score}-${result.verdict.toLowerCase()}.png`
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <button onClick={copy} className={btn}>
        {copied ? 'Copied ✓' : 'Copy result'}
      </button>
      <a href={xIntentUrl(result)} target="_blank" rel="noopener noreferrer" className={`${btn} bg-paper text-ink hover:bg-kill`}>
        Share on X
      </a>
      <button onClick={download} disabled={downloading} className={btn}>
        {downloading ? 'Rendering…' : 'Download card'}
      </button>
    </div>
  )
}
