'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import type { NormalizedGame, NewsItem, SportKey } from '@/types/sports'
import { ScoreCard } from '@/components/scores/ScoreCard'
import { NewsCard } from '@/components/feed/NewsCard'
import { CatchMeUp } from '@/components/feed/CatchMeUp'

interface HomeFeedClientProps {
  liveGames:   NormalizedGame[]
  todayGames:  NormalizedGame[]
  recentGames: NormalizedGame[]
  news:        NewsItem[]
  sportKeys:   SportKey[]
  followedTeamIds: string[]
}

export function HomeFeedClient({ liveGames, todayGames, recentGames, news }: HomeFeedClientProps) {
  const [selectedGame, setSelectedGame] = useState<NormalizedGame | null>(null)

  const hasGames = liveGames.length > 0 || todayGames.length > 0 || recentGames.length > 0

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-10">

      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting()}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>
      </div>

      {/* ── Live now ─────────────────────────────────────────── */}
      {liveGames.length > 0 && (
        <section className="space-y-3">
          <SectionLabel icon="🔴" title="Live Right Now" count={liveGames.length} pulse />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {liveGames.map((g) => (
              <ScoreCard key={g.id} game={g} onClick={() => setSelectedGame(g)} />
            ))}
          </div>
        </section>
      )}

      {/* ── Today's games ────────────────────────────────────── */}
      {todayGames.length > 0 && (
        <section className="space-y-3">
          <SectionLabel icon="📅" title="On Today" count={todayGames.length} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {todayGames.slice(0, 6).map((g) => (
              <ScoreCard key={g.id} game={g} onClick={() => setSelectedGame(g)} />
            ))}
          </div>
        </section>
      )}

      {/* ── Catch me up ──────────────────────────────────────── */}
      {recentGames.length > 0 && (
        <section className="space-y-3">
          <SectionLabel icon="✦" title="Catch Me Up" subtitle="Click any card for an AI summary" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentGames.map((g) => (
              <ScoreCard key={g.id} game={g} onClick={() => setSelectedGame(g)} compact />
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {!hasGames && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-5xl mb-4">😴</p>
          <h2 className="text-base font-semibold">Quiet day in sports</h2>
          <p className="text-sm text-muted-foreground mt-1">No games for your teams today</p>
        </div>
      )}

      {/* ── News ─────────────────────────────────────────────── */}
      {news.length > 0 && (
        <section className="space-y-3">
          <SectionLabel icon="📰" title="Latest News" />
          <div className="space-y-2">
            {news.map((n) => <NewsCard key={n.id} item={n} />)}
          </div>
        </section>
      )}

      {selectedGame && (
        <CatchMeUp game={selectedGame} onClose={() => setSelectedGame(null)} />
      )}
    </div>
  )
}

function SectionLabel({
  icon, title, count, subtitle, pulse,
}: {
  icon: string; title: string; count?: number; subtitle?: string; pulse?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={pulse ? 'animate-pulse' : ''}>{icon}</span>
      <h2 className="text-sm font-bold tracking-tight text-foreground">{title}</h2>
      {count != null && (
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-medium">
          {count}
        </span>
      )}
      {subtitle && (
        <span className="text-xs text-muted-foreground hidden sm:block">{subtitle}</span>
      )}
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning 👋'
  if (h < 17) return 'Good afternoon 👋'
  return 'Good evening 👋'
}
