export type SportKey =
  | 'nba'
  | 'nfl'
  | 'epl'
  | 'laliga'
  | 'ucl'        // UEFA Champions League
  | 'uel'        // UEFA Europa League
  | 'mls'        // Major League Soccer
  | 'f1'
  | 'mlb'
  | 'nhl'

export type GameStatus = 'pre' | 'in' | 'post'

export type NormalizedGame = {
  id: string
  sport: SportKey
  league: string
  homeTeam: {
    id: string
    name: string
    abbreviation: string
    logo: string
    score: number | null
    record?: string
  }
  awayTeam: {
    id: string
    name: string
    abbreviation: string
    logo: string
    score: number | null
    record?: string
  }
  status: GameStatus
  statusText: string
  startTime: string
  venue?: string
  broadcast?: string
}

export type NewsItem = {
  id: string
  sport: SportKey
  league: string
  headline: string
  description: string
  published: string
  url: string
  imageUrl?: string
  source: string
  relatedTeams?: string[]
}

export type Standing = {
  rank: number
  teamId: string
  teamName: string
  teamLogo: string
  abbreviation: string
  wins: number
  losses: number
  winPct: number
  gamesBack?: number
  streak?: string
  lastTen?: string
  pointsFor?: number
  pointsAgainst?: number
}

export type SportConfig = {
  key:       SportKey
  path:      string      // ESPN API path segment  e.g. 'basketball/nba'
  name:      string      // Display name            e.g. 'NBA'
  emoji:     string
  color:     string      // Tailwind color class
  /**
   * Logical sport family for cross-competition team matching.
   * Arsenal's ESPN team_id is the same in EPL, UCL, and UEL —
   * all three share baseSport 'soccer', so following Arsenal in
   * any of them surfaces their games in all of them.
   */
  baseSport: string      // 'soccer' | 'basketball' | 'football' | 'baseball' | 'hockey' | 'racing'
  category:  string      // Display group in SportPicker, e.g. 'Soccer', 'American Sports'
}

export type UserSport = {
  id:        string
  userId:    string
  sportKey:  SportKey
  sportName: string
  createdAt: string
}

export type UserTeam = {
  id:        string
  userId:    string
  sportKey:  SportKey
  teamId:    string
  teamName:  string
  teamLogo:  string
  createdAt: string
}

export type GameSummary = {
  id:           string
  gameId:       string
  sportKey:     SportKey
  summary:      string
  generatedAt:  string
}

export type ESPNTeam = {
  id:           string
  name:         string
  abbreviation: string
  displayName:  string
  logo:         string
  color?:       string
}
