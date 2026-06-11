import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getGameSummary, saveGameSummary } from '@/lib/db'
import { generateGameSummary } from '@/lib/anthropic'
import { getGameDetails, SPORT_CONFIGS } from '@/lib/espn'
import type { SportKey } from '@/types/sports'

// POST /api/ai/catchmeup
// Body: { gameId: string, sportKey: SportKey }
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { gameId?: string; sportKey?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { gameId, sportKey } = body
  if (!gameId || !sportKey) {
    return NextResponse.json({ error: 'Missing gameId or sportKey' }, { status: 400 })
  }

  if (!SPORT_CONFIGS[sportKey as SportKey]) {
    return NextResponse.json({ error: 'Unknown sportKey' }, { status: 400 })
  }

  // Check cache first — don't re-generate for the same game
  const cached = await getGameSummary(gameId)
  if (cached) {
    return NextResponse.json({ summary: cached.summary, cached: true })
  }

  // Fetch full game details from ESPN
  const game = await getGameDetails(sportKey as SportKey, gameId)
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  if (game.status !== 'post') {
    return NextResponse.json({ error: 'Game is not finished yet' }, { status: 400 })
  }

  try {
    const summary = await generateGameSummary(game)
    await saveGameSummary(gameId, sportKey, summary)
    return NextResponse.json({ summary, cached: false })
  } catch (err) {
    console.error('[/api/ai/catchmeup]', err)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
