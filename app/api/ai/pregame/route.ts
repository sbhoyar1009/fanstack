import { NextRequest, NextResponse } from 'next/server'
import { generatePreMatchPreview } from '@/lib/anthropic'
import { withCache, TTL } from '@/lib/redis'
import type { SportKey } from '@/types/sports'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { homeTeam, awayTeam, league, kickoffTime, homeForm, awayForm, stakes, gameId, sport } = body as {
    homeTeam: string
    awayTeam: string
    league: string
    kickoffTime: string
    homeForm: string[]
    awayForm: string[]
    stakes?: string
    gameId: string
    sport: SportKey
  }

  if (!homeTeam || !awayTeam || !gameId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const preview = await withCache(
      `pregame-preview:${sport}:${gameId}`,
      TTL.UPCOMING,
      () => generatePreMatchPreview({ homeTeam, awayTeam, league, kickoffTime, homeForm: homeForm ?? [], awayForm: awayForm ?? [], stakes }),
    )
    return NextResponse.json({ preview })
  } catch (err) {
    console.error('[/api/ai/pregame]', err)
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
  }
}
