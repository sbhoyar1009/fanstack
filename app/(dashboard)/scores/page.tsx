'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { ScoreGrid } from '@/components/scores/ScoreGrid'
import type { NormalizedGame, SportKey } from '@/types/sports'
import { SPORT_CONFIGS } from '@/lib/espn'
import { filterGamesByTeams } from '@/lib/filters'
import { useUserPrefs } from '@/components/layout/UserPrefsProvider'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ScoresPage() {
  const { sportKeys, teams, isLoading: prefsLoading } = useUserPrefs()
  const [activeTab, setActiveTab] = useState<string>('all')

  const { data, isLoading } = useSWR<{ games: NormalizedGame[] }>(
    sportKeys.length ? `/api/sports/scores?sports=${sportKeys.join(',')}` : null,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true }
  )

  const allGames     = filterGamesByTeams(data?.games ?? [], teams)
  const filtered     = activeTab === 'all' ? allGames : allGames.filter((g) => g.sport === activeTab)
  const liveCount    = allGames.filter((g) => g.status === 'in').length

  const tabs = [
    { id: 'all', label: 'All', count: allGames.length },
    ...sportKeys.map((key) => ({
      id: key, label: `${SPORT_CONFIGS[key].emoji} ${SPORT_CONFIGS[key].name}`,
      count: allGames.filter((g) => g.sport === key).length,
    })),
  ]

  if (prefsLoading) return <PageSkeleton />

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          Scores
          {liveCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-bold">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
              {liveCount} live
            </span>
          )}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Refreshes every 30 seconds</p>
      </div>

      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border/40 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0',
              activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            <span className={cn('text-[10px] px-1.5 rounded-full font-bold tabular-nums min-w-[18px] text-center',
              activeTab === tab.id ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
            )}>{tab.count}</span>
          </button>
        ))}
      </div>

      <ScoreGrid games={filtered} isLoading={isLoading && allGames.length === 0} />
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <Skeleton className="h-8 w-40 rounded-xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
    </div>
  )
}
