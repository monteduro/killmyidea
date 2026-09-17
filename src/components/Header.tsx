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
      <button
        onClick={onHistory}
        className="cursor-pointer border-2 border-current px-3 py-1.5 font-mono text-xs uppercase tracking-widest hover:bg-current/10"
      >
        History{historyCount > 0 && <span className="ml-2 opacity-60">{historyCount}</span>}
      </button>
    </header>
  )
}
