'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { format } from 'date-fns'
import type { TeamBriefResult } from '@/lib/teambrief'
import { Skeleton } from '@/components/ui/skeleton'
import { SPORT_CONFIGS } from '@/lib/espn'
import type { SportKey } from '@/types/sports'
import { Sparkles, Clock, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type DigestData = {
  digest: { teams: TeamBriefResult[]; generatedAt: string }
  fromCache: boolean
  history: Array<{ id: string; generated_at: string; content: { teams: TeamBriefResult[]; generatedAt: string } }>
}

export default function DigestPage() {
  const { data, isLoading, error, mutate } = useSWR<DigestData>('/api/digest', fetcher)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Daily Digest</h1>
            <p className="text-[11px] text-muted-foreground">AI briefing for all your teams</p>
          </div>
        </div>
        {data && (
          <button
            onClick={() => mutate()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border/60 hover:bg-muted/40"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        )}
      </div>

      {isLoading ? (
        <DigestSkeleton />
      ) : error ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-3xl mb-2">⚠️</p>
          <p className="text-sm">Failed to load digest. Try again.</p>
        </div>
      ) : !data?.digest?.teams?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-3xl mb-3">🏀</p>
          <p className="text-sm font-semibold mb-1">No teams to digest</p>
          <p className="text-xs mb-4">Follow some teams first to get your daily brief.</p>
          <Link href="/settings/sports" className="text-xs text-primary underline underline-offset-2">
            Set up your teams →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.fromCache && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 mb-4">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Today&apos;s digest generated at{' '}
                {format(new Date(data.digest.generatedAt), 'h:mm a')}
              </span>
            </div>
          )}

          {data.digest.teams.map((team) => {
            const config = SPORT_CONFIGS[team.sportKey]
            return (
              <div
                key={team.teamId}
                className="rounded-2xl border border-border/60 bg-card p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{config?.emoji}</span>
                    <div>
                      <p className="text-sm font-bold">{team.teamName}</p>
                      <p className="text-[10px] text-muted-foreground">{config?.name}</p>
                    </div>
                  </div>
                  <Link
                    href={`/teams/${team.sportKey}/${team.teamId}`}
                    className="text-[10px] text-primary hover:underline font-semibold"
                  >
                    View →
                  </Link>
                </div>

                {team.brief ? (
                  <p className="text-sm leading-relaxed text-foreground/90">{team.brief}</p>
                ) : team.stale ? (
                  <p className="text-xs text-muted-foreground italic">No recent activity</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No news since last visit</p>
                )}

                {team.recentGames.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Form</span>
                    {team.recentGames.map((g, i) => {
                      const r = g.result?.[0]
                      return (
                        <span
                          key={i}
                          className={cn(
                            'w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center',
                            r === 'W' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : r === 'L' ? 'bg-red-500/15 text-red-500'
                            : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {r ?? '—'}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DigestSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
        </div>
      ))}
    </div>
  )
}
