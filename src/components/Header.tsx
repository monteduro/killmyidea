import { REPO_URL } from '../lib/features'
import { GitHubIcon } from './GitHubIcon'
import { Logo } from './Logo'

export function Header({
  showLogo,
  historyCount,
  onHome,
  onHistory,
}: {
  showLogo: boolean
  historyCount: number
  onHome: () => void
  onHistory: () => void
}) {
  return (
    <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-7">
      {showLogo ? (
        <button onClick={onHome} aria-label="Kill another idea" className="cursor-pointer text-left">
          <Logo className="text-xl" />
        </button>
      ) : (
        <span className="pt-1 font-mono text-[11px] uppercase tracking-widest opacity-60">v1 / jev-latest</span>
      )}
      <nav className="flex items-stretch gap-2">
        <button
          onClick={onHistory}
          className="cursor-pointer border-2 border-current px-3 py-1.5 font-mono text-xs uppercase tracking-widest hover:bg-current/10"
        >
          History{historyCount > 0 && <span className="ml-2 opacity-60">{historyCount}</span>}
        </button>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Source code on GitHub"
          title="Source code on GitHub"
          className="grid w-8 shrink-0 place-items-center border-2 border-current hover:bg-current/10"
        >
          <GitHubIcon className="size-4" />
        </a>
      </nav>
    </header>
  )
}
