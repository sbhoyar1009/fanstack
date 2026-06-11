import { NextRequest, NextResponse } from 'next/server'
import { getDetailedStandings } from '@/lib/espn-detail'
import { withCache, TTL } from '@/lib/redis'
import type { SportKey } from '@/types/sports'

export async function GET(req: NextRequest) {
  const sport = new URL(req.url).searchParams.get('sport') as SportKey | null
  if (!sport) return NextResponse.json({ error: 'Missing ?sport' }, { status: 400 })

  const groups = await withCache(`standings-detail:${sport}`, TTL.STANDINGS,
    () => getDetailedStandings(sport)
  )
  return NextResponse.json({ groups })
}
