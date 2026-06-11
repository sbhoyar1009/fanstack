'use client'

import { Sparkles, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { TeamBriefResult } from '@/lib/teambrief'
import { SPORT_CONFIGS } from '@/lib/espn'

interface WhatDidIMissProps {
  teams: TeamBriefResult[]
  lastOpenedAt: string
  updatedAt: string
}

export function WhatDidIMiss({ teams, lastOpenedAt, updatedAt }: WhatDidIMissProps) {
  const hasStale = teams.some((t) => t.stale)
  const since = formatSince(lastOpenedAt)
  const refreshedAt = new Date(updatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">What Did I Miss?</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Since {since}</p>
        </div>
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="w-3.5 h-3.5" />
            Feed
          </Button>
        </Link>
      </div>

      {/* Stale banner */}
      {hasStale && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Some scores unavailable — ESPN may be rate-limited. </span>
          <a href="/catchup" className="font-semibold underline underline-offset-2">Retry</a>
        </div>
      )}

      {/* Team briefs */}
      {teams.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {teams.map((team) => (
            <TeamBriefCard key={`${team.sportKey}-${team.teamId}`} team={team} />
          ))}
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-[10px] text-muted-foreground/50 pt-2">
        Refreshed at {refreshedAt} · <RefreshCw className="w-2.5 h-2.5 inline" /> updates on each visit
      </p>
    </div>
  )
}

function TeamBriefCard({ team }: { team: TeamBriefResult }) {
  const config = SPORT_CONFIGS[team.sportKey]
  const hasContent = team.brief || team.recentGames.length > 0

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      {/* Team header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">{config?.emoji ?? '🏆'}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{team.teamName}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{config?.name ?? team.sportKey}</p>
          </div>
        </div>
        {team.stale && (
          <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
            stale
          </span>
        )}
      </div>

      {/* Brief / content */}
      <div className="px-4 py-3 space-y-3">
        {!hasContent && !team.stale ? (
          <p className="text-sm text-muted-foreground">No games since your last visit.</p>
        ) : !hasContent && team.stale ? (
          <p className="text-sm text-muted-foreground">Scores unavailable — check back shortly.</p>
        ) : (
          <>
            {/* Recent games */}
            {team.recentGames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {team.recentGames.map((g, i) => (
                  <span key={i}
                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium ${
                      g.result.startsWith('W')
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : g.result.startsWith('L')
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {g.result} {g.opponent} · {g.date}
                  </span>
                ))}
              </div>
            )}

            {/* AI brief */}
            {team.brief ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wide">AI Brief</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground">{team.brief}</p>
              </div>
            ) : team.recentGames.length > 0 ? (
              <p className="text-xs text-muted-foreground">Brief unavailable — ESPN data shown above.</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export function WhatDidIMissSkeleton() {
  return (
    <div className="space-y-4 max-w-2xl mx-auto px-4 py-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-44 rounded-lg" />
        <Skeleton className="h-4 w-32 rounded-lg" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 bg-muted/20">
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
          <div className="px-4 py-3 space-y-2">
            <div className="flex gap-1.5">
              <Skeleton className="h-6 w-20 rounded-lg" />
              <Skeleton className="h-6 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-3.5 w-full rounded-full" />
            <Skeleton className="h-3.5 w-5/6 rounded-full" />
            <Skeleton className="h-3.5 w-3/4 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl mb-3">✅</span>
      <h2 className="text-base font-semibold">You&apos;re all caught up</h2>
      <p className="text-sm text-muted-foreground mt-1">No games for your teams since your last visit.</p>
      <Link href="/" className="mt-4">
        <Button variant="outline" size="sm">Back to feed</Button>
      </Link>
    </div>
  )
}

function formatSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (days >= 2) return `${days} days ago`
  if (days === 1) return 'yesterday'
  if (hours >= 2) return `${hours} hours ago`
  if (hours === 1) return '1 hour ago'
  return 'recently'
}
