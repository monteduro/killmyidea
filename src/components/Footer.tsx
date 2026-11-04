import { REPO_URL } from '../lib/features'

export function Footer() {
  return (
    <footer className="mt-auto flex flex-wrap justify-between gap-x-6 gap-y-1 px-5 pb-6 pt-10 font-mono text-[10px] uppercase tracking-widest opacity-50 sm:px-8">
      <span>
        Decisions by Jev /{' '}
        <a href="https://typesafe.ai" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-100">
          TypeSafe AI
        </a>
      </span>
      <span>
        <a href="/mcp/" className="underline">
          Free MCP server
        </a>
        {' · '}
        <a href="/stats/" className="underline">
          Stats
        </a>
        {' · '}
        <a href="/privacy/" className="underline">
          Privacy
        </a>
        {' · '}
        <a href="/terms/" className="underline">
          Terms
        </a>
        {' · '}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="underline">
          Source on GitHub
        </a>
        {' · '}Built by{' '}
        <a href="https://x.com/stemonte" target="_blank" rel="noopener noreferrer" className="underline">
          stemonte
        </a>
      </span>
    </footer>
  )
}
