import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy-initialize to avoid crashing at build time when env vars aren't present
let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    _supabase = createClient(url, key)
  }
  return _supabase
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

// ─── Type-safe DB helpers ─────────────────────────────────────────────────────

export type DbUserSport = {
  id: string
  user_id: string
  sport_key: string
  sport_name: string
  created_at: string
}

export type DbUserTeam = {
  id: string
  user_id: string
  sport_key: string
  team_id: string
  team_name: string
  team_logo: string
  team_context: string | null
  created_at: string
}

export type DbUserSettings = {
  user_id: string
  digest_format: 'brief' | 'detailed'
  digest_time: string
  timezone: string
  email_enabled: boolean
  notification_prefs: { kickoff: boolean; finalScore: boolean; injury: boolean }
  push_subscription: unknown
  updated_at: string
}

export type DbDigestHistory = {
  id: string
  user_id: string
  generated_at: string
  content: unknown
  format: string
}

export type DbGameSummary = {
  id: string
  game_id: string
  sport_key: string
  summary: string
  generated_at: string
}

export type DbUserSession = {
  user_id: string
  last_opened_at: string
  updated_at: string
}

export type DbGameScore = {
  id: string
  sport_key: string
  team_id: string
  schedule: unknown  // ScheduleGame[] serialized as JSONB
  fetched_at: string
}

export async function getUserSports(userId: string): Promise<DbUserSport[]> {
  const db = getSupabase()
  const { data, error } = await db
    .from('user_sports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getUserTeams(userId: string): Promise<DbUserTeam[]> {
  const db = getSupabase()
  const { data, error } = await db
    .from('user_teams')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function upsertUserSports(
  userId: string,
  sports: Array<{ sportKey: string; sportName: string }>
): Promise<void> {
  const db = getSupabase()
  const rows = sports.map((s) => ({
    user_id: userId,
    sport_key: s.sportKey,
    sport_name: s.sportName,
  }))
  const { error } = await db
    .from('user_sports')
    .upsert(rows, { onConflict: 'user_id,sport_key' })
  if (error) throw error
}

export async function deleteUserSport(userId: string, sportKey: string): Promise<void> {
  const db = getSupabase()
  const { error } = await db
    .from('user_sports')
    .delete()
    .eq('user_id', userId)
    .eq('sport_key', sportKey)
  if (error) throw error
}

export async function upsertUserTeams(
  userId: string,
  teams: Array<{ sportKey: string; teamId: string; teamName: string; teamLogo: string }>
): Promise<void> {
  const db = getSupabase()
  const rows = teams.map((t) => ({
    user_id: userId,
    sport_key: t.sportKey,
    team_id: t.teamId,
    team_name: t.teamName,
    team_logo: t.teamLogo,
  }))
  const { error } = await db
    .from('user_teams')
    .upsert(rows, { onConflict: 'user_id,sport_key,team_id' })
  if (error) throw error
}

export async function deleteUserTeam(
  userId: string,
  sportKey: string,
  teamId: string
): Promise<void> {
  const db = getSupabase()
  const { error } = await db
    .from('user_teams')
    .delete()
    .eq('user_id', userId)
    .eq('sport_key', sportKey)
    .eq('team_id', teamId)
  if (error) throw error
}

export async function getGameSummary(gameId: string): Promise<DbGameSummary | null> {
  const db = getSupabase()
  const { data, error } = await db
    .from('game_summaries')
    .select('*')
    .eq('game_id', gameId)
    .single()
  if (error || !data) return null
  return data
}

export async function saveGameSummary(
  gameId: string,
  sportKey: string,
  summary: string
): Promise<void> {
  const db = getSupabase()
  const { error } = await db
    .from('game_summaries')
    .upsert({ game_id: gameId, sport_key: sportKey, summary }, { onConflict: 'game_id' })
  if (error) throw error
}

// ─── User session (last_opened_at for "What Did I Miss?" view) ────────────────

export async function getUserSession(userId: string): Promise<DbUserSession | null> {
  const db = getSupabase()
  const { data, error } = await db
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error || !data) return null
  return data
}

export async function upsertUserSession(userId: string, lastOpenedAt: string): Promise<void> {
  const db = getSupabase()
  const { error } = await db
    .from('user_sessions')
    .upsert(
      { user_id: userId, last_opened_at: lastOpenedAt, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  if (error) throw error
}

// ─── Team schedule cache (write-through for 7-day catch-up window) ───────────

export async function getTeamScheduleCache(sportKey: string, teamId: string): Promise<unknown | null> {
  const db = getSupabase()
  const { data, error } = await db
    .from('game_scores')
    .select('schedule, fetched_at')
    .eq('sport_key', sportKey)
    .eq('team_id', teamId)
    .single()
  if (error || !data) return null
  // Only treat as valid if fetched within 15 minutes
  const age = Date.now() - new Date(data.fetched_at).getTime()
  if (age > 15 * 60 * 1000) return null
  return data.schedule
}

export async function saveTeamScheduleCache(
  sportKey: string,
  teamId: string,
  schedule: unknown
): Promise<void> {
  const db = getSupabase()
  const { error } = await db
    .from('game_scores')
    .upsert(
      { sport_key: sportKey, team_id: teamId, schedule, fetched_at: new Date().toISOString() },
      { onConflict: 'sport_key,team_id' }
    )
  if (error) throw error
}

// ─── User settings ────────────────────────────────────────────────────────────

export async function getUserSettings(userId: string): Promise<DbUserSettings | null> {
  const db = getSupabase()
  const { data, error } = await db
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error || !data) return null
  return data as DbUserSettings
}

export async function upsertUserSettings(
  userId: string,
  settings: Partial<Omit<DbUserSettings, 'user_id' | 'updated_at'>>
): Promise<void> {
  const db = getSupabase()
  const { error } = await db
    .from('user_settings')
    .upsert(
      { user_id: userId, ...settings, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
  if (error) throw error
}

// ─── Digest history ───────────────────────────────────────────────────────────

export async function getTodaysDigest(userId: string): Promise<DbDigestHistory | null> {
  const db = getSupabase()
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await db
    .from('digest_history')
    .select('*')
    .eq('user_id', userId)
    .gte('generated_at', `${today}T00:00:00Z`)
    .lte('generated_at', `${today}T23:59:59Z`)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()
  if (error || !data) return null
  return data as DbDigestHistory
}

export async function saveDigestHistory(
  userId: string,
  content: unknown,
  format: string = 'brief'
): Promise<void> {
  const db = getSupabase()
  const { error } = await db
    .from('digest_history')
    .insert({ user_id: userId, content, format, generated_at: new Date().toISOString() })
  if (error) throw error
}

export async function getDigestHistory(userId: string, limit = 7): Promise<DbDigestHistory[]> {
  const db = getSupabase()
  const { data, error } = await db
    .from('digest_history')
    .select('*')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data ?? []) as DbDigestHistory[]
}

// ─── Storyline memory (team_context) ─────────────────────────────────────────

export async function updateTeamContext(
  userId: string,
  sportKey: string,
  teamId: string,
  context: string
): Promise<void> {
  const db = getSupabase()
  const { error } = await db
    .from('user_teams')
    .update({ team_context: context })
    .eq('user_id', userId)
    .eq('sport_key', sportKey)
    .eq('team_id', teamId)
  if (error) throw error
}
