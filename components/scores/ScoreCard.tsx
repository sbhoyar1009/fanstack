'use client'

import Image from 'next/image'
import { PlayCircle } from 'lucide-react'
import { LiveBadge } from './LiveBadge'
import type { NormalizedGame } from '@/types/sports'
import { SPORT_CONFIGS } from '@/lib/espn'
import { cn } from '@/lib/utils'

interface ScoreCardProps {
  game: NormalizedGame
  onClick?: () => void
  compact?: boolean
}

function buildYouTubeUrl(game: NormalizedGame): string {
  const q = `${game.awayTeam.name} vs ${game.homeTeam.name} highlights ${game.league}`
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
}

// Subtle sport accent for card left border
const SPORT_ACCENT: Record<string, string> = {
  nba:    'border-l-orange-500',
  nfl:    'border-l-green-500',
  epl:    'border-l-purple-500',
  laliga: 'border-l-red-500',
  f1:     'border-l-red-600',
  mlb:    'border-l-blue-500',
  nhl:    'border-l-sky-500',
}

export function ScoreCard({ game, onClick, compact = false }: ScoreCardProps) {
  const config  = SPORT_CONFIGS[game.sport]
  const isLive  = game.status === 'in'
  const isPre   = game.status === 'pre'
  const isPost  = game.status === 'post'
  const accent  = SPORT_ACCENT[game.sport] ?? 'border-l-primary'

  return (
    <div
      className={cn(
        'group relative rounded-2xl border border-border/60 bg-card transition-all duration-200',
        'hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30 hover:-translate-y-0.5',
        'border-l-2',
        accent,
        isLive && 'ring-1 ring-red-500/30',
        compact ? 'p-3' : 'p-4'
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-muted-foreground font-semibold tracking-wide uppercase">
          {config.emoji} {game.league}
        </span>

        <div className="flex items-center gap-2">
          {isPost && (
            <a
              href={buildYouTubeUrl(game)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Watch highlights"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[#FF0000] hover:scale-110 active:scale-95 transition-transform"
            >
              <PlayCircle className="w-4 h-4" />
            </a>
          )}

          {isLive ? (
            <LiveBadge statusText={game.statusText} />
          ) : isPre ? (
            <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
              {game.statusText}
            </span>
          ) : (
            <span className="text-[11px] font-bold text-muted-foreground tracking-wide uppercase">
              Final
            </span>
          )}
        </div>
      </div>

      {/* Teams — clickable */}
      <button
        onClick={onClick}
        className="w-full text-left space-y-2.5"
      >
        <TeamRow
          team={game.awayTeam}
          isWinner={isPost && (game.awayTeam.score ?? 0) > (game.homeTeam.score ?? 0)}
          showScore={!isPre}
          compact={compact}
        />
        <div className="h-px bg-border/50" />
        <TeamRow
          team={game.homeTeam}
          isWinner={isPost && (game.homeTeam.score ?? 0) > (game.awayTeam.score ?? 0)}
          showScore={!isPre}
          compact={compact}
        />
      </button>

      {/* Footer */}
      {!compact && (
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
          <p className="text-[11px] text-muted-foreground truncate max-w-[70%]">
            {game.venue ?? (game.broadcast ? `📺 ${game.broadcast}` : '')}
          </p>
          {isPost && (
            <span className="text-[10px] text-muted-foreground/60 font-medium">
              Tap for summary ✦
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function TeamRow({
  team,
  isWinner,
  showScore,
  compact,
}: {
  team: NormalizedGame['homeTeam']
  isWinner: boolean
  showScore: boolean
  compact: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      {team.logo ? (
        <div className={cn('relative shrink-0', compact ? 'w-6 h-6' : 'w-8 h-8')}>
          <Image src={team.logo} alt={team.name} fill className="object-contain" unoptimized />
        </div>
      ) : (
        <div className={cn(
          'shrink-0 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground',
          compact ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'
        )}>
          {team.abbreviation.slice(0, 2)}
        </div>
      )}

      <span className={cn(
        'flex-1 truncate',
        compact ? 'text-xs' : 'text-sm',
        isWinner ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
      )}>
        {team.name}
      </span>

      {showScore && (
        <span className={cn(
          'tabular-nums font-bold',
          compact ? 'text-sm' : 'text-lg',
          isWinner ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {team.score ?? '—'}
        </span>
      )}
    </div>
  )
}
