import { XMLParser } from 'fast-xml-parser'
import type { NewsItem, SportKey } from '@/types/sports'

const parser = new XMLParser({
  ignoreAttributes: false,
  cdataPropName: '__cdata',
  allowBooleanAttributes: true,
})

interface RSSItem {
  title:       string | { __cdata: string }
  link:        string
  pubDate?:    string
  description?: string | { __cdata: string }
  source?:     string | { '#text': string; '@_url': string }
  guid?:       string | { '#text': string }
}

function text(v: string | { __cdata: string } | { '#text': string } | undefined): string {
  if (!v) return ''
  if (typeof v === 'string') return v
  if ('__cdata' in v) return v.__cdata
  if ('#text' in v) return v['#text']
  return ''
}

/**
 * Build a Google News RSS URL that searches for a sport's teams.
 * If teamNames are provided, builds an OR query so one request covers all teams.
 * Falls back to a plain sport name search if no teams are given.
 */
function buildGoogleNewsUrl(sportName: string, teamNames: string[]): string {
  const base = 'https://news.google.com/rss/search'
  const params = new URLSearchParams({
    hl: 'en-US',
    gl: 'US',
    ceid: 'US:en',
  })

  if (teamNames.length > 0) {
    // e.g. (Lakers OR Celtics OR Bulls) NBA
    const orClause = teamNames.slice(0, 8).map((n) => `"${n}"`).join(' OR ')
    params.set('q', `(${orClause}) ${sportName} highlights OR recap OR news`)
  } else {
    params.set('q', `${sportName} highlights OR recap OR news`)
  }

  return `${base}?${params.toString()}`
}

export async function getGoogleNews(
  sportKey: SportKey,
  sportName: string,
  teamNames: string[]
): Promise<NewsItem[]> {
  const url = buildGoogleNewsUrl(sportName, teamNames)

  let xml: string
  try {
    const res = await fetch(url, {
      next: { revalidate: 600 }, // 10 min cache
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FanStack/1.0)' },
    })
    if (!res.ok) return []
    xml = await res.text()
  } catch {
    return []
  }

  let parsed: unknown
  try {
    parsed = parser.parse(xml)
  } catch {
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: RSSItem[] = (parsed as any)?.rss?.channel?.item ?? []
  if (!Array.isArray(items)) return []

  return items.slice(0, 20).map((item): NewsItem => {
    const headline    = text(item.title).replace(/\s*-\s*[^-]+$/, '').trim() // strip "- Source Name"
    const sourceMatch = text(item.title).match(/\s*-\s*([^-]+)$/)
    const sourceName  = sourceMatch ? sourceMatch[1].trim() : 'Google News'

    // Google News links redirect through their site; use as-is
    const articleUrl = typeof item.link === 'string'
      ? item.link
      : text(item.guid as string | { __cdata: string })

    return {
      id:           articleUrl || String(Math.random()),
      sport:        sportKey,
      league:       sportName,
      headline,
      description:  text(item.description).replace(/<[^>]+>/g, '').slice(0, 200),
      published:    item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      url:          articleUrl || '#',
      imageUrl:     undefined,
      source:       sourceName,
      relatedTeams: teamNames, // all articles from team-specific search are team-relevant
    }
  })
}
