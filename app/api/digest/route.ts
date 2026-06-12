import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getTeamBriefs } from '@/lib/teambrief'
import { getTodaysDigest, saveDigestHistory, getDigestHistory } from '@/lib/db'

// GET — return today's cached digest or generate a fresh one
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    // Check if we already generated today's digest
    const cached = await getTodaysDigest(userId)
    if (cached) {
      const history = await getDigestHistory(userId, 7)
      return NextResponse.json({ digest: cached.content, fromCache: true, history })
    }

    // Generate fresh
    const briefs = await getTeamBriefs(userId)
    const content = {
      teams: briefs.teams,
      generatedAt: new Date().toISOString(),
    }

    await saveDigestHistory(userId, content, 'brief').catch(() => {})

    const history = await getDigestHistory(userId, 7)
    return NextResponse.json({ digest: content, fromCache: false, history })
  } catch (err) {
    console.error('[/api/digest]', err)
    return NextResponse.json({ error: 'Failed to generate digest' }, { status: 500 })
  }
}
