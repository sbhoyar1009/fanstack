import { NextRequest, NextResponse } from 'next/server'
import { getNews, SPORT_CONFIGS } from '@/lib/espn'
import { TTL } from '@/lib/redis'
import type { SportKey } from '@/types/sports'

const INJURY_KEYWORDS = ['injur', 'out', 'day-to-day', 'ir ', 'injured reserve', 'surgery', 'strain', 'sprain', 'fractured', 'torn', 'hamstring', 'knee', 'ankle', 'questionable', 'doubtful']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sportsParam = searchParams.get('sports')
  const sports: SportKey[] = sportsParam
    ? (sportsParam.split(',') as SportKey[])
    : (Object.keys(SPORT_CONFIGS) as SportKey[])

  try {
    const newsArrays = await Promise.allSettled(
      sports.map(s => getNews(s))
    )

    const allNews = newsArrays
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getNews>>> => r.status === 'fulfilled')
      .flatMap(r => r.value)

    void TTL // suppress unused warning

    const injuries = allNews.filter(item => {
      const text = `${item.headline} ${item.description}`.toLowerCase()
      return INJURY_KEYWORDS.some(kw => text.includes(kw))
    }).slice(0, 30)

    return NextResponse.json({ injuries })
  } catch (err) {
    console.error('[/api/injuries]', err)
    return NextResponse.json({ injuries: [] })
  }
}
