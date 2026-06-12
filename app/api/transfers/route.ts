import { NextRequest, NextResponse } from 'next/server'
import { getNews } from '@/lib/espn'
import type { SportKey } from '@/types/sports'

const TRANSFER_KEYWORDS = ['transfer', 'signing', 'signs', 'loan', 'deal', 'contract', 'trade', 'traded', 'signed', 'move', 'joins', 'linked', 'target', 'fee', 'release', 'free agent']
const DEFAULT_SPORTS: SportKey[] = ['epl', 'laliga', 'ucl', 'uel', 'mls', 'nba', 'nfl', 'mlb']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sportsParam = searchParams.get('sports')
  const sports: SportKey[] = sportsParam
    ? (sportsParam.split(',') as SportKey[])
    : DEFAULT_SPORTS

  try {
    const newsArrays = await Promise.allSettled(
      sports.map(s => getNews(s))
    )

    const allNews = newsArrays
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getNews>>> => r.status === 'fulfilled')
      .flatMap(r => r.value)

    const transfers = allNews.filter(item => {
      const text = `${item.headline} ${item.description}`.toLowerCase()
      return TRANSFER_KEYWORDS.some(kw => text.includes(kw))
    }).slice(0, 30)

    return NextResponse.json({ transfers })
  } catch (err) {
    console.error('[/api/transfers]', err)
    return NextResponse.json({ transfers: [] })
  }
}
