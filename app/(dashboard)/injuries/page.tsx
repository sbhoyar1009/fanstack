'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { SPORT_CONFIGS } from '@/lib/espn'
import type { SportKey } from '@/types/sports'
import { useUserPrefs } from '@/components/layout/UserPrefsProvider'
import { NewsCard } from '@/components/feed/NewsCard'
import { Skeleton } from '@/components/ui/skeleton'
import { ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

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

export default function InjuriesPage() {
  const { sportKeys: followedSports } = useUserPrefs()
  const allSports = Object.keys(SPORT_CONFIGS) as SportKey[]
  const defaultSports = followedSports.length > 0 ? followedSports : allSports
  const [activeSports, setActiveSports] = useState<SportKey[]>(defaultSports)

  const sportsParam = activeSports.join(',')
  const { data, isLoading } = useSWR<{ injuries: NewsItem[] }>(
    `/api/injuries?sports=${sportsParam}`,
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
        <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
          <ShieldAlert className="w-4 h-4 text-red-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Injury Dashboard</h1>
          <p className="text-[11px] text-muted-foreground">Latest injury reports across your sports</p>
        </div>
      </div>

      {/* Sport filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {allSports.map(s => {
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
      ) : (data?.injuries ?? []).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-sm">No injury news found for selected sports.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(data?.injuries ?? []).map((item) => {
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
