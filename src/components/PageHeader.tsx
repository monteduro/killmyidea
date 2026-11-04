// The app header for the static pages (/mcp/, /privacy/, /terms/). History lives on the home
// page, so it links there with the drawer open.
import { useEffect, useState } from 'react'
import { Header } from './Header'
import { StatsModal } from './StatsModal'
import { fetchStats, type Stats } from '../lib/stats'
import { ideaStore } from '../lib/storage'

export function PageHeader({ active }: { active?: 'mcp' }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)
  const [historyCount, setHistoryCount] = useState(0)

  useEffect(() => {
    void fetchStats().then(setStats)
    void ideaStore.list().then((items) => setHistoryCount(items.length))
  }, [])

  return (
    <>
      <Header
        showLogo
        active={active}
        historyCount={historyCount}
        killedCount={stats?.count ?? null}
        onHome={() => window.location.assign('/')}
        onHistory={() => window.location.assign('/?open=history')}
        onStats={() => setStatsOpen(true)}
      />
      <StatsModal open={statsOpen} stats={stats} onClose={() => setStatsOpen(false)} />
    </>
  )
}
