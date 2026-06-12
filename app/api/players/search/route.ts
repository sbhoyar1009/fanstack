import { NextRequest, NextResponse } from 'next/server'
import { SPORT_CONFIGS } from '@/lib/espn'
import type { SportKey } from '@/types/sports'

const ESPN_SITE = 'https://site.api.espn.com/apis/site/v2/sports'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q     = searchParams.get('q')?.trim()
  const sport = searchParams.get('sport') as SportKey | null

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const sports: SportKey[] = sport
    ? [sport]
    : (Object.keys(SPORT_CONFIGS) as SportKey[]).filter(s => s !== 'f1')

  try {
    const results = await Promise.allSettled(
      sports.slice(0, 4).map(async (s) => {
        const { path } = SPORT_CONFIGS[s]
        const url = `${ESPN_SITE}/${path}/athletes?limit=5&active=true&search=${encodeURIComponent(q)}`
        const res = await fetch(url, {
          next: { revalidate: 300 },
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) return []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await res.json() as any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (data?.items ?? data?.athletes ?? []).slice(0, 3).map((a: any) => ({
          id:       a.id ?? '',
          name:     a.displayName ?? a.shortName ?? '',
          position: a.position?.abbreviation ?? a.position?.name ?? '',
          team:     a.team?.displayName ?? a.team?.shortDisplayName ?? '',
          headshot: a.headshot?.href,
          sport:    s,
          league:   SPORT_CONFIGS[s].name,
        }))
      })
    )

    const athletes = results
      .filter((r): r is PromiseFulfilledResult<unknown[]> => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .slice(0, 10)

    return NextResponse.json({ results: athletes })
  } catch (err) {
    console.error('[/api/players/search]', err)
    return NextResponse.json({ results: [] })
  }
}
