import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getTeamBriefs } from '@/lib/teambrief'

// GET /api/ai/teambrief
// Returns per-team catch-up briefs since the user's last_opened_at.
// Updates last_opened_at to NOW() on success.
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await getTeamBriefs(session.user.id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/ai/teambrief]', err)
    return NextResponse.json({ error: 'Failed to generate team briefs' }, { status: 500 })
  }
}
