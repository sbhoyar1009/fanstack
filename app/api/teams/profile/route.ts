import { NextRequest, NextResponse } from 'next/server'
import { getTeamProfile } from '@/lib/espn-detail'
import { withCache, TTL } from '@/lib/redis'
import type { SportKey } from '@/types/sports'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sport  = searchParams.get('sport') as SportKey | null
  const teamId = searchParams.get('teamId')

  if (!sport || !teamId) {
    return NextResponse.json({ error: 'Missing ?sport or ?teamId' }, { status: 400 })
  }

  const profile = await withCache(
    `team-profile:${sport}:${teamId}`,
    TTL.TEAMS,
    () => getTeamProfile(sport, teamId),
  )

  return NextResponse.json({ profile })
}
