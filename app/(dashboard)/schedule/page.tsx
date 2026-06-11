'use client'

import useSWR from 'swr'
import { useState, useMemo } from 'react'
import { format, isSameDay, addDays, isToday, isTomorrow } from 'date-fns'
import type { NormalizedGame, SportKey } from '@/types/sports'
import { SPORT_CONFIGS } from '@/lib/espn'
import { filterGamesByTeams } from '@/lib/filters'
import { useUserPrefs } from '@/components/layout/UserPrefsProvider'
import { CatchMeUp } from '@/components/feed/CatchMeUp'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const SPORT_COLORS: Record<SportKey, string> = {
  nba:    'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25',
  nfl:    'bg-green-500/10  text-green-700  dark:text-green-300  border-green-500/25',
  epl:    'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25',
  laliga: 'bg-red-500/10    text-red-700    dark:text-red-300    border-red-500/25',
  ucl:    'bg-blue-500/10   text-blue-700   dark:text-blue-300   border-blue-500/25',
  uel:    'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25',
  mls:    'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
  f1:     'bg-red-500/10    text-red-700    dark:text-red-300    border-red-500/25',
  mlb:    'bg-blue-500/10   text-blue-700   dark:text-blue-300   border-blue-500/25',
  nhl:    'bg-sky-500/10    text-sky-700    dark:text-sky-300    border-sky-500/25',
}

export default function SchedulePage() {
  const { sportKeys, teams: userTeams, isLoading: prefsLoading } = useUserPrefs()
  const [selectedGame, setSelectedGame] = useState<NormalizedGame | null>(null)

  // Build 7-day date range starting today (yyyyMMdd format for ESPN)
  const { days, datesParam } = useMemo(() => {
    const today = new Date()
    const dayList = Array.from({ length: 7 }, (_, i) => addDays(today, i))
    return {
      days: dayList,
      datesParam: dayList.map((d) => format(d, 'yyyyMMdd')).join(','),
    }
  }, [])

  const url = sportKeys.length
    ? `/api/sports/scores?sports=${sportKeys.join(',')}&dates=${datesParam}`
    : null

  const { data, isLoading } = useSWR<{ games: NormalizedGame[] }>(url, fetcher, {
    refreshInterval: 5 * 60_000,
  })

  const allGames = filterGamesByTeams(data?.games ?? [], userTeams)

  const gamesByDay = days.map((day) => ({
    day,
    games: allGames
      .filter((g) => isSameDay(new Date(g.startTime), day))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
  }))

  function hasConflict(games: NormalizedGame[], game: NormalizedGame): boolean {
    return games.some((other) => {
      if (other.id === game.id) return false
      return Math.abs(
        new Date(other.startTime).getTime() - new Date(game.startTime).getTime(),
      ) < 30 * 60 * 1000
    })
  }

  if (prefsLoading) return <PageSkeleton />

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">Your week in sports</p>
      </div>

      <div className="space-y-5">
        {gamesByDay.map(({ day, games }) => {
          const dayLabel = isToday(day) ? 'Today' : isTomorrow(day) ? 'Tomorrow' : format(day, 'EEEE, MMM d')
          const dateStr  = isToday(day) || isTomorrow(day) ? format(day, 'MMM d') : ''

          return (
            <div key={day.toISOString()}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-2.5">
                <div className={cn(
                  'flex flex-col items-center justify-center w-11 h-11 rounded-xl text-xs font-bold shrink-0',
                  isToday(day)
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                    : 'bg-muted text-muted-foreground',
                )}>
                  <span className="text-[10px] uppercase leading-none tracking-wide">{format(day, 'EEE')}</span>
                  <span className="text-base leading-none mt-0.5 font-black">{format(day, 'd')}</span>
                </div>
                <div>
                  <h2 className="text-sm font-semibold leading-none">{dayLabel}</h2>
                  {dateStr && <p className="text-xs text-muted-foreground mt-0.5">{dateStr}</p>}
                </div>
                {games.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {games.length} game{games.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Games or empty/loading state */}
              <div className="pl-14">
                {isLoading ? (
                  <DayLoader />
                ) : games.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No games scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {games.map((game) => {
                      const config   = SPORT_CONFIGS[game.sport]
                      const conflict = hasConflict(games, game)
                      const isLive   = game.status === 'in'

                      return (
                        <button
                          key={game.id}
                          onClick={() => setSelectedGame(game)}
                          className={cn(
                            'w-full text-left flex items-center gap-3 p-3 rounded-xl border',
                            'hover:shadow-sm transition-all duration-150 active:scale-[0.99]',
                            SPORT_COLORS[game.sport],
                          )}
                        >
                          {/* Time */}
                          <div className="shrink-0 min-w-[52px]">
                            {isLive ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" />
                                  <span className="relative flex rounded-full h-1.5 w-1.5 bg-red-500" />
                                </span>
                                {game.statusText || 'Live'}
                              </span>
                            ) : (
                              <>
                                <p className="text-xs font-semibold tabular-nums">
                                  {format(new Date(game.startTime), 'h:mm a')}
                                </p>
                                <p className="text-[10px] opacity-60">{config.emoji} {config.name}</p>
                              </>
                            )}
                          </div>

                          {/* Teams */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <TeamLogo logo={game.awayTeam.logo} name={game.awayTeam.name} />
                              <span className="text-xs font-semibold truncate max-w-[90px]">{game.awayTeam.name}</span>
                              {game.awayTeam.score != null && (
                                <span className="text-xs font-black tabular-nums">{game.awayTeam.score}</span>
                              )}
                              <span className="text-[10px] opacity-40 shrink-0">@</span>
                              <TeamLogo logo={game.homeTeam.logo} name={game.homeTeam.name} />
                              <span className="text-xs font-semibold truncate max-w-[90px]">{game.homeTeam.name}</span>
                              {game.homeTeam.score != null && (
                                <span className="text-xs font-black tabular-nums">{game.homeTeam.score}</span>
                              )}
                            </div>
                            {game.venue && (
                              <p className="text-[10px] opacity-50 mt-0.5 truncate">{game.venue}</p>
                            )}
                          </div>

                          {/* Badges */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {conflict && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 border border-yellow-400/30">
                                ⚡
                              </span>
                            )}
                            <Link
                              href={`/games/${game.sport}/${game.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-background/60 hover:bg-background border border-current/20 transition-colors"
                            >
                              Details
                            </Link>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedGame && (
        <CatchMeUp game={selectedGame} onClose={() => setSelectedGame(null)} />
      )}
    </div>
  )
}

function TeamLogo({ logo, name }: { logo: string; name: string }) {
  if (!logo) return null
  return (
    <div className="relative w-4 h-4 shrink-0">
      <Image src={logo} alt={name} fill className="object-contain" unoptimized />
    </div>
  )
}

function DayLoader() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-14 rounded-xl w-full" />
      <Skeleton className="h-14 rounded-xl w-full opacity-60" />
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-36 rounded-xl" />
        <Skeleton className="h-4 w-44 rounded" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
          <div className="pl-14 space-y-2">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl opacity-60" />
          </div>
        </div>
      ))}
    </div>
  )
}
