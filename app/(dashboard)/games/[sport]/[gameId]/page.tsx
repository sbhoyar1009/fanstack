'use client'

import useSWR from 'swr'
import { use, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { SPORT_CONFIGS } from '@/lib/espn'
import type { SportKey } from '@/types/sports'
import type { GameDetail } from '@/lib/espn-detail'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  MapPin, Tv, Users, PlayCircle, ChevronRight,
  TrendingUp, Zap, BarChart3, ListOrdered,
} from 'lucide-react'
import { PreGameCard } from '@/components/PreGameCard'
import { ShareCard } from '@/components/ShareCard'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type DetailTab = 'boxscore' | 'plays' | 'leaders'

export default function GameDetailPage({
  params,
}: {
  params: Promise<{ sport: string; gameId: string }>
}) {
  const { sport, gameId } = use(params)
  const sportKey = sport as SportKey
  const config = SPORT_CONFIGS[sportKey]
  const [activeTab, setActiveTab] = useState<DetailTab>('boxscore')

  const { data, isLoading } = useSWR<{ game: GameDetail }>(
    `/api/games/detail?sport=${sportKey}&gameId=${gameId}`,
    fetcher,
    { refreshInterval: 30_000 },
  )

  const game = data?.game

  const tabs: Array<{ id: DetailTab; label: string; icon: React.ElementType }> = [
    { id: 'boxscore', label: 'Box Score', icon: BarChart3   },
    { id: 'plays',    label: 'Key Plays', icon: Zap         },
    { id: 'leaders',  label: 'Leaders',   icon: TrendingUp  },
  ]

  const ytQuery = game
    ? `${game.awayTeam.name} vs ${game.homeTeam.name} highlights`
    : ''

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-8 pb-0">
        <Link
          href="/scores"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors"
        >
          ← Back to Scores
        </Link>

        {/* Sport + date row */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {config.emoji} {config.name}
          </span>
          {game?.startTime && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(game.startTime), 'MMM d, yyyy · h:mm a')}
            </span>
          )}
        </div>

        {/* Scoreboard */}
        {isLoading || !game ? (
          <ScoreboardSkeleton />
        ) : (
          <Scoreboard game={game} />
        )}

        {/* Pre-game AI preview */}
        {game?.status === 'pre' && (
          <div className="mt-4 mb-2">
            <PreGameCard
              homeTeam={game.homeTeam.name}
              awayTeam={game.awayTeam.name}
              league={game.league}
              kickoffTime={game.startTime}
              homeForm={[]}
              awayForm={[]}
              gameId={gameId}
              sport={sportKey}
            />
          </div>
        )}

        {/* Meta row */}
        {game && (
          <div className="flex flex-wrap items-center gap-4 mt-4 pb-4 text-xs text-muted-foreground">
            {game.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {game.venue}
              </span>
            )}
            {game.attendance != null && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {game.attendance.toLocaleString()} fans
              </span>
            )}
            {game.broadcasts && game.broadcasts.length > 0 && (
              <span className="flex items-center gap-1">
                <Tv className="w-3 h-3" /> {game.broadcasts.join(', ')}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <ShareCard
                title={`${game.awayTeam.name} vs ${game.homeTeam.name}`}
                text={`${game.awayTeam.score}–${game.homeTeam.score} · ${game.league}`}
              />
              {game.status === 'post' && (
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 font-semibold transition-colors text-xs"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  Highlights
                </a>
              )}
            </div>
          </div>
        )}
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
        {isLoading || !game ? (
          <ContentSkeleton />
        ) : (
          <>
            {/* BOX SCORE */}
            {activeTab === 'boxscore' && (
              <BoxScore game={game} />
            )}

            {/* KEY PLAYS */}
            {activeTab === 'plays' && (
              <KeyPlays game={game} />
            )}

            {/* LEADERS */}
            {activeTab === 'leaders' && (
              <Leaders game={game} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Scoreboard ───────────────────────────────────────────────────────────────

function Scoreboard({ game }: { game: GameDetail }) {
  const isLive = game.status === 'in'
  const isPost = game.status === 'post'

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="flex items-stretch">
        {/* Away */}
        <TeamScore
          team={game.awayTeam}
          isWinner={isPost && game.awayTeam.score > game.homeTeam.score}
          sportKey={game.sport}
        />

        {/* Middle: score / status */}
        <div className="flex flex-col items-center justify-center px-4 py-6 min-w-[100px] border-x border-border/40 bg-muted/20">
          {(isLive || isPost) ? (
            <>
              <div className="text-3xl font-black tabular-nums tracking-tight">
                {game.awayTeam.score}
                <span className="text-muted-foreground/50 mx-1.5 font-light">–</span>
                {game.homeTeam.score}
              </div>
              {isLive && (
                <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                  Live
                </span>
              )}
              {isPost && (
                <span className="mt-1.5 text-[10px] text-muted-foreground font-semibold">
                  {game.statusText}
                </span>
              )}
            </>
          ) : (
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">vs</p>
              <p className="text-[10px] text-muted-foreground mt-1">{game.statusText}</p>
            </div>
          )}
        </div>

        {/* Home */}
        <TeamScore
          team={game.homeTeam}
          isWinner={isPost && game.homeTeam.score > game.awayTeam.score}
          sportKey={game.sport}
          isHome
        />
      </div>
    </div>
  )
}

function TeamScore({
  team,
  isWinner,
  sportKey,
  isHome = false,
}: {
  team: GameDetail['homeTeam']
  isWinner: boolean
  sportKey: SportKey
  isHome?: boolean
}) {
  return (
    <Link
      href={`/teams/${sportKey}/${team.id}`}
      className={cn(
        'flex-1 flex flex-col items-center justify-center gap-2 py-6 px-3 hover:bg-muted/30 transition-colors group',
        isHome && 'border-r-0',
      )}
    >
      {team.logo && (
        <div className="relative w-14 h-14">
          <Image src={team.logo} alt={team.name} fill className="object-contain" unoptimized />
        </div>
      )}
      <div className="text-center">
        <p className={cn(
          'text-xs font-bold',
          isWinner ? 'text-foreground' : 'text-muted-foreground',
        )}>
          {team.abbreviation}
        </p>
        {isHome && (
          <p className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Home</p>
        )}
        {!isHome && (
          <p className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Away</p>
        )}
      </div>
      {isWinner && (
        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider">Win</span>
      )}
      <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
    </Link>
  )
}

// ─── Box Score ────────────────────────────────────────────────────────────────

function BoxScore({ game }: { game: GameDetail }) {
  const hasStats =
    game.homeTeam.stats.length > 0 || game.awayTeam.stats.length > 0

  if (!hasStats) {
    return (
      <EmptyState
        icon="📊"
        message={
          game.status === 'pre'
            ? 'Stats will appear when the game starts'
            : 'No box score data available'
        }
      />
    )
  }

  // Merge stat labels from both teams
  const labels = Array.from(
    new Set([
      ...game.awayTeam.stats.map(s => s.label),
      ...game.homeTeam.stats.map(s => s.label),
    ]),
  ).slice(0, 10)

  function getStat(stats: Array<{ label: string; value: string }>, label: string) {
    return stats.find(s => s.label === label)?.value ?? '—'
  }

  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 bg-muted/30">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Stat</th>
            <th className="text-center px-3 py-3 text-xs font-semibold text-foreground/80">
              {game.awayTeam.abbreviation}
            </th>
            <th className="text-center px-3 py-3 text-xs font-semibold text-foreground/80">
              {game.homeTeam.abbreviation}
            </th>
          </tr>
        </thead>
        <tbody>
          {labels.map((label, i) => {
            const av = getStat(game.awayTeam.stats, label)
            const hv = getStat(game.homeTeam.stats, label)
            const aN = parseFloat(av)
            const hN = parseFloat(hv)
            const awayWins = !isNaN(aN) && !isNaN(hN) && aN > hN
            const homeWins = !isNaN(aN) && !isNaN(hN) && hN > aN

            return (
              <tr
                key={label}
                className={cn(
                  'border-b border-border/30 last:border-0',
                  i % 2 === 0 ? 'bg-transparent' : 'bg-muted/10',
                )}
              >
                <td className="px-4 py-2.5 text-xs text-muted-foreground font-medium">{label}</td>
                <td className={cn(
                  'px-3 py-2.5 text-center text-xs font-bold tabular-nums',
                  awayWins ? 'text-primary' : 'text-foreground/70',
                )}>
                  {av}
                </td>
                <td className={cn(
                  'px-3 py-2.5 text-center text-xs font-bold tabular-nums',
                  homeWins ? 'text-primary' : 'text-foreground/70',
                )}>
                  {hv}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Key Plays ────────────────────────────────────────────────────────────────

function KeyPlays({ game }: { game: GameDetail }) {
  const plays = game.keyPlays ?? []

  if (plays.length === 0) {
    return (
      <EmptyState
        icon="⚡"
        message={
          game.status === 'pre'
            ? 'Key plays will appear during the game'
            : 'No play data available'
        }
      />
    )
  }

  return (
    <div className="space-y-2">
      {[...plays].reverse().map((play, i) => (
        <div
          key={i}
          className="flex gap-3 p-3 rounded-xl border border-border/50 bg-card"
        >
          <div className="flex items-start gap-2 flex-1">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <ListOrdered className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground leading-snug">{play.text}</p>
              <div className="flex items-center gap-2 mt-1">
                {play.clock && (
                  <span className="text-[10px] text-muted-foreground font-mono">{play.clock}</span>
                )}
                {play.team && (
                  <span className="text-[10px] text-muted-foreground">{play.team}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Leaders ──────────────────────────────────────────────────────────────────

function Leaders({ game }: { game: GameDetail }) {
  const leaders = game.leaders ?? []

  if (leaders.length === 0) {
    return (
      <EmptyState
        icon="🏆"
        message={
          game.status === 'pre'
            ? 'Leaders will appear when the game starts'
            : 'No leader data available'
        }
      />
    )
  }

  // Group by team
  const byTeam: Record<string, typeof leaders> = {}
  for (const l of leaders) {
    if (!byTeam[l.team]) byTeam[l.team] = []
    byTeam[l.team].push(l)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Object.entries(byTeam).map(([team, entries]) => (
        <div key={team} className="rounded-2xl border border-border/60 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/40 bg-muted/30">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{team}</h3>
          </div>
          <div className="divide-y divide-border/30">
            {entries.map((l, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-bold">{l.player}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">
                    {l.category}
                  </p>
                </div>
                <span className="text-lg font-black text-primary tabular-nums">{l.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <p className="text-3xl mb-2">{icon}</p>
      <p className="text-sm">{message}</p>
    </div>
  )
}

function ScoreboardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden">
      <div className="flex items-stretch h-36">
        <Skeleton className="flex-1 m-4 rounded-xl" />
        <div className="w-24 flex flex-col items-center justify-center gap-2 border-x border-border/40">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-4 w-12 rounded" />
        </div>
        <Skeleton className="flex-1 m-4 rounded-xl" />
      </div>
    </div>
  )
}

function ContentSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 rounded-xl" />
      ))}
    </div>
  )
}
