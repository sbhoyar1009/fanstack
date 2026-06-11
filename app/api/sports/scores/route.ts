import { NextRequest, NextResponse } from 'next/server'
import { getScores } from '@/lib/espn'
import { withCache, TTL } from '@/lib/redis'
import type { NormalizedGame, SportKey } from '@/types/sports'

// GET /api/sports/scores?sports=nba,epl
// GET /api/sports/scores?sports=nba,epl&dates=20260525,20260526,20260527
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sportsParam = searchParams.get('sports')
  const datesParam  = searchParams.get('dates')

  if (!sportsParam) {
    return NextResponse.json({ error: 'Missing ?sports param' }, { status: 400 })
  }

  const sportKeys  = sportsParam.split(',').filter(Boolean) as SportKey[]
  // If dates provided, fetch each one; otherwise fetch today (no date = ESPN default)
  const dates      = datesParam ? datesParam.split(',').filter(Boolean) : [undefined as unknown as string]

  // Determine today's string for TTL selection (yyyyMMdd)
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  function getTtl(date: string | undefined): number {
    if (!date || date === todayStr) return TTL.LIVE        // today: 30 s
    if (date > todayStr)           return TTL.UPCOMING    // future: 5 min
    return TTL.FINISHED                                    // past: 1 h
  }

  try {
    const tasks = sportKeys.flatMap((key) =>
      dates.map((date) => {
        const cacheKey = date ? `scores:${key}:${date}` : `scores:${key}`
        return withCache<NormalizedGame[]>(
          cacheKey,
          getTtl(date),
          () => getScores(key, date),
        )
      }),
    )

    const results = await Promise.allSettled(tasks)
    const allGames: NormalizedGame[] = []
    results.forEach((r) => {
      if (r.status === 'fulfilled') allGames.push(...r.value)
    })

    // Dedupe by id (same game may appear when fetching overlapping date windows)
    const seen = new Set<string>()
    const unique = allGames.filter((g) => {
      if (seen.has(g.id)) return false
      seen.add(g.id)
      return true
    })

    const sorted = unique.sort((a, b) => {
      const order = { in: 0, pre: 1, post: 2 }
      const diff  = order[a.status] - order[b.status]
      if (diff !== 0) return diff
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    })

    return NextResponse.json({ games: sorted }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=10' },
    })
  } catch (err) {
    console.error('[/api/sports/scores]', err)
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
  }
}
