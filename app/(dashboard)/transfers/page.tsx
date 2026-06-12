'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { SPORT_CONFIGS } from '@/lib/espn'
import type { SportKey } from '@/types/sports'
import { NewsCard } from '@/components/feed/NewsCard'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const TRANSFER_SPORTS: SportKey[] = ['epl', 'laliga', 'ucl', 'uel', 'mls', 'nba', 'nfl', 'mlb']

type NewsItem = {
  id: string
  headline: string
  description: string
  published: string
  url: string
  imageUrl?: string
  source: string
  sport: string
  league: string
  relatedTeams: string[]
}

export default function TransfersPage() {
  const [activeSports, setActiveSports] = useState<SportKey[]>(TRANSFER_SPORTS)

  const sportsParam = activeSports.join(',')
  const { data, isLoading } = useSWR<{ transfers: NewsItem[] }>(
    `/api/transfers?sports=${sportsParam}`,
    fetcher,
  )

  function toggleSport(s: SportKey) {
    setActiveSports(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <ArrowLeftRight className="w-4 h-4 text-blue-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Transfer Tracker</h1>
          <p className="text-[11px] text-muted-foreground">Transfers, signings, and trade news</p>
        </div>
      </div>

      {/* Sport filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {TRANSFER_SPORTS.map(s => {
          const cfg = SPORT_CONFIGS[s]
          return (
            <button
              key={s}
              onClick={() => toggleSport(s)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                activeSports.includes(s)
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'border-border/60 text-muted-foreground hover:border-border',
              )}
            >
              {cfg.emoji} {cfg.name}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (data?.transfers ?? []).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-3xl mb-2">🔇</p>
          <p className="text-sm">No transfer news found for selected sports.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(data?.transfers ?? []).map((item) => {
            const sport = (item.sport ?? activeSports[0]) as SportKey
            const cfg = SPORT_CONFIGS[sport] ?? SPORT_CONFIGS[activeSports[0]]
            return (
              <NewsCard key={item.id} item={{ ...item, sport, league: cfg?.name ?? item.league, relatedTeams: [] }} />
            )
          })}
        </div>
      )}
    </div>
  )
}
