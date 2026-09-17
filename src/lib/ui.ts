import type { Verdict } from './verdict'

export const verdictBg: Record<Verdict, string> = {
  KILL: 'bg-kill',
  FIX: 'bg-fix',
  SHIP: 'bg-ship',
}

export const verdictText: Record<Verdict, string> = {
  KILL: 'text-kill',
  FIX: 'text-fix',
  SHIP: 'text-ship',
}
