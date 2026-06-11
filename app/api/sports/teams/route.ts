import { NextRequest, NextResponse } from 'next/server'
import { getTeams } from '@/lib/espn'
import { withCache, TTL } from '@/lib/redis'
import type { ESPNTeam, SportKey } from '@/types/sports'

// GET /api/sports/teams?sport=nba
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sport = searchParams.get('sport') as SportKey | null

  if (!sport) {
    return NextResponse.json({ error: 'Missing ?sport param' }, { status: 400 })
  }

  try {
    const teams = await withCache<ESPNTeam[]>(
      `teams:${sport}`,
      TTL.TEAMS,
      () => getTeams(sport)
    )

    return NextResponse.json({ teams }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' }
    })
  } catch (err) {
    console.error('[/api/sports/teams]', err)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}
