import { SPORT_CONFIGS } from './espn'
import type { SportKey } from '@/types/sports'

// Two base URLs — site/v2 for most endpoints, /v2/ for standings
const ESPN_SITE = 'https://site.api.espn.com/apis/site/v2/sports'
const ESPN_V2   = 'https://site.api.espn.com/apis/v2/sports'

async function espnFetch(url: string): Promise<unknown> {
  const res = await fetch(url, {
    next: { revalidate: 60 },
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`ESPN ${res.status}: ${url}`)
  return res.json()
}

// ESPN schedule/summary APIs return score as either a plain string/number
// OR an object: { value: 107.0, displayValue: '107' }
function scoreVal(score: unknown): number {
  if (score == null) return 0
  if (typeof score === 'object') return (score as { value?: number }).value ?? 0
  return Number(score)
}
function scoreDisplay(score: unknown): string {
  if (score == null) return '0'
  if (typeof score === 'object') {
    const s = score as { displayValue?: string; value?: number }
    return s.displayValue ?? String(s.value ?? 0)
  }
  return String(score)
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type TeamProfile = {
  id: string
  name: string
  fullName: string
  abbreviation: string
  logo: string
  color: string
  alternateColor: string
  sport: SportKey
  league: string
  record: { wins: number; losses: number; ties?: number; summary: string }
  standingsRank?: number
  venue?: string
}

export type RosterPlayer = {
  id: string
  name: string
  jersey: string
  position: string
  headshot?: string
  age?: number
}

export type BoxScoreTeam = {
  id: string
  name: string
  abbreviation: string
  logo: string
  score: number
  stats: Array<{ label: string; value: string }>
}

export type GameDetail = {
  id: string
  sport: SportKey
  league: string
  homeTeam: BoxScoreTeam
  awayTeam: BoxScoreTeam
  status: 'pre' | 'in' | 'post'
  statusText: string
  startTime: string
  venue?: string
  attendance?: number
  broadcasts?: string[]
  keyPlays?: Array<{ clock: string; text: string; team?: string }>
  leaders?: Array<{ team: string; category: string; player: string; value: string }>
}

export type StandingEntry = {
  rank: number
  teamId: string
  teamName: string
  teamLogo: string
  abbreviation: string
  wins: number
  losses: number
  draws?: number
  pct: number
  gb?: number
  streak?: string
  last10?: string
  points?: number
  divisionRecord?: string
  conferenceRecord?: string
  group?: string
}

export type StandingsGroup = {
  name: string
  entries: StandingEntry[]
}

export type ScheduleGame = {
  id: string
  date: string
  opponent: { id: string; name: string; logo: string; abbreviation: string }
  isHome: boolean
  result?: 'W' | 'L' | 'D'
  score?: string
  status: 'pre' | 'in' | 'post'
  statusText: string
}

// ─── Team profile ─────────────────────────────────────────────────────────────

export async function getTeamProfile(sport: SportKey, teamId: string): Promise<TeamProfile> {
  const { path } = SPORT_CONFIGS[sport]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await espnFetch(`${ESPN_SITE}/${path}/teams/${teamId}`) as any
  const team = data?.team ?? {}

  return {
    id:             team.id ?? teamId,
    name:           team.shortDisplayName ?? team.displayName ?? '',
    fullName:       team.displayName ?? '',
    abbreviation:   team.abbreviation ?? '',
    logo:           team.logos?.[0]?.href ?? '',
    color:          `#${team.color ?? '6366f1'}`,
    alternateColor: `#${team.alternateColor ?? '818cf8'}`,
    sport,
    league:         SPORT_CONFIGS[sport].name,
    record: {
      wins:    team.record?.items?.[0]?.stats?.find((s: { name: string }) => s.name === 'wins')?.value ?? 0,
      losses:  team.record?.items?.[0]?.stats?.find((s: { name: string }) => s.name === 'losses')?.value ?? 0,
      summary: team.record?.items?.[0]?.summary ?? '',
    },
    venue: team.franchise?.venue?.fullName ?? team.venue?.fullName,
  }
}

// ─── Roster ───────────────────────────────────────────────────────────────────

export async function getTeamRoster(sport: SportKey, teamId: string): Promise<RosterPlayer[]> {
  const { path } = SPORT_CONFIGS[sport]
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await espnFetch(`${ESPN_SITE}/${path}/teams/${teamId}/roster`) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const athletes: any[] = data?.athletes ?? []
    const all: RosterPlayer[] = []

    for (const group of athletes) {
      for (const item of (group.items ?? group.athletes ?? [])) {
        all.push({
          id:       item.id ?? '',
          name:     item.displayName ?? item.fullName ?? '',
          jersey:   item.jersey ?? '—',
          position: item.position?.abbreviation ?? item.position?.name ?? '',
          headshot: item.headshot?.href,
          age:      item.age,
        })
      }
    }
    return all.slice(0, 35)
  } catch {
    return []
  }
}

// ─── Team schedule ────────────────────────────────────────────────────────────

export async function getTeamSchedule(sport: SportKey, teamId: string): Promise<ScheduleGame[]> {
  const { path } = SPORT_CONFIGS[sport]
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await espnFetch(`${ESPN_SITE}/${path}/teams/${teamId}/schedule`) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events: any[] = data?.events ?? []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return events.map((event: any): ScheduleGame => {
      const comp        = event.competitions?.[0] ?? {}
      const competitors = comp.competitors ?? []

      // Match by team id; fall back to index
      const self = competitors.find((c: { id: string }) => c.id === teamId) ?? competitors[0]
      const opp  = competitors.find((c: { id: string }) => c.id !== teamId) ?? competitors[1]

      const statusName = comp.status?.type?.name ?? ''
      const isPost = statusName.startsWith('STATUS_FINAL') || statusName === 'STATUS_FULL_TIME'
      const isIn   = statusName === 'STATUS_IN_PROGRESS' || statusName === 'STATUS_HALFTIME'

      // score field is { value: number, displayValue: string } — use helpers
      let result: 'W' | 'L' | 'D' | undefined
      if (isPost && self && opp) {
        const s = scoreVal(self.score)
        const o = scoreVal(opp.score)
        result = s > o ? 'W' : s < o ? 'L' : 'D'
      }

      const oppTeam = opp?.team ?? {}
      return {
        id:   event.id,
        date: comp.date ?? event.date ?? '',
        opponent: {
          id:           oppTeam.id ?? '',
          name:         oppTeam.shortDisplayName ?? oppTeam.displayName ?? 'TBD',
          abbreviation: oppTeam.abbreviation ?? '',
          logo:         oppTeam.logos?.[0]?.href ?? oppTeam.logo ?? '',
        },
        isHome:     self?.homeAway === 'home',
        result,
        score: (isPost || isIn) && self && opp
          ? `${scoreDisplay(self.score)}–${scoreDisplay(opp.score)}`
          : undefined,
        status:     isPost ? 'post' : isIn ? 'in' : 'pre',
        statusText: comp.status?.type?.shortDetail ?? '',
      }
    })
  } catch (err) {
    console.error('getTeamSchedule error', err)
    return []
  }
}

// ─── Game detail / box score ──────────────────────────────────────────────────

export async function getGameDetail(sport: SportKey, gameId: string): Promise<GameDetail | null> {
  const { path, name } = SPORT_CONFIGS[sport]
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await espnFetch(`${ESPN_SITE}/${path}/summary?event=${gameId}`) as any

    const header      = data?.header ?? {}
    const boxscore    = data?.boxscore ?? {}
    const comp        = header.competitions?.[0] ?? {}
    const competitors = comp.competitors ?? []

    const home = competitors.find((c: { homeAway: string }) => c.homeAway === 'home') ?? competitors[0]
    const away = competitors.find((c: { homeAway: string }) => c.homeAway === 'away') ?? competitors[1]

    const statusType = comp.status?.type ?? {}
    const statusName = statusType.name ?? ''
    const status: 'pre' | 'in' | 'post' =
      statusName.startsWith('STATUS_FINAL') || statusName === 'STATUS_FULL_TIME' ? 'post'
      : statusName === 'STATUS_IN_PROGRESS' || statusName === 'STATUS_HALFTIME'  ? 'in'
      : 'pre'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function buildBoxTeam(competitor: any): BoxScoreTeam {
      const team   = competitor?.team ?? {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bsTeam = boxscore?.teams?.find((t: any) => t.team?.id === team.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stats  = bsTeam?.statistics?.slice(0, 8).map((s: any) => ({
        label: s.label ?? s.name,
        value: s.displayValue ?? String(s.value ?? ''),
      })) ?? []

      return {
        id:           team.id ?? '',
        name:         team.shortDisplayName ?? team.displayName ?? '',
        abbreviation: team.abbreviation ?? '',
        logo:         team.logos?.[0]?.href ?? team.logo ?? '',
        score:        scoreVal(competitor?.score),
        stats,
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plays = data?.plays ?? []
    const keyPlays = plays
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((p: any) => p.scoringPlay || p.scoreValue > 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .slice(-10).map((p: any) => ({
        clock: p.clock?.displayValue ?? '',
        text:  p.text ?? p.description ?? '',
        team:  p.team?.displayName,
      }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leaders: GameDetail['leaders'] = (data?.leaders ?? []).flatMap((group: any) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (group.leaders ?? []).slice(0, 1).map((l: any) => ({
        team:     group.team?.displayName ?? '',
        category: group.displayName ?? '',
        player:   l.athlete?.displayName ?? '',
        value:    l.displayValue ?? '',
      }))
    )

    return {
      id:         gameId,
      sport,
      league:     name,
      homeTeam:   buildBoxTeam(home),
      awayTeam:   buildBoxTeam(away),
      status,
      statusText: statusType.shortDetail ?? '',
      startTime:  comp.date ?? '',
      venue:      comp.venue?.fullName,
      attendance: comp.attendance,
      broadcasts: comp.broadcasts?.flatMap((b: { names: string[] }) => b.names ?? []),
      keyPlays,
      leaders,
    }
  } catch (err) {
    console.error('getGameDetail error', err)
    return null
  }
}

// ─── Player profile ───────────────────────────────────────────────────────────

export type PlayerProfile = {
  id: string
  name: string
  fullName: string
  headshot?: string
  jersey?: string
  position: string
  age?: number
  height?: string
  weight?: string
  birthPlace?: string
  experience?: string
  college?: string
  sport: SportKey
  team?: { id: string; name: string; logo: string; color: string }
  statistics?: Array<{ name: string; displayValue: string; description?: string }>
}

export async function getPlayerProfile(sport: SportKey, athleteId: string): Promise<PlayerProfile | null> {
  if (sport === 'f1') return null
  const { path } = SPORT_CONFIGS[sport]
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await espnFetch(`${ESPN_SITE}/${path}/athletes/${athleteId}`) as any
    const a = data?.athlete ?? {}

    const teamRef = a.team ?? a.teams?.[0]?.team
    const statsArr = (a.statistics?.splits?.categories ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .flatMap((cat: any) => cat.stats ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .slice(0, 12).map((s: any) => ({
        name: s.name ?? s.shortDisplayName ?? '',
        displayValue: s.displayValue ?? String(s.value ?? ''),
        description: s.description,
      }))

    return {
      id:          a.id ?? athleteId,
      name:        a.shortName ?? a.displayName ?? '',
      fullName:    a.displayName ?? a.fullName ?? '',
      headshot:    a.headshot?.href,
      jersey:      a.jersey,
      position:    a.position?.displayName ?? a.position?.abbreviation ?? '',
      age:         a.age,
      height:      a.displayHeight,
      weight:      a.displayWeight,
      birthPlace:  a.birthPlace ? [a.birthPlace.city, a.birthPlace.country].filter(Boolean).join(', ') : undefined,
      experience:  a.experience?.displayValue,
      college:     a.college?.name,
      sport,
      team: teamRef ? {
        id:    teamRef.id ?? '',
        name:  teamRef.displayName ?? teamRef.shortDisplayName ?? '',
        logo:  teamRef.logos?.[0]?.href ?? teamRef.logo ?? '',
        color: `#${teamRef.color ?? '6366f1'}`,
      } : undefined,
      statistics: statsArr,
    }
  } catch {
    return null
  }
}

// ─── League leaders ───────────────────────────────────────────────────────────

export type LeagueLeader = {
  rank: number
  athleteId: string
  athleteName: string
  athleteHeadshot?: string
  teamName: string
  teamLogo: string
  value: string
  displayValue: string
}

export type LeaderCategory = {
  name: string
  displayName: string
  leaders: LeagueLeader[]
}

export async function getLeagueLeaders(sport: SportKey): Promise<LeaderCategory[]> {
  if (sport === 'f1') return []
  const { path } = SPORT_CONFIGS[sport]
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await espnFetch(`${ESPN_SITE}/${path}/leaders`) as any
    const categories = data?.categories ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return categories.slice(0, 6).map((cat: any): LeaderCategory => ({
      name: cat.name ?? '',
      displayName: cat.displayName ?? cat.name ?? '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      leaders: (cat.leaders ?? []).slice(0, 10).map((l: any, idx: number): LeagueLeader => {
        const athlete = l.athlete ?? {}
        const team    = l.team ?? athlete.team ?? {}
        return {
          rank:              idx + 1,
          athleteId:         athlete.id ?? '',
          athleteName:       athlete.displayName ?? athlete.shortName ?? '',
          athleteHeadshot:   athlete.headshot?.href,
          teamName:          team.displayName ?? team.shortDisplayName ?? '',
          teamLogo:          team.logos?.[0]?.href ?? team.logo ?? '',
          value:             String(l.value ?? ''),
          displayValue:      l.displayValue ?? String(l.value ?? ''),
        }
      }),
    }))
  } catch {
    return []
  }
}

// ─── Standings ────────────────────────────────────────────────────────────────
// NOTE: must use /apis/v2/sports/... — the /apis/site/v2/... endpoint returns only {fullViewLink}

export async function getDetailedStandings(sport: SportKey): Promise<StandingsGroup[]> {
  const { path } = SPORT_CONFIGS[sport]
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await espnFetch(`${ESPN_V2}/${path}/standings`) as any
    const groups: StandingsGroup[] = []

    // Top-level children = conferences/groups; fall back to a single group
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = data?.children?.length
      ? data.children
      : data?.standings?.entries
        ? [data]
        : []

    for (const child of children) {
      const groupName = child.name ?? child.abbreviation ?? ''
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entries: any[] = child.standings?.entries ?? []

      const standing: StandingEntry[] = entries.map((entry, idx) => {
        const team = entry.team ?? {}

        // Build two maps: one for numeric .value, one for string .displayValue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const val: Record<string, number>  = {}
        const dv:  Record<string, string>  = {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(entry.stats ?? []).forEach((s: any) => {
          if (s.value   != null) val[s.name] = s.value
          if (s.displayValue != null) dv[s.name] = s.displayValue
        })

        // gamesBehind: value is 0.0 for first place; displayValue is '-' — always use value
        const gbVal = val['gamesBehind']
        const gb    = gbVal != null ? gbVal : undefined

        // streak: value is 3.0, displayValue is 'W3' — use displayValue
        const streak = dv['streak'] ?? undefined

        // Last Ten Games — key has spaces; displayValue is '8-2'; value is null
        const last10 = dv['Last Ten Games'] ?? undefined

        // pct: value is 0.73170733 (proper float)
        const pct = val['winPercent'] ?? val['PCT'] ?? 0

        // points (soccer): value is the integer points
        const pts = val['points'] != null ? val['points'] : undefined

        return {
          rank:         idx + 1,
          teamId:       team.id ?? '',
          teamName:     team.displayName ?? team.name ?? '',
          teamLogo:     team.logos?.[0]?.href ?? team.logo ?? '',
          abbreviation: team.abbreviation ?? '',
          wins:         val['wins'] ?? 0,
          losses:       val['losses'] ?? 0,
          draws:        val['ties'] != null ? val['ties'] : val['OTL'] != null ? val['OTL'] : undefined,
          pct,
          gb,
          streak,
          last10,
          points:       pts,
          divisionRecord:   dv['vs. Div.'] ?? dv['divisionRecord'] ?? undefined,
          conferenceRecord: dv['vs. Conf.'] ?? dv['conferenceRecord'] ?? undefined,
          group:        groupName,
        }
      })

      if (standing.length > 0) groups.push({ name: groupName, entries: standing })
    }

    return groups
  } catch (err) {
    console.error('getDetailedStandings error', err)
    return []
  }
}
