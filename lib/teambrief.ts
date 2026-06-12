import {
  getUserTeams,
  getUserSession,
  upsertUserSession,
  getTeamScheduleCache,
  saveTeamScheduleCache,
  updateTeamContext,
} from '@/lib/db'
import { generateTeamBrief, type TeamBriefContext } from '@/lib/anthropic'
import { getTeamSchedule } from '@/lib/espn-detail'
import { getGoogleNews } from '@/lib/googlenews'
import { SPORT_CONFIGS } from '@/lib/espn'
import type { SportKey } from '@/types/sports'
import type { ScheduleGame } from '@/lib/espn-detail'

export type TeamBriefResult = {
  teamId: string
  teamName: string
  sportKey: SportKey
  brief: string | null
  recentGames: Array<{ opponent: string; result: string; date: string }>
  stale: boolean
}

export type TeamBriefs = {
  teams: TeamBriefResult[]
  lastOpenedAt: string
  updatedAt: string
}

export async function getTeamBriefs(userId: string): Promise<TeamBriefs> {
  const [userTeams, userSession] = await Promise.all([
    getUserTeams(userId),
    getUserSession(userId),
  ])

  const lastOpenedAt = userSession?.last_opened_at
    ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Cap lookback at 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const since = lastOpenedAt < sevenDaysAgo ? sevenDaysAgo : lastOpenedAt

  const teamTasks = userTeams.map(async (t): Promise<TeamBriefResult> => {
    const sportKey = t.sport_key as SportKey

    if (!SPORT_CONFIGS[sportKey]) {
      return { teamId: t.team_id, teamName: t.team_name, sportKey, brief: null, recentGames: [], stale: true }
    }

    let schedule: ScheduleGame[] | null = null
    let stale = false

    try {
      const cached = await getTeamScheduleCache(sportKey, t.team_id)
      if (cached) schedule = cached as ScheduleGame[]
    } catch {
      // Cache miss — fall through to ESPN
    }

    if (!schedule) {
      try {
        const fresh = await getTeamSchedule(sportKey, t.team_id)
        schedule = fresh
        saveTeamScheduleCache(sportKey, t.team_id, fresh).catch(() => {})
      } catch {
        stale = true
        schedule = []
      }
    }

    const recentGames = (schedule ?? [])
      .filter((g) => g.status === 'post' && g.date > since)
      .slice(0, 5)
      .map((g) => ({
        opponent: g.opponent.name,
        result: g.result
          ? `${g.result}${g.score ? ` ${g.score}` : ''}`
          : g.score ?? 'played',
        date: new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }))

    let topHeadline: string | null = null
    try {
      const sportConfig = SPORT_CONFIGS[sportKey]
      const news = await getGoogleNews(sportKey, sportConfig.name, [t.team_name])
      topHeadline = news[0]?.headline ?? null
    } catch {
      // Not critical
    }

    const context: TeamBriefContext = {
      team_name: t.team_name,
      recent_scores: recentGames,
      top_headline: topHeadline,
      injury_flags: [],
      last_known_context: t.team_context ?? null,
    }

    let brief: string | null = null
    if (recentGames.length > 0 || topHeadline) {
      try {
        brief = await generateTeamBrief(context)
        // NEW5: save the generated brief as the next session's context
        if (brief) {
          updateTeamContext(userId, sportKey, t.team_id, brief.slice(0, 500)).catch(() => {})
        }
      } catch {
        // brief unavailable — UI handles null
      }
    }

    return { teamId: t.team_id, teamName: t.team_name, sportKey, brief, recentGames, stale }
  })

  const results = await Promise.allSettled(teamTasks)
  const teams: TeamBriefResult[] = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          teamId: userTeams[i].team_id,
          teamName: userTeams[i].team_name,
          sportKey: userTeams[i].sport_key as SportKey,
          brief: null,
          recentGames: [],
          stale: true,
        }
  )

  const now = new Date().toISOString()
  await upsertUserSession(userId, now).catch(() => {})

  return { teams, lastOpenedAt: since, updatedAt: now }
}
