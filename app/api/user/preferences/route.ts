import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getUserSports,
  getUserTeams,
  upsertUserSports,
  upsertUserTeams,
  deleteUserSport,
  deleteUserTeam,
} from '@/lib/db'

// GET /api/user/preferences  — fetch user's sports + teams
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [sports, teams] = await Promise.all([
      getUserSports(session.user.id),
      getUserTeams(session.user.id),
    ])
    return NextResponse.json({ sports, teams })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('PGRST')) {
      return NextResponse.json({ sports: [], teams: [], schemaError: true })
    }
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

// POST /api/user/preferences  — save sports + teams (full replace for onboarding)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { sports, teams } = body as {
    sports?: Array<{ sportKey: string; sportName: string }>
    teams?: Array<{ sportKey: string; teamId: string; teamName: string; teamLogo: string }>
  }

  const userId = session.user.id

  try {
    if (sports) await upsertUserSports(userId, sports)
    if (teams) await upsertUserTeams(userId, teams)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('PGRST')) {
      return NextResponse.json({ error: 'Database tables not set up. Run schema.sql in Supabase.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

// PATCH /api/user/preferences  — add/remove individual sport or team
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const body = await req.json()

  if (body.action === 'add_sport') {
    await upsertUserSports(userId, [{ sportKey: body.sportKey, sportName: body.sportName }])
  } else if (body.action === 'remove_sport') {
    await deleteUserSport(userId, body.sportKey)
  } else if (body.action === 'add_team') {
    await upsertUserTeams(userId, [{
      sportKey: body.sportKey,
      teamId: body.teamId,
      teamName: body.teamName,
      teamLogo: body.teamLogo,
    }])
  } else if (body.action === 'remove_team') {
    await deleteUserTeam(userId, body.sportKey, body.teamId)
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
