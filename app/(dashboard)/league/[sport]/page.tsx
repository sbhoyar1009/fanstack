'use client'

import useSWR from 'swr'
import { use, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { SPORT_CONFIGS } from '@/lib/espn'
import type { SportKey } from '@/types/sports'
import type { StandingsGroup, LeaderCategory } from '@/lib/espn-detail'
import { NewsCard } from '@/components/feed/NewsCard'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Trophy, BarChart3, Newspaper } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())
type Tab = 'standings' | 'leaders' | 'news'

type LeagueOverviewData = {
  standings: StandingsGroup[]
  leaders: LeaderCategory[]
  news: Array<{ id: string; headline: string; description: string; published: string; url: string; imageUrl?: string; source: string; sport: string; league: string }>
}

export default function LeagueOverviewPage({
  params,
}: {
  params: Promise<{ sport: string }>
}) {
  const { sport } = use(params)
  const sportKey = sport as SportKey
  const config = SPORT_CONFIGS[sportKey]
  const [tab, setTab] = useState<Tab>('standings')

  const { data, isLoading } = useSWR<LeagueOverviewData>(
    `/api/league/overview?sport=${sportKey}`,
    fetcher,
  )

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'standings', label: 'Standings', icon: Trophy  },
    { id: 'leaders',   label: 'Leaders',   icon: BarChart3 },
    { id: 'news',      label: 'News',      icon: Newspaper },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="px-4 sm:px-6 pt-8 pb-6">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
          ← Back
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
            {config?.emoji}
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{config?.name ?? sport}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">League overview</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/60 px-4 sm:px-6">
        <div className="flex overflow-x-auto scrollbar-none">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap',
                tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : (
          <>
            {tab === 'standings' && (
              <div className="space-y-6">
                {(data?.standings ?? []).length === 0 ? (
                  <EmptyState icon="🏆" message="No standings data available" />
                ) : (
                  (data?.standings ?? []).map((group) => (
                    <div key={group.name}>
                      {group.name && (
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">{group.name}</h3>
                      )}
                      <div className="rounded-2xl border border-border/60 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border/40 bg-muted/30">
                              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground w-8">#</th>
                              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Team</th>
                              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">W</th>
                              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">L</th>
                              {group.entries[0]?.draws != null && (
                                <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">D</th>
                              )}
                              {group.entries[0]?.points != null ? (
                                <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Pts</th>
                              ) : (
                                <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">PCT</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {group.entries.map((entry, i) => (
                              <tr key={entry.teamId} className={cn('border-b border-border/30 last:border-0', i % 2 === 0 ? '' : 'bg-muted/10')}>
                                <td className="px-3 py-2.5 text-muted-foreground font-mono">{entry.rank}</td>
                                <td className="px-3 py-2.5">
                                  <Link href={`/teams/${sportKey}/${entry.teamId}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                                    {entry.teamLogo && (
                                      <div className="relative w-5 h-5 shrink-0">
                                        <Image src={entry.teamLogo} alt={entry.teamName} fill className="object-contain" unoptimized />
                                      </div>
                                    )}
                                    <span className="font-semibold truncate max-w-[120px]">{entry.teamName}</span>
                                  </Link>
                                </td>
                                <td className="px-3 py-2.5 text-center font-bold tabular-nums">{entry.wins}</td>
                                <td className="px-3 py-2.5 text-center tabular-nums text-muted-foreground">{entry.losses}</td>
                                {entry.draws != null && (
                                  <td className="px-3 py-2.5 text-center tabular-nums text-muted-foreground">{entry.draws}</td>
                                )}
                                {entry.points != null ? (
                                  <td className="px-3 py-2.5 text-center font-bold tabular-nums text-primary">{entry.points}</td>
                                ) : (
                                  <td className="px-3 py-2.5 text-center tabular-nums">{(entry.pct * 100).toFixed(1)}%</td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'leaders' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(data?.leaders ?? []).length === 0 ? (
                  <EmptyState icon="📊" message="No leaders data available" />
                ) : (
                  (data?.leaders ?? []).map((cat) => (
                    <div key={cat.name} className="rounded-2xl border border-border/60 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-border/40 bg-muted/30">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{cat.displayName}</h3>
                      </div>
                      <div className="divide-y divide-border/30">
                        {cat.leaders.slice(0, 5).map((l) => (
                          <Link
                            key={l.athleteId}
                            href={`/players/${sportKey}/${l.athleteId}`}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                          >
                            <span className="text-xs font-mono text-muted-foreground w-4">{l.rank}</span>
                            {l.athleteHeadshot ? (
                              <div className="relative w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0">
                                <Image src={l.athleteHeadshot} alt={l.athleteName} fill className="object-cover" unoptimized />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{l.athleteName}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{l.teamName}</p>
                            </div>
                            <span className="text-sm font-black text-primary tabular-nums">{l.displayValue}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'news' && (
              <div className="space-y-2">
                {(data?.news ?? []).length === 0 ? (
                  <EmptyState icon="📰" message="No news available" />
                ) : (
                  (data?.news ?? []).map((n) => (
                    <NewsCard key={n.id} item={{ ...n, sport: sportKey, league: config?.name ?? sport, relatedTeams: [] }} />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground col-span-2">
      <p className="text-3xl mb-2">{icon}</p>
      <p className="text-sm">{message}</p>
    </div>
  )
}
