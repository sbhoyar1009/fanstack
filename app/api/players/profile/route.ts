import { NextRequest, NextResponse } from 'next/server'
import { getPlayerProfile } from '@/lib/espn-detail'
import { withCache, TTL } from '@/lib/redis'
import type { SportKey } from '@/types/sports'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sport     = searchParams.get('sport') as SportKey | null
  const athleteId = searchParams.get('athleteId')

  if (!sport || !athleteId) {
    return NextResponse.json({ error: 'Missing ?sport or ?athleteId' }, { status: 400 })
  }

  if (sport === 'f1') {
    return NextResponse.json({ error: 'F1 player profiles not supported' }, { status: 422 })
  }

  try {
    const profile = await withCache(
      `player-profile:${sport}:${athleteId}`,
      TTL.TEAMS,
      () => getPlayerProfile(sport, athleteId),
    )
    if (!profile) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    return NextResponse.json({ profile })
  } catch (err) {
    console.error('[/api/players/profile]', err)
    return NextResponse.json({ error: 'Failed to fetch player profile' }, { status: 500 })
  }
}
