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
        Built by{' '}
        <a href="https://x.com/stemonteduro" target="_blank" rel="noopener noreferrer" className="underline">
          stemonte
        </a>
      </span>
    </footer>
  )
}
