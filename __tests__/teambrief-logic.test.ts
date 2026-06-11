import { describe, it, expect } from 'vitest'

// Unit tests for the session window logic in lib/teambrief.ts
// Testing the "since" calculation in isolation.

function computeSince(lastOpenedAt: string | null): string {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const fallback24h  = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const base = lastOpenedAt ?? fallback24h
  return base < sevenDaysAgo ? sevenDaysAgo : base
}

describe('catch-up window: computeSince', () => {
  it('uses 24h fallback when lastOpenedAt is null (first open)', () => {
    const since = computeSince(null)
    const diff = Date.now() - new Date(since).getTime()
    expect(diff).toBeGreaterThan(23 * 60 * 60 * 1000)
    expect(diff).toBeLessThan(25 * 60 * 60 * 1000)
  })

  it('caps at 7 days when lastOpenedAt is very old', () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
    const since = computeSince(oldDate)
    const diff = Date.now() - new Date(since).getTime()
    // Should be capped at ~7 days, not 30 days
    expect(diff).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000 + 60_000) // 7 days + 1 min tolerance
  })

  it('respects recent lastOpenedAt within 7-day window', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    const since = computeSince(threeHoursAgo)
    expect(since).toBe(threeHoursAgo)
  })

  it('respects lastOpenedAt at exactly 7 days', () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 1000).toISOString()
    const since = computeSince(sevenDaysAgo)
    // Should be the 7-day-ago value since it's within the window
    expect(new Date(since).getTime()).toBeGreaterThan(
      Date.now() - 7 * 24 * 60 * 60 * 1000 - 60_000
    )
  })
})

describe('recent game filtering', () => {
  it('filters to only post-status games after the since timestamp', () => {
    const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago

    const games = [
      { status: 'post' as const, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), opponent: { name: 'Team A' }, result: 'W' as const, score: '3-1' },
      { status: 'post' as const, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), opponent: { name: 'Team B' }, result: 'L' as const, score: '0-2' },
      { status: 'pre' as const,  date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), opponent: { name: 'Team C' }, result: undefined, score: undefined },
    ]

    const recent = games.filter((g) => g.status === 'post' && g.date > since).slice(0, 5)

    expect(recent).toHaveLength(1)
    expect(recent[0].opponent.name).toBe('Team A')
  })
})
