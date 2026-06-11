import { NextRequest, NextResponse } from 'next/server'
import { getGameDetail } from '@/lib/espn-detail'
import { cacheGet, cacheSet, TTL } from '@/lib/redis'
import type { SportKey } from '@/types/sports'
import type { GameDetail } from '@/lib/espn-detail'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sport  = searchParams.get('sport') as SportKey | null
  const gameId = searchParams.get('gameId')

  if (!sport || !gameId) {
    return NextResponse.json({ error: 'Missing ?sport or ?gameId' }, { status: 400 })
  }

  try {
    const cacheKey = `game-detail:${sport}:${gameId}`
    let game = await cacheGet<GameDetail>(cacheKey)

    if (!game) {
      game = await getGameDetail(sport, gameId)
      if (game) {
        // Live games: 30s so box score updates match the client's refresh interval.
        // Finished games: 1h (box score won't change). Pre-game: 5 min.
        const ttl = game.status === 'in' ? TTL.LIVE
          : game.status === 'post' ? TTL.FINISHED
          : TTL.UPCOMING
        await cacheSet(cacheKey, game, ttl)
      }
    }

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    return NextResponse.json({ game })
  } catch (err) {
    console.error('[/api/games/detail]', err)
    return NextResponse.json({ error: 'Failed to fetch game detail' }, { status: 500 })
  }
}
