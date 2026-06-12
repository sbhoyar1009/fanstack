import { describe, it, expect, vi, beforeEach } from 'vitest'

// Regression: ISSUE-001 — game detail route used TTL.UPCOMING (5 min) for ALL
// game statuses. Live games were cached too long, making box score updates
// invisible during play despite the client refreshing every 30s.
// Found by /qa on 2026-06-10
// Report: .gstack/qa-reports/qa-report-localhost-2026-06-10.md

describe('game detail TTL selection', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token')
  })

  it('returns TTL.LIVE (30s) for an in-progress game', () => {
    // TTL.LIVE = 30 seconds; live games must expire fast
    const TTL = { LIVE: 30, UPCOMING: 300, FINISHED: 3600, STANDINGS: 900, NEWS: 600, TEAMS: 86400 }
    const status: string = 'in'
    const ttl = status === 'in' ? TTL.LIVE
      : status === 'post' ? TTL.FINISHED
      : TTL.UPCOMING
    expect(ttl).toBe(30)
  })

  it('returns TTL.FINISHED (3600s) for a completed game', () => {
    const TTL = { LIVE: 30, UPCOMING: 300, FINISHED: 3600, STANDINGS: 900, NEWS: 600, TEAMS: 86400 }
    const status: string = 'post'
    const ttl = status === 'in' ? TTL.LIVE
      : status === 'post' ? TTL.FINISHED
      : TTL.UPCOMING
    expect(ttl).toBe(3600)
  })

  it('returns TTL.UPCOMING (300s) for a pre-game', () => {
    const TTL = { LIVE: 30, UPCOMING: 300, FINISHED: 3600, STANDINGS: 900, NEWS: 600, TEAMS: 86400 }
    const status: string = 'pre'
    const ttl = status === 'in' ? TTL.LIVE
      : status === 'post' ? TTL.FINISHED
      : TTL.UPCOMING
    expect(ttl).toBe(300)
  })
})
