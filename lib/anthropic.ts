import { GoogleGenerativeAI } from '@google/generative-ai'
import type { NormalizedGame } from '@/types/sports'

let _client: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!_client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY env var')
    }
    _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return _client
}

export type TeamBriefContext = {
  team_name: string
  recent_scores: Array<{ opponent: string; result: string; date: string }>
  top_headline: string | null
  injury_flags: string[]
  last_known_context: string | null
}

export async function generateTeamBrief(context: TeamBriefContext): Promise<string> {
  const model = getClient().getGenerativeModel({ model: 'gemini-2.5-flash' })

  const scoresText = context.recent_scores.length > 0
    ? context.recent_scores.map(s => `${s.date}: ${s.result} vs ${s.opponent}`).join('; ')
    : 'No recent games'

  const injuryText = context.injury_flags.length > 0
    ? `Key injuries: ${context.injury_flags.join(', ')}.`
    : ''

  const headlineText = context.top_headline ? `Latest news: ${context.top_headline}.` : ''

  const contextText = context.last_known_context
    ? `Context: ${context.last_known_context}.`
    : ''

  const prompt = `You are catching up a sports fan on ${context.team_name}. Write one plain-English paragraph, maximum 60 words.

Recent results: ${scoresText}
${headlineText}
${injuryText}
${contextText}

Tone: "tell me what happened so I can talk about it — skip the stats, name the storyline."
Example: "Arsenal beat Man City 2-1, Saka scored twice, City are now 4 points back with 3 games left."
Do NOT use bullet points. Do NOT start with "Here's" or "In summary".`

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

export type PreMatchContext = {
  homeTeam: string
  awayTeam: string
  league: string
  kickoffTime: string
  homeForm: string[]   // last 5 results e.g. ['W','W','L','D','W']
  awayForm: string[]
  stakes?: string      // e.g. "title decider", "relegation six-pointer"
}

export async function generatePreMatchPreview(ctx: PreMatchContext): Promise<string> {
  const model = getClient().getGenerativeModel({ model: 'gemini-2.5-flash' })

  const homeFormStr = ctx.homeForm.length ? ctx.homeForm.join('-') : 'Unknown form'
  const awayFormStr = ctx.awayForm.length ? ctx.awayForm.join('-') : 'Unknown form'
  const stakesStr   = ctx.stakes ? ` Stakes: ${ctx.stakes}.` : ''

  const prompt = `You are a sharp sports previewer. Write a match preview in exactly 2-3 sentences.

${ctx.awayTeam} vs ${ctx.homeTeam} — ${ctx.league}
${ctx.homeTeam} recent form: ${homeFormStr}
${ctx.awayTeam} recent form: ${awayFormStr}${stakesStr}

Rules:
- Name both teams, mention who's in better form
- One concrete prediction or key matchup to watch
- Conversational, punchy — no filler
- Under 60 words
- Do NOT start with "In a" or use generic phrases`

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

export async function generateGameSummary(game: NormalizedGame): Promise<string> {
  const model = getClient().getGenerativeModel({ model: 'gemini-2.5-flash' })

  const { homeTeam, awayTeam, league, statusText } = game
  const scoreStr = game.status === 'post'
    ? `${awayTeam.name} ${awayTeam.score} – ${homeTeam.score} ${homeTeam.name}`
    : `${awayTeam.name} vs ${homeTeam.name}`

  const prompt = `You are a knowledgeable sports reporter. Summarize the following ${league} game in exactly 3-4 sentences for a fan who missed it.

Game: ${scoreStr}
Status: ${statusText}
Home record: ${homeTeam.record ?? 'unknown'}
Away record: ${awayTeam.record ?? 'unknown'}

Rules:
- Be specific, not generic (mention the actual teams and score)
- Include what the result means for each team's season/standings if relevant
- Use conversational, engaging language
- Do NOT start with "In a" or "In what was"
- Keep it under 80 words total`

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}
