'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { NewsCard } from '@/components/feed/NewsCard'
import { Skeleton } from '@/components/ui/skeleton'
import type { NewsItem, SportKey } from '@/types/sports'
import { SPORT_CONFIGS } from '@/lib/espn'
import { filterNewsByTeams } from '@/lib/filters'
import { useUserPrefs } from '@/components/layout/UserPrefsProvider'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function NewsPage() {
  const { sportKeys, teams: userTeams, isLoading: prefsLoading } = useUserPrefs()
  const [activeTab, setActiveTab] = useState<string>('all')

  const teamsParam = userTeams.map((t) => t.team_name).join(',')
  const newsUrl = sportKeys.length
    ? `/api/sports/news?sports=${sportKeys.join(',')}&teams=${encodeURIComponent(teamsParam)}&limit=80`
    : null

  const { data, isLoading } = useSWR<{ news: NewsItem[] }>(newsUrl, fetcher, {
    refreshInterval: 5 * 60_000,
  })

  const allNews      = filterNewsByTeams(data?.news ?? [], userTeams)
  const filteredNews = activeTab === 'all' ? allNews : allNews.filter((n) => n.sport === activeTab)

  const tabs = [
    { id: 'all', label: 'All', count: allNews.length },
    ...sportKeys.map((key) => ({
      id:    key,
      label: `${SPORT_CONFIGS[key as SportKey].emoji} ${SPORT_CONFIGS[key as SportKey].name}`,
      count: allNews.filter((n) => n.sport === key).length,
    })),
  ]

  if (prefsLoading) return <NewsSkeleton />

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">News</h1>
        <p className="text-xs text-muted-foreground mt-0.5">ESPN · BBC · Reuters · AP · Bleacher Report + more</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border/40 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
            )}
          >
            {tab.label}
            <span className={cn(
              'text-[10px] px-1.5 rounded-full font-bold tabular-nums min-w-[18px] text-center',
              activeTab === tab.id ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <NewsSkeleton />
      ) : filteredNews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm font-semibold">No news for your teams right now</p>
          <p className="text-xs text-muted-foreground mt-1">Check back soon</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNews.map((n) => <NewsCard key={n.id} item={n} />)}
        </div>
      )}
    </div>
  )
}

function NewsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  )
}
