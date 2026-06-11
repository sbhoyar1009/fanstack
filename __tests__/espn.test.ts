import { describe, it, expect, vi, beforeEach } from 'vitest'

// Test that espnFetch returns null on rate-limit and server errors
// and throws on other non-ok statuses.

// We test the public functions that call espnFetch, since espnFetch is private.
// The key behavior: getScores() returns [] (not throws) when ESPN is unavailable.

describe('getScores — ESPN error handling', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns [] when ESPN returns 429', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: vi.fn(),
    }))

    const { getScores } = await import('@/lib/espn')
    const result = await getScores('nba')
    expect(result).toEqual([])
  })

  it('returns [] when ESPN returns 503', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn(),
    }))

    const { getScores } = await import('@/lib/espn')
    const result = await getScores('nba')
    expect(result).toEqual([])
  })

  it('throws on 400 (bad request — not a transient error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn(),
    }))

    const { getScores } = await import('@/lib/espn')
    await expect(getScores('nba')).rejects.toThrow('ESPN API error: 400')
  })

  it('returns parsed games on 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ events: [] }),
    }))

    const { getScores } = await import('@/lib/espn')
    const result = await getScores('nba')
    expect(result).toEqual([])
  })
})

describe('getNews — deterministic ID fallback', () => {
  it('uses deterministic ID when dataSourceIdentifier and id are missing', async () => {
    const mockArticle = {
      headline: 'Lakers beat Warriors in overtime',
      published: '2026-06-10T12:00:00Z',
      description: 'An epic overtime game',
      links: { web: { href: 'https://espn.com/story' } },
    }

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ articles: [mockArticle] }),
    }))

    const { getNews } = await import('@/lib/espn')
    const result = await getNews('nba')

    expect(result).toHaveLength(1)
    // ID must be deterministic — same inputs produce same ID
    const id1 = result[0].id
    const result2 = await getNews('nba')
    expect(result2[0].id).toBe(id1)
    // ID must NOT be a random float string
    expect(parseFloat(id1)).toBeNaN()
  })
})
