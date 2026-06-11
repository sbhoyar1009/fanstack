'use client'

import useSWR from 'swr'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useUserPrefs } from '@/components/layout/UserPrefsProvider'
import { SPORT_CONFIGS } from '@/lib/espn'
import type { SportKey } from '@/types/sports'
import type { StandingsGroup } from '@/lib/espn-detail'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function StandingsContent() {
  const { sportKeys, teamIds, isLoading: prefsLoading } = useUserPrefs()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const activeSport  = (searchParams.get('sport') ?? sportKeys[0] ?? 'nba') as SportKey

  const { data, isLoading } = useSWR<{ groups: StandingsGroup[] }>(
    activeSport ? `/api/sports/standings-detail?sport=${activeSport}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const groups  = data?.groups ?? []
  const config  = SPORT_CONFIGS[activeSport]

  if (prefsLoading) return <StandingsSkeleton />

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Standings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Current season</p>
      </div>

      {/* Sport tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl border border-border/40 overflow-x-auto scrollbar-none">
        {sportKeys.map((key) => (
          <button key={key}
            onClick={() => router.push(`/standings?sport=${key}`)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0',
              activeSport === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {SPORT_CONFIGS[key].emoji} {SPORT_CONFIGS[key].name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <StandingsSkeleton />
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-3xl mb-2">{config.emoji}</p>
          <p className="text-sm">No standings data available</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.name}>
              {group.name && (
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                  {group.name}
                </h2>
              )}
              <div className="rounded-2xl border border-border/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-8">#</th>
                      <th className="text-left px-2 py-2.5 text-xs font-semibold text-muted-foreground">Team</th>
                      <th className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground w-10">W</th>
                      <th className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground w-10">L</th>
                      {group.entries[0]?.draws != null && (
                        <th className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground w-10">D</th>
                      )}
                      {group.entries[0]?.points != null && (
                        <th className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground w-12">Pts</th>
                      )}
                      <th className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground w-12 hidden sm:table-cell">PCT</th>
                      {group.entries[0]?.gb != null && (
                        <th className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground w-10 hidden sm:table-cell">GB</th>
                      )}
                      <th className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground w-16 hidden md:table-cell">Streak</th>
                      <th className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground w-16 hidden md:table-cell">L10</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.entries.map((entry, idx) => {
                      const isFollowed = teamIds.has(entry.teamId)
                      const isTop      = idx < (activeSport === 'epl' || activeSport === 'laliga' ? 4 : 6)
                      return (
                        <tr key={entry.teamId}
                          className={cn(
                            'border-b border-border/30 last:border-0 transition-colors',
                            isFollowed ? 'bg-primary/5' : 'hover:bg-muted/30'
                          )}
                        >
                          <td className="px-4 py-2.5">
                            <span className={cn('text-xs font-bold tabular-nums', isTop ? 'text-primary' : 'text-muted-foreground')}>
                              {entry.rank}
                            </span>
                          </td>
                          <td className="px-2 py-2.5">
                            <Link href={`/teams/${activeSport}/${entry.teamId}`}
                              className="flex items-center gap-2 group"
                            >
                              {entry.teamLogo && (
                                <div className="relative w-6 h-6 shrink-0">
                                  <Image src={entry.teamLogo} alt={entry.teamName} fill className="object-contain" unoptimized />
                                </div>
                              )}
                              <span className={cn(
                                'text-xs font-semibold group-hover:text-primary transition-colors',
                                isFollowed && 'text-primary'
                              )}>
                                <span className="hidden sm:inline">{entry.teamName}</span>
                                <span className="sm:hidden">{entry.abbreviation}</span>
                              </span>
                              {isFollowed && <span className="text-[9px] bg-primary/10 text-primary px-1 rounded font-bold hidden sm:inline">YOU</span>}
                            </Link>
                          </td>
                          <td className="px-2 py-2.5 text-center text-xs font-semibold tabular-nums">{entry.wins}</td>
                          <td className="px-2 py-2.5 text-center text-xs text-muted-foreground tabular-nums">{entry.losses}</td>
                          {entry.draws != null && (
                            <td className="px-2 py-2.5 text-center text-xs text-muted-foreground tabular-nums">{entry.draws}</td>
                          )}
                          {entry.points != null && (
                            <td className="px-2 py-2.5 text-center text-xs font-bold text-primary tabular-nums">{entry.points}</td>
                          )}
                          <td className="px-2 py-2.5 text-center text-xs text-muted-foreground tabular-nums hidden sm:table-cell">
                            {entry.pct.toFixed(3).replace('0.', '.')}
                          </td>
                          {entry.gb != null && (
                            <td className="px-2 py-2.5 text-center text-xs text-muted-foreground tabular-nums hidden sm:table-cell">
                              {entry.gb === 0 ? '—' : entry.gb}
                            </td>
                          )}
                          <td className="px-2 py-2.5 text-center hidden md:table-cell">
                            <StreakBadge streak={entry.streak} />
                          </td>
                          <td className="px-2 py-2.5 text-center text-xs text-muted-foreground tabular-nums hidden md:table-cell">
                            {entry.last10 ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StreakBadge({ streak }: { streak?: string }) {
  if (!streak) return <span className="text-xs text-muted-foreground">—</span>
  const wins = streak.match(/^W(\d+)/i)
  const loss = streak.match(/^L(\d+)/i)
  if (wins) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
      <TrendingUp className="w-3 h-3" />{streak}
    </span>
  )
  if (loss) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-500">
      <TrendingDown className="w-3 h-3" />{streak}
    </span>
  )
  return <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><Minus className="w-3 h-3" />{streak}</span>
}

function StandingsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 2 }).map((_, gi) => (
        <div key={gi}>
          <Skeleton className="h-4 w-36 rounded mb-2 mx-1" />
          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <div className="h-10 bg-muted/30 border-b border-border/40" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 last:border-0">
                <Skeleton className="h-4 w-5 rounded" />
                <Skeleton className="w-6 h-6 rounded-full" />
                <Skeleton className="h-4 w-28 rounded" />
                <div className="ml-auto flex gap-4">
                  <Skeleton className="h-4 w-6 rounded" />
                  <Skeleton className="h-4 w-6 rounded" />
                  <Skeleton className="h-4 w-10 rounded hidden sm:block" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function StandingsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <Skeleton className="h-8 w-36 rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <StandingsSkeleton />
      </div>
    }>
      <StandingsContent />
    </Suspense>
  )
}
