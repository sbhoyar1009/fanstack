import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TeamBriefContext } from '@/lib/anthropic'

// vi.mock is hoisted above imports — must use factory with no top-level vars
const mockGenerateContent = vi.fn()
const mockGetGenerativeModel = vi.fn(() => ({ generateContent: mockGenerateContent }))

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class MockGoogleGenerativeAI {
    getGenerativeModel = mockGetGenerativeModel
  },
}))

vi.stubEnv('GEMINI_API_KEY', 'test-key')

describe('generateTeamBrief', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGenerateContent.mockReset()
    mockGetGenerativeModel.mockClear()
  })

  it('calls Gemini and returns the brief text', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Arsenal beat Man City 2-1, Saka scored twice.' },
    })

    const { generateTeamBrief } = await import('@/lib/anthropic')

    const context: TeamBriefContext = {
      team_name: 'Arsenal',
      recent_scores: [{ opponent: 'Man City', result: 'W 2–1', date: 'Jun 9' }],
      top_headline: 'Saka named MOTM',
      injury_flags: [],
      last_known_context: null,
    }

    const result = await generateTeamBrief(context)
    expect(result).toBe('Arsenal beat Man City 2-1, Saka scored twice.')
  })

  it('includes team name and scores in the prompt', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Brief.' },
    })

    const { generateTeamBrief } = await import('@/lib/anthropic')

    await generateTeamBrief({
      team_name: 'Arsenal',
      recent_scores: [{ opponent: 'Man City', result: 'W 2–1', date: 'Jun 9' }],
      top_headline: 'Saka named MOTM',
      injury_flags: [],
      last_known_context: null,
    })

    const prompt = mockGenerateContent.mock.calls[0][0] as string
    expect(prompt).toContain('Arsenal')
    expect(prompt).toContain('W 2–1')
  })

  it('uses gemini-2.5-flash model', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Brief.' },
    })

    const { generateTeamBrief } = await import('@/lib/anthropic')

    await generateTeamBrief({
      team_name: 'Lakers',
      recent_scores: [],
      top_headline: null,
      injury_flags: [],
      last_known_context: null,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls = mockGetGenerativeModel.mock.calls as unknown as Array<[{ model: string }]>
    expect(calls[0]?.[0]?.model).toBe('gemini-2.5-flash')
  })

  it('throws if GEMINI_API_KEY is missing', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')

    const { generateTeamBrief } = await import('@/lib/anthropic')

    await expect(generateTeamBrief({
      team_name: 'Lakers',
      recent_scores: [],
      top_headline: null,
      injury_flags: [],
      last_known_context: null,
    })).rejects.toThrow('Missing GEMINI_API_KEY')
  })
})
