import { NextRequest, NextResponse } from 'next/server'
import { getNews } from '@/lib/espn'
import { getGoogleNews } from '@/lib/googlenews'
import { withCache, TTL } from '@/lib/redis'
import { SPORT_CONFIGS } from '@/lib/espn'
import type { NewsItem, SportKey } from '@/types/sports'

// GET /api/sports/news?sports=nba,epl&teams=Lakers,Arsenal&limit=40
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sportsParam = searchParams.get('sports')
  const teamsParam  = searchParams.get('teams')   // comma-separated team names
  const limit       = Number(searchParams.get('limit') ?? '40')

  if (!sportsParam) {
    return NextResponse.json({ error: 'Missing ?sports param' }, { status: 400 })
  }

  const sportKeys  = sportsParam.split(',').filter(Boolean) as SportKey[]
  const allTeamNames = teamsParam ? teamsParam.split(',').filter(Boolean) : []

  // Build per-sport team name lists so each Google News query is targeted
  // We can't know which teams belong to which sport from names alone,
  // so we pass all team names for every sport query (Google News handles it fine)
  const teamNamesPerSport = allTeamNames

  try {
    const results = await Promise.allSettled(
      sportKeys.flatMap((key) => {
        const config = SPORT_CONFIGS[key]
        return [
          // ESPN — cached 10 min
          withCache<NewsItem[]>(`news:espn:${key}`, TTL.NEWS, () => getNews(key)),
          // Google News — cached 10 min, per sport+teams combo
          withCache<NewsItem[]>(
            `news:google:${key}:${teamNamesPerSport.slice(0, 8).join('-')}`,
            TTL.NEWS,
            () => getGoogleNews(key, config.name, teamNamesPerSport)
          ),
        ]
      })
    )

    const allNews: NewsItem[] = []
    results.forEach((r) => {
      if (r.status === 'fulfilled') allNews.push(...r.value)
    })

    // Dedupe by headline similarity + sort by date
    const seen = new Set<string>()
    const deduped = allNews
      .filter((n) => {
        const key = n.headline.toLowerCase().slice(0, 60)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
      .slice(0, limit)

    return NextResponse.json({ news: deduped }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    })
  } catch (err) {
    console.error('[/api/sports/news]', err)
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 })
  }
}
