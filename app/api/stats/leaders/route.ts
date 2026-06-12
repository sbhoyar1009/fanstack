import { NextRequest, NextResponse } from 'next/server'
import { getLeagueLeaders } from '@/lib/espn-detail'
import { withCache, TTL } from '@/lib/redis'
import type { SportKey } from '@/types/sports'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sport = searchParams.get('sport') as SportKey | null

  if (!sport) {
    return NextResponse.json({ error: 'Missing ?sport' }, { status: 400 })
  }

  try {
    const leaders = await withCache(
      `league-leaders:${sport}`,
      TTL.STANDINGS,
      () => getLeagueLeaders(sport),
    )
    return NextResponse.json({ leaders })
  } catch (err) {
    console.error('[/api/stats/leaders]', err)
    return NextResponse.json({ leaders: [] })
  }
}
