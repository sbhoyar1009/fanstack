'use client'

import { useState } from 'react'
import { ScoreCard } from './ScoreCard'
import { CatchMeUp } from '@/components/feed/CatchMeUp'
import type { NormalizedGame } from '@/types/sports'
import { Skeleton } from '@/components/ui/skeleton'

interface ScoreGridProps {
  games: NormalizedGame[]
  isLoading?: boolean
}

export function ScoreGrid({ games, isLoading }: ScoreGridProps) {
  const [selectedGame, setSelectedGame] = useState<NormalizedGame | null>(null)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-2xl mb-2">📭</p>
        <p className="text-sm">No games found for your sports right now</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {games.map((game) => (
          <ScoreCard
            key={game.id}
            game={game}
            onClick={() => setSelectedGame(game)}
          />
        ))}
      </div>

      {selectedGame && (
        <CatchMeUp
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </>
  )
}
