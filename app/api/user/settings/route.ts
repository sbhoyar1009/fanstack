import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getUserSettings, upsertUserSettings } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const settings = await getUserSettings(session.user.id)
    return NextResponse.json({ settings: settings ?? {
      user_id: session.user.id,
      digest_format: 'brief',
      digest_time: '08:00',
      timezone: 'UTC',
      email_enabled: false,
      notification_prefs: { kickoff: true, finalScore: true, injury: true },
    }})
  } catch (err) {
    console.error('[/api/user/settings GET]', err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    await upsertUserSettings(session.user.id, body)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/user/settings PATCH]', err)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}
