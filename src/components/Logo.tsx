export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`block font-black uppercase leading-[0.82] tracking-[-0.04em] ${className}`}>
      <span className="block">Kill</span>
      <span className="block">My</span>
      <span className="block">Idea</span>
    </span>
  )
}
