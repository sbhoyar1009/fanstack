import { NextRequest, NextResponse } from 'next/server'
import { getStandings } from '@/lib/espn'
import { withCache, TTL } from '@/lib/redis'
import type { Standing, SportKey } from '@/types/sports'

// GET /api/sports/standings?sport=nba
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sport = searchParams.get('sport') as SportKey | null

  if (!sport) {
    return NextResponse.json({ error: 'Missing ?sport param' }, { status: 400 })
  }

  try {
    const standings = await withCache<Standing[]>(
      `standings:${sport}`,
      TTL.STANDINGS,
      () => getStandings(sport)
    )

    return NextResponse.json({ standings }, {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=60' }
    })
  } catch (err) {
    console.error('[/api/sports/standings]', err)
    return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 })
  }
}
