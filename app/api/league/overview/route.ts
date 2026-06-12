import { NextRequest, NextResponse } from 'next/server'
import { getDetailedStandings, getLeagueLeaders } from '@/lib/espn-detail'
import { getNews } from '@/lib/espn'
import { withCache, TTL } from '@/lib/redis'
import type { SportKey } from '@/types/sports'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sport = searchParams.get('sport') as SportKey | null

  if (!sport) {
    return NextResponse.json({ error: 'Missing ?sport' }, { status: 400 })
  }

  try {
    const [standings, leaders, news] = await Promise.all([
      withCache(`standings-detail:${sport}`, TTL.STANDINGS, () => getDetailedStandings(sport)),
      withCache(`league-leaders:${sport}`, TTL.STANDINGS, () => getLeagueLeaders(sport)),
      withCache(`league-news:${sport}`, TTL.NEWS, () => getNews(sport)),
    ])

    return NextResponse.json({ standings, leaders, news: news.slice(0, 10) })
  } catch (err) {
    console.error('[/api/league/overview]', err)
    return NextResponse.json({ error: 'Failed to fetch league overview' }, { status: 500 })
  }
}
