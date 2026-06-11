'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { NormalizedGame } from '@/types/sports'
import Image from 'next/image'
import { Sparkles, PlayCircle } from 'lucide-react'

interface CatchMeUpProps {
  game: NormalizedGame
  onClose: () => void
}

function buildYouTubeUrl(game: NormalizedGame): string {
  const q = `${game.awayTeam.name} vs ${game.homeTeam.name} highlights ${game.league}`
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
}

export function CatchMeUp({ game, onClose }: CatchMeUpProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const isFinished = game.status === 'post'

  async function fetchSummary() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/ai/catchmeup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ gameId: game.id, sportKey: game.sport }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate summary')
      setSummary(data.summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm rounded-2xl border-border/60 p-0 overflow-hidden">
        {/* Score hero */}
        <div className="bg-gradient-to-br from-muted/60 to-muted/30 px-6 pt-6 pb-5 border-b border-border/40">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-sm font-semibold text-muted-foreground text-center tracking-wide uppercase">
              {game.league} · {isFinished ? 'Final' : game.statusText}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between gap-4">
            <ScoreTeam team={game.awayTeam} isWinner={isFinished && (game.awayTeam.score ?? 0) > (game.homeTeam.score ?? 0)} />

            <div className="flex flex-col items-center shrink-0">
              {isFinished && game.awayTeam.score != null ? (
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-black tabular-nums">{game.awayTeam.score}</span>
                  <span className="text-xl text-muted-foreground font-light">—</span>
                  <span className="text-4xl font-black tabular-nums">{game.homeTeam.score}</span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">vs</span>
              )}
            </div>

            <ScoreTeam team={game.homeTeam} isWinner={isFinished && (game.homeTeam.score ?? 0) > (game.awayTeam.score ?? 0)} />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 space-y-3">
          {/* YouTube */}
          {isFinished && (
            <a
              href={buildYouTubeUrl(game)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-xl bg-[#FF0000]/10 hover:bg-[#FF0000]/20 text-[#FF0000] text-sm font-semibold transition-all duration-150 border border-[#FF0000]/15 active:scale-[0.98]"
            >
              <PlayCircle className="w-4 h-4" />
              Watch highlights on YouTube
            </a>
          )}

          {/* AI Summary */}
          {!isFinished ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              AI summaries available once the game ends
            </p>
          ) : summary ? (
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wide">AI Summary</span>
              </div>
              <p className="text-sm leading-relaxed text-foreground">{summary}</p>
            </div>
          ) : loading ? (
            <div className="space-y-2 py-1">
              <Skeleton className="h-3.5 w-full rounded-full" />
              <Skeleton className="h-3.5 w-5/6 rounded-full" />
              <Skeleton className="h-3.5 w-4/6 rounded-full" />
            </div>
          ) : (
            <div className="text-center">
              {error && <p className="text-xs text-destructive mb-2">{error}</p>}
              <Button
                onClick={fetchSummary}
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Catch me up
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ScoreTeam({ team, isWinner }: { team: NormalizedGame['homeTeam']; isWinner: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
      {team.logo ? (
        <div className="relative w-12 h-12">
          <Image src={team.logo} alt={team.name} fill className="object-contain drop-shadow-sm" unoptimized />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
          {team.abbreviation.slice(0, 2)}
        </div>
      )}
      <span className={`text-xs font-semibold text-center leading-tight line-clamp-2 ${isWinner ? 'text-foreground' : 'text-muted-foreground'}`}>
        {team.name}
      </span>
    </div>
  )
}
