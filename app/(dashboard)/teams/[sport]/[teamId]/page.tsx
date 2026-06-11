'use client'

import useSWR from 'swr'
import { use, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useUserPrefs } from '@/components/layout/UserPrefsProvider'
import { SPORT_CONFIGS } from '@/lib/espn'
import type { SportKey } from '@/types/sports'
import type { TeamProfile, RosterPlayer, ScheduleGame } from '@/lib/espn-detail'
import { NewsCard } from '@/components/feed/NewsCard'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Star, MapPin, Users, Calendar, Newspaper, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Tab = 'overview' | 'schedule' | 'roster' | 'news'

export default function TeamPage({ params }: { params: Promise<{ sport: string; teamId: string }> }) {
  const { sport, teamId } = use(params)
  const sportKey = sport as SportKey
  const { followsTeam, toggleTeam } = useUserPrefs()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const isFav = followsTeam(teamId)

  const { data: profileData, isLoading: profileLoading, error: profileError } =
    useSWR<{ profile: TeamProfile }>(
      `/api/teams/profile?sport=${sportKey}&teamId=${teamId}`,
      fetcher,
    )

  const { data: schedData, isLoading: schedLoading } =
    useSWR<{ schedule: ScheduleGame[] }>(
      `/api/teams/schedule?sport=${sportKey}&teamId=${teamId}`,
      fetcher,
    )

  const { data: rosterData, isLoading: rosterLoading } =
    useSWR<{ roster: RosterPlayer[] }>(
      activeTab === 'roster' ? `/api/teams/roster?sport=${sportKey}&teamId=${teamId}` : null,
      fetcher,
    )

  const { data: newsData, isLoading: newsLoading } =
    useSWR<{ news: { id: string; headline: string; description: string; published: string; url: string; imageUrl?: string; source: string }[] }>(
      activeTab === 'news' && profileData?.profile?.name
        ? `/api/sports/news?sports=${sportKey}&teams=${encodeURIComponent(profileData.profile.name)}&limit=20`
        : null,
      fetcher,
    )

  const profile  = profileData?.profile
  const schedule = schedData?.schedule ?? []
  const roster   = rosterData?.roster ?? []
  const news     = newsData?.news ?? []
  const config   = SPORT_CONFIGS[sportKey]

  const recentGames   = schedule.filter(g => g.status === 'post').slice(-5)
  const upcomingGames = schedule.filter(g => g.status === 'pre').slice(0, 5)

  async function handleToggle() {
    if (!profile) return
    await toggleTeam({
      sport_key: sportKey,
      team_id:   teamId,
      team_name: profile.name,
      team_logo: profile.logo,
    })
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Overview',  icon: Star      },
    { id: 'schedule', label: 'Schedule',  icon: Calendar  },
    { id: 'roster',   label: 'Roster',    icon: Users     },
    { id: 'news',     label: 'News',      icon: Newspaper },
  ]

  // Full-page skeleton while profile loads
  if (profileLoading) return <TeamPageSkeleton />

  // Error state
  if (profileError || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="text-sm font-semibold">Team not found</p>
        <p className="text-xs text-muted-foreground mt-1 mb-4">Could not load data for this team.</p>
        <Link href="/scores" className="text-xs text-primary underline underline-offset-2">← Back to Scores</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div
        className="relative px-4 sm:px-6 pt-8 pb-6"
        style={{ background: `linear-gradient(135deg, ${profile.color}20 0%, ${profile.alternateColor}12 100%)` }}
      >
        <Link href="/scores" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
          ← Back
        </Link>

        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="relative w-20 h-20 shrink-0 drop-shadow-lg">
            {profile.logo ? (
              <Image src={profile.logo} alt={profile.fullName} fill className="object-contain" unoptimized />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center text-3xl">
                {config.emoji}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  {config.emoji} {config.name}
                </p>
                <h1 className="text-2xl font-black tracking-tight mt-0.5 leading-tight">{profile.fullName}</h1>
              </div>

              <button
                onClick={handleToggle}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 shrink-0',
                  isFav
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/25'
                    : 'bg-background border-border/60 text-muted-foreground hover:border-primary/50 hover:text-primary',
                )}
              >
                <Star className={cn('w-3.5 h-3.5', isFav && 'fill-current')} />
                {isFav ? 'Following' : 'Follow'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2">
              {profile.record?.summary && (
                <span className="text-sm font-bold tabular-nums">{profile.record.summary}</span>
              )}
              {profile.venue && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" /> {profile.venue}
                </span>
              )}
            </div>

            {/* Recent form badges */}
            {schedLoading ? (
              <div className="flex items-center gap-1.5 mt-3">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Form</span>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="w-6 h-6 rounded-full" />
                ))}
              </div>
            ) : recentGames.length > 0 && (
              <div className="flex items-center gap-1.5 mt-3">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Form</span>
                {recentGames.map((g) => (
                  <span
                    key={g.id}
                    className={cn(
                      'w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center',
                      g.result === 'W' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : g.result === 'L' ? 'bg-red-500/15 text-red-500'
                      : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {g.result ?? '—'}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────── */}
      <div className="border-b border-border/60 px-4 sm:px-6">
        <div className="flex overflow-x-auto scrollbar-none">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all duration-150 whitespace-nowrap',
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-6">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {schedLoading ? (
              <ScheduleSkeleton />
            ) : (
              <>
                {upcomingGames.length > 0 && (
                  <section>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Next up</h2>
                    <div className="space-y-2">
                      {upcomingGames.slice(0, 3).map((g) => (
                        <ScheduleRow key={g.id} game={g} sportKey={sportKey} />
                      ))}
                    </div>
                  </section>
                )}
                {recentGames.length > 0 && (
                  <section>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Recent results</h2>
                    <div className="space-y-2">
                      {[...recentGames].reverse().map((g) => (
                        <ScheduleRow key={g.id} game={g} sportKey={sportKey} showResult />
                      ))}
                    </div>
                  </section>
                )}
                {!upcomingGames.length && !recentGames.length && (
                  <EmptyState icon="📅" message="No schedule data available" />
                )}
              </>
            )}
          </div>
        )}

        {/* SCHEDULE */}
        {activeTab === 'schedule' && (
          schedLoading ? (
            <ScheduleSkeleton />
          ) : schedule.length === 0 ? (
            <EmptyState icon="📅" message="No schedule data" />
          ) : (
            <div className="space-y-2">
              {schedule.map((g) => (
                <ScheduleRow key={g.id} game={g} sportKey={sportKey} showResult />
              ))}
            </div>
          )
        )}

        {/* ROSTER */}
        {activeTab === 'roster' && (
          rosterLoading ? (
            <RosterSkeleton />
          ) : roster.length === 0 ? (
            <EmptyState icon="👥" message="No roster data available" />
          ) : (
            <div className="rounded-2xl border border-border/60 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30">
                    {['#', 'Player', 'Pos', 'Age'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roster.map((p) => (
                    <tr key={p.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono w-10">{p.jersey}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {p.headshot && (
                            <div className="relative w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0">
                              <Image src={p.headshot} alt={p.name} fill className="object-cover" unoptimized />
                            </div>
                          )}
                          <span className="text-sm font-semibold">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground font-semibold">{p.position}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.age ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* NEWS */}
        {activeTab === 'news' && (
          newsLoading ? (
            <NewsSkeleton />
          ) : news.length === 0 ? (
            <EmptyState icon="📰" message="No news found for this team" />
          ) : (
            <div className="space-y-2">
              {news.map((n) => (
                <NewsCard key={n.id} item={{
                  ...n, sport: sportKey, league: config.name, relatedTeams: [profile.name],
                }} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ─── Schedule row ─────────────────────────────────────────────────────────────

function ScheduleRow({ game, sportKey, showResult }: { game: ScheduleGame; sportKey: SportKey; showResult?: boolean }) {
  const dateStr = game.date ? format(new Date(game.date), 'MMM d') : '—'
  const timeStr = game.date && game.status === 'pre' ? format(new Date(game.date), 'h:mm a') : null
  const isLive  = game.status === 'in'

  return (
    <Link
      href={`/games/${sportKey}/${game.id}`}
      className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-muted/40 hover:border-border transition-all duration-150 group"
    >
      <div className="text-center w-12 shrink-0">
        {isLive ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
            Live
          </span>
        ) : (
          <>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase">{dateStr}</p>
            {timeStr && <p className="text-[10px] text-muted-foreground">{timeStr}</p>}
          </>
        )}
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-[10px] font-bold text-muted-foreground w-5 shrink-0">
          {game.isHome ? 'vs' : '@'}
        </span>
        {game.opponent.logo && (
          <div className="relative w-5 h-5 shrink-0">
            <Image src={game.opponent.logo} alt={game.opponent.name} fill className="object-contain" unoptimized />
          </div>
        )}
        <span className="text-sm font-semibold truncate">{game.opponent.name}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {showResult && game.result && (
          <span className={cn(
            'text-xs font-black px-2 py-0.5 rounded-lg',
            game.result === 'W' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : game.result === 'L' ? 'bg-red-500/15 text-red-500'
            : 'bg-muted text-muted-foreground',
          )}>
            {game.result}
          </span>
        )}
        {game.score && (
          <span className="text-xs text-muted-foreground tabular-nums font-mono">{game.score}</span>
        )}
        {game.status === 'pre' && !game.score && (
          <span className="text-[10px] text-muted-foreground">{game.statusText}</span>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
      </div>
    </Link>
  )
}

// ─── Loaders & empty ─────────────────────────────────────────────────────────

function TeamPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="px-4 sm:px-6 pt-8 pb-6 bg-gradient-to-br from-muted/30 to-muted/10">
        <Skeleton className="h-4 w-12 rounded mb-5" />
        <div className="flex items-start gap-4">
          <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-7 w-52 rounded" />
            <div className="flex items-center gap-2 mt-2">
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
            <div className="flex gap-1.5 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-6 h-6 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-b border-border/60 px-4 sm:px-6 flex gap-2 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-22 rounded-lg" />
        ))}
      </div>
      <div className="px-4 sm:px-6 py-6">
        <ScheduleSkeleton />
      </div>
    </div>
  )
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className={cn('h-14 rounded-xl', i > 2 && 'opacity-40')} />
      ))}
    </div>
  )
}

function RosterSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden">
      <div className="h-10 bg-muted/30 border-b border-border/40" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 last:border-0">
          <Skeleton className="h-4 w-6 rounded" />
          <Skeleton className="w-7 h-7 rounded-full" />
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="ml-auto h-4 w-8 rounded" />
        </div>
      ))}
    </div>
  )
}

function NewsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className={cn('h-24 rounded-xl', i > 2 && 'opacity-40')} />
      ))}
    </div>
  )
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <p className="text-3xl mb-2">{icon}</p>
      <p className="text-sm">{message}</p>
    </div>
  )
}
