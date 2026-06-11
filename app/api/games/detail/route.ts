import { NextRequest, NextResponse } from 'next/server'
import { getGameDetail } from '@/lib/espn-detail'
import { withCache, TTL } from '@/lib/redis'
import type { SportKey } from '@/types/sports'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sport  = searchParams.get('sport') as SportKey | null
  const gameId = searchParams.get('gameId')

  if (!sport || !gameId) {
    return NextResponse.json({ error: 'Missing ?sport or ?gameId' }, { status: 400 })
  }

  // Use shorter TTL for live games so box score updates; longer for finished
  const game = await withCache(
    `game-detail:${sport}:${gameId}`,
    TTL.UPCOMING,
    () => getGameDetail(sport, gameId),
  )

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  return NextResponse.json({ game })
}
