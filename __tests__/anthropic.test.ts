import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TeamBriefContext } from '@/lib/anthropic'

// vi.mock is hoisted above imports — must use factory with no top-level vars
const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate }
  },
}))

vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')

describe('generateTeamBrief', () => {
  beforeEach(() => {
    vi.resetModules()
    mockCreate.mockReset()
  })

  it('calls Claude and returns the brief text', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Arsenal beat Man City 2-1, Saka scored twice.' }],
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
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Brief.' }],
    })

    const { generateTeamBrief } = await import('@/lib/anthropic')

    await generateTeamBrief({
      team_name: 'Arsenal',
      recent_scores: [{ opponent: 'Man City', result: 'W 2–1', date: 'Jun 9' }],
      top_headline: 'Saka named MOTM',
      injury_flags: [],
      last_known_context: null,
    })

    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string
    expect(prompt).toContain('Arsenal')
    expect(prompt).toContain('W 2–1')
  })

  it('requests max_tokens of 120', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Brief.' }],
    })

    const { generateTeamBrief } = await import('@/lib/anthropic')

    await generateTeamBrief({
      team_name: 'Lakers',
      recent_scores: [],
      top_headline: null,
      injury_flags: [],
      last_known_context: null,
    })

    expect(mockCreate.mock.calls[0][0].max_tokens).toBe(120)
  })

  it('throws if response type is not text', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: '1' }],
    })

    const { generateTeamBrief } = await import('@/lib/anthropic')

    await expect(generateTeamBrief({
      team_name: 'Lakers',
      recent_scores: [],
      top_headline: null,
      injury_flags: [],
      last_known_context: null,
    })).rejects.toThrow('Unexpected response type')
  })
})
