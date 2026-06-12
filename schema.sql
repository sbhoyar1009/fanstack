-- ─────────────────────────────────────────────────────────────────────────────
-- FanStack — Supabase schema
-- Run this in the Supabase SQL editor: https://app.supabase.com → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ───────────────────────────────────────────────────────────────────
-- NextAuth manages the "users" table via its own adapter, but we keep a
-- mirror here for our FK relationships. If you use the NextAuth Supabase
-- adapter it will create this table automatically; otherwise run it manually.
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT,
  email        TEXT UNIQUE,
  image        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Sports a user follows ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,          -- NextAuth user ID (string sub)
  sport_key    TEXT NOT NULL,          -- 'nba', 'nfl', 'epl', etc.
  sport_name   TEXT NOT NULL,          -- 'NBA', 'NFL', 'Premier League', etc.
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sport_key)
);

-- ─── Teams a user follows ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,
  sport_key    TEXT NOT NULL,
  team_id      TEXT NOT NULL,          -- ESPN team ID
  team_name    TEXT NOT NULL,
  team_logo    TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sport_key, team_id)
);

-- ─── Cached AI summaries ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_summaries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      TEXT UNIQUE NOT NULL,   -- ESPN event ID
  sport_key    TEXT NOT NULL,
  summary      TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Session tracking (last_opened_at for "What Did I Miss?" view) ───────────
-- Inserted with NOW() - INTERVAL '24h' on first sign-in so first-open shows
-- the last 24 hours. Updated to NOW() on every successful catch-up render.
CREATE TABLE IF NOT EXISTS user_sessions (
  user_id      TEXT PRIMARY KEY,          -- NextAuth user ID (string sub)
  last_opened_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() - INTERVAL '24h'),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Per-team schedule cache (write-through for catch-up view) ───────────────
-- ESPN team schedule endpoint returns full season. Cache per (sport, team)
-- so cold catch-up opens can read from DB before hitting ESPN again.
CREATE TABLE IF NOT EXISTS game_scores (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_key    TEXT NOT NULL,
  team_id      TEXT NOT NULL,             -- ESPN team ID
  schedule     JSONB NOT NULL,            -- serialized ScheduleGame[]
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sport_key, team_id)
);

-- ─── User settings ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  user_id            TEXT PRIMARY KEY,
  digest_format      TEXT NOT NULL DEFAULT 'brief',
  digest_time        TIME NOT NULL DEFAULT '08:00',
  timezone           TEXT NOT NULL DEFAULT 'UTC',
  email_enabled      BOOLEAN NOT NULL DEFAULT false,
  notification_prefs JSONB NOT NULL DEFAULT '{"kickoff":true,"finalScore":true,"injury":true}',
  push_subscription  JSONB DEFAULT NULL,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Digest history ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS digest_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  content      JSONB NOT NULL,
  format       TEXT NOT NULL DEFAULT 'brief'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_digest_history_user_date ON digest_history (user_id, (generated_at::date));

-- ─── Email send log ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_log (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   TEXT NOT NULL,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status    TEXT NOT NULL,
  error_msg TEXT
);

-- ─── Storyline memory (team_context) ─────────────────────────────────────────
-- Add to user_teams if not already present:
ALTER TABLE user_teams ADD COLUMN IF NOT EXISTS team_context TEXT DEFAULT NULL;

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_sports_user_id  ON user_sports(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_user_id   ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_game_summaries_game_id ON game_summaries(game_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_sport_team ON game_scores(sport_key, team_id);
CREATE INDEX IF NOT EXISTS idx_digest_history_user_id ON digest_history(user_id);
CREATE INDEX IF NOT EXISTS idx_email_log_user_id ON email_log(user_id);

-- ─── Row-level security (RLS) ────────────────────────────────────────────────
-- Enable RLS so users can only see their own data.
-- Adjust policies based on whether you use Supabase Auth or NextAuth JWT.

ALTER TABLE user_sports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_teams     ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_summaries ENABLE ROW LEVEL SECURITY;

-- game_summaries is read-only for everyone (summaries are public facts)
CREATE POLICY "game_summaries_read" ON game_summaries
  FOR SELECT USING (true);

CREATE POLICY "game_summaries_insert" ON game_summaries
  FOR INSERT WITH CHECK (true);

-- user_sports: users can CRUD their own rows
-- If using NextAuth (not Supabase Auth), disable RLS and let service role handle it:
-- ALTER TABLE user_sports DISABLE ROW LEVEL SECURITY;

CREATE POLICY "user_sports_self" ON user_sports
  FOR ALL USING (true);  -- relax for MVP; tighten with auth.uid() if using Supabase Auth

CREATE POLICY "user_teams_self" ON user_teams
  FOR ALL USING (true);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_sessions_self" ON user_sessions
  FOR ALL USING (true);

ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "game_scores_read" ON game_scores
  FOR SELECT USING (true);
CREATE POLICY "game_scores_insert" ON game_scores
  FOR INSERT WITH CHECK (true);
CREATE POLICY "game_scores_update" ON game_scores
  FOR UPDATE USING (true);

ALTER TABLE user_settings  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_settings_self" ON user_settings FOR ALL USING (true);

ALTER TABLE digest_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "digest_history_self" ON digest_history FOR ALL USING (true);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_log_self" ON email_log FOR ALL USING (true);
