import { SPORT_CONFIGS } from './espn'
import type { NormalizedGame, NewsItem, SportKey } from '@/types/sports'

type TeamRow = { sport_key: string; team_id: string; team_name: string }

/**
 * Build a lookup: baseSport → Set<team_id>
 *
 * This is the core of multi-league support. ESPN reuses the same team IDs
 * across all competitions within a sport family. Arsenal is id=359 in EPL,
 * UCL, and UEL. By grouping by baseSport instead of sport_key, following
 * Arsenal in EPL automatically shows their Champions League and Europa League
 * games without requiring the user to add the team again.
 */
function buildBaseSportTeamMap(userTeams: TeamRow[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const t of userTeams) {
    const config = SPORT_CONFIGS[t.sport_key as SportKey]
    if (!config) continue
    const { baseSport } = config
    if (!map.has(baseSport)) map.set(baseSport, new Set())
    map.get(baseSport)!.add(t.team_id)
  }
  return map
}

/**
 * Build a lookup: baseSport → Set<team_name_lowercase>
 * Used for name-based news matching as a fallback.
 */
function buildBaseSportNameMap(userTeams: TeamRow[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const t of userTeams) {
    const config = SPORT_CONFIGS[t.sport_key as SportKey]
    if (!config) continue
    const { baseSport } = config
    if (!map.has(baseSport)) map.set(baseSport, new Set())
    map.get(baseSport)!.add(t.team_name.toLowerCase())
  }
  return map
}

/**
 * Filter games to only those where a followed team is playing.
 *
 * Cross-competition rule: teams are matched by baseSport family, not league.
 * If the user follows Arsenal (EPL / soccer), their UCL and UEL games also
 * surface — as long as UCL/UEL appear in the user's followed sports.
 *
 * Whole-league rule: if the user has NO followed teams within a baseSport
 * family, every game for that family passes through (they follow the whole
 * competition, not a specific team).
 */
export function filterGamesByTeams(
  games: NormalizedGame[],
  userTeams: TeamRow[],
): NormalizedGame[] {
  if (userTeams.length === 0) return games

  const byBaseSport = buildBaseSportTeamMap(userTeams)

  return games.filter((game) => {
    const config = SPORT_CONFIGS[game.sport]
    if (!config) return true

    const followedIds = byBaseSport.get(config.baseSport)
    // No teams followed in this sport family → whole-competition follow
    if (!followedIds || followedIds.size === 0) return true

    return followedIds.has(game.homeTeam.id) || followedIds.has(game.awayTeam.id)
  })
}

/**
 * Filter news to only articles tagged with a followed team.
 * Falls back to all news for a sport when no specific teams are followed
 * in that baseSport family.
 */
export function filterNewsByTeams(
  news: NewsItem[],
  userTeams: TeamRow[],
): NewsItem[] {
  if (userTeams.length === 0) return news

  const byId   = buildBaseSportTeamMap(userTeams)
  const byName = buildBaseSportNameMap(userTeams)

  return news.filter((item) => {
    const config = SPORT_CONFIGS[item.sport]
    if (!config) return true

    const followedIds   = byId.get(config.baseSport)
    const followedNames = byName.get(config.baseSport)

    // No teams followed in this sport family → whole-competition follow
    if (!followedIds || followedIds.size === 0) return true

    // No team tags on article → only keep if we follow the whole competition
    if (!item.relatedTeams || item.relatedTeams.length === 0) return false

    return item.relatedTeams.some(
      (t) => followedIds.has(t) || followedNames?.has(t.toLowerCase()),
    )
  })
}
