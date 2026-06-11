import type { NormalizedGame, NewsItem, Standing, SportConfig, SportKey, ESPNTeam, GameStatus } from '@/types/sports'

export const SPORT_CONFIGS: Record<SportKey, SportConfig> = {
  // ── Soccer ──────────────────────────────────────────────────────────────────
  // ESPN team IDs are consistent across all soccer competitions — following a
  // team in any one of these leagues will surface their games in the others.
  epl:    { key: 'epl',    path: 'soccer/eng.1',           name: 'Premier League',    emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: 'purple', baseSport: 'soccer', category: 'Soccer' },
  laliga: { key: 'laliga', path: 'soccer/esp.1',           name: 'La Liga',           emoji: '🇪🇸',     color: 'red',    baseSport: 'soccer', category: 'Soccer' },
  ucl:    { key: 'ucl',    path: 'soccer/uefa.champions',  name: 'Champions League',  emoji: '⭐',       color: 'blue',   baseSport: 'soccer', category: 'Soccer' },
  uel:    { key: 'uel',    path: 'soccer/uefa.europa',     name: 'Europa League',     emoji: '🟠',       color: 'orange', baseSport: 'soccer', category: 'Soccer' },
  mls:    { key: 'mls',    path: 'soccer/USA.1',           name: 'MLS',               emoji: '🇺🇸',     color: 'blue',   baseSport: 'soccer', category: 'Soccer' },

  // ── American sports ──────────────────────────────────────────────────────────
  nba:    { key: 'nba',    path: 'basketball/nba',         name: 'NBA',               emoji: '🏀',       color: 'orange', baseSport: 'basketball', category: 'American Sports' },
  nfl:    { key: 'nfl',    path: 'football/nfl',           name: 'NFL',               emoji: '🏈',       color: 'green',  baseSport: 'football',   category: 'American Sports' },
  mlb:    { key: 'mlb',    path: 'baseball/mlb',           name: 'MLB',               emoji: '⚾',       color: 'blue',   baseSport: 'baseball',   category: 'American Sports' },
  nhl:    { key: 'nhl',    path: 'hockey/nhl',             name: 'NHL',               emoji: '🏒',       color: 'sky',    baseSport: 'hockey',     category: 'American Sports' },

  // ── Motorsport ───────────────────────────────────────────────────────────────
  f1:     { key: 'f1',     path: 'racing/f1',              name: 'Formula 1',         emoji: '🏎️',       color: 'red',    baseSport: 'racing',     category: 'Motorsport' },
}

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports'

async function espnFetch(path: string): Promise<unknown | null> {
  const url = `${ESPN_BASE}/${path}`
  const res = await fetch(url, {
    next: { revalidate: 30 },
    headers: { 'Accept': 'application/json' },
  })
  // Return null for rate-limit and server errors so callers can show stale data
  // instead of crashing. Other non-ok statuses (4xx) are real errors.
  if (res.status === 429 || res.status >= 500) return null
  if (!res.ok) {
    throw new Error(`ESPN API error: ${res.status} for ${url}`)
  }
  return res.json()
}

function resolveStatus(stateType: string): GameStatus {
  if (stateType === 'STATUS_IN_PROGRESS' || stateType === 'STATUS_HALFTIME') return 'in'
  if (
    stateType === 'STATUS_FINAL' ||
    stateType === 'STATUS_FULL_TIME' ||
    stateType === 'STATUS_END_OF_PERIOD' ||
    stateType.startsWith('STATUS_FINAL')
  ) return 'post'
  return 'pre'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLogo(team: any): string {
  return team?.logos?.[0]?.href ?? team?.logo ?? ''
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCompetitor(comp: any) {
  const team = comp?.team ?? {}
  return {
    id: team.id ?? '',
    name: team.shortDisplayName ?? team.displayName ?? team.name ?? '',
    abbreviation: team.abbreviation ?? '',
    logo: extractLogo(team),
    score: comp?.score != null ? Number(comp.score) : null,
    record: comp?.records?.[0]?.summary ?? undefined,
  }
}

export async function getScores(sportKey: SportKey, date?: string): Promise<NormalizedGame[]> {
  const config = SPORT_CONFIGS[sportKey]
  const qs = date ? `?dates=${date}` : ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await espnFetch(`${config.path}/scoreboard${qs}`) as any
  if (!data) return []

  const events = data?.events ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return events.map((event: any): NormalizedGame => {
    const competition = event.competitions?.[0] ?? {}
    const competitors = competition.competitors ?? []

    // ESPN orders home/away as index 0=home, 1=away (usually)
    const home = competitors.find((c: { homeAway: string }) => c.homeAway === 'home') ?? competitors[0]
    const away = competitors.find((c: { homeAway: string }) => c.homeAway === 'away') ?? competitors[1]

    const statusType = competition.status?.type ?? {}
    const stateType = statusType.name ?? ''
    const status = resolveStatus(stateType)

    return {
      id: event.id,
      sport: sportKey,
      league: config.name,
      homeTeam: normalizeCompetitor(home),
      awayTeam: normalizeCompetitor(away),
      status,
      statusText: statusType.shortDetail ?? statusType.description ?? '',
      startTime: competition.date ?? event.date ?? '',
      venue: competition.venue?.fullName,
      broadcast: competition.broadcasts?.[0]?.names?.[0],
    }
  })
}

export async function getNews(sportKey: SportKey): Promise<NewsItem[]> {
  const config = SPORT_CONFIGS[sportKey]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await espnFetch(`${config.path}/news`) as any
  if (!data) return []

  const articles = data?.articles ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return articles.map((a: any): NewsItem => ({
    id: a.dataSourceIdentifier ?? a.id ?? `${String(a.headline ?? '').slice(0, 20)}-${String(a.published ?? '')}`,
    sport: sportKey,
    league: config.name,
    headline: a.headline ?? '',
    description: a.description ?? a.story ?? '',
    published: a.published ?? '',
    url: a.links?.web?.href ?? a.links?.mobile?.href ?? '#',
    imageUrl: a.images?.[0]?.url,
    source: a.source ?? 'ESPN',
    relatedTeams: a.categories
      ?.filter((c: { type: string }) => c.type === 'team')
      .map((c: { description: string }) => c.description),
  }))
}

export async function getStandings(sportKey: SportKey): Promise<Standing[]> {
  const config = SPORT_CONFIGS[sportKey]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await espnFetch(`${config.path}/standings`) as any
  if (!data) return []

  const standings: Standing[] = []
  const groups = data?.children ?? data?.standings?.entries ? [data] : (data?.children ?? [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const group of groups) {
    const entries = group?.standings?.entries ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entries.forEach((entry: any, idx: number) => {
      const team = entry.team ?? {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stats: Record<string, any> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entry.stats?.forEach((s: any) => { stats[s.name] = s.value ?? s.displayValue })

      standings.push({
        rank: idx + 1,
        teamId: team.id ?? '',
        teamName: team.displayName ?? team.name ?? '',
        teamLogo: extractLogo(team),
        abbreviation: team.abbreviation ?? '',
        wins: Number(stats.wins ?? stats.W ?? 0),
        losses: Number(stats.losses ?? stats.L ?? 0),
        winPct: parseFloat(stats.winPercent ?? stats.PCT ?? '0'),
        gamesBack: stats.gamesBehind != null ? Number(stats.gamesBehind) : undefined,
        streak: stats.streak,
        lastTen: stats.Last10 ?? stats.last10,
        pointsFor: stats.pointsFor != null ? Number(stats.pointsFor) : undefined,
        pointsAgainst: stats.pointsAgainst != null ? Number(stats.pointsAgainst) : undefined,
      })
    })
    if (standings.length > 0) break // Use first group only for MVP
  }

  return standings
}

export async function getTeams(sportKey: SportKey): Promise<ESPNTeam[]> {
  const config = SPORT_CONFIGS[sportKey]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await espnFetch(`${config.path}/teams?limit=100`) as any
  if (!data) return []

  const sports = data?.sports ?? []
  const leagues = sports?.[0]?.leagues ?? []
  const teams = leagues?.[0]?.teams ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return teams.map((t: any): ESPNTeam => {
    const team = t.team ?? t
    return {
      id: team.id,
      name: team.shortDisplayName ?? team.displayName,
      abbreviation: team.abbreviation ?? '',
      displayName: team.displayName ?? '',
      logo: extractLogo(team),
      color: team.color,
    }
  })
}

export async function getGameDetails(sportKey: SportKey, eventId: string): Promise<NormalizedGame | null> {
  const config = SPORT_CONFIGS[sportKey]
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await espnFetch(`${config.path}/summary?event=${eventId}`) as any
    const header = data?.header
    if (!header) return null

    const comp = header.competitions?.[0] ?? {}
    const competitors = comp.competitors ?? []
    const home = competitors.find((c: { homeAway: string }) => c.homeAway === 'home') ?? competitors[0]
    const away = competitors.find((c: { homeAway: string }) => c.homeAway === 'away') ?? competitors[1]
    const statusType = comp.status?.type ?? {}

    return {
      id: eventId,
      sport: sportKey,
      league: config.name,
      homeTeam: normalizeCompetitor(home),
      awayTeam: normalizeCompetitor(away),
      status: resolveStatus(statusType.name ?? ''),
      statusText: statusType.shortDetail ?? '',
      startTime: comp.date ?? '',
      venue: comp.venue?.fullName,
    }
  } catch {
    return null
  }
}
