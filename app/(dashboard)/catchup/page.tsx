import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getUserTeams } from '@/lib/db'
import { getTeamBriefs } from '@/lib/teambrief'
import { WhatDidIMiss } from '@/components/feed/WhatDidIMiss'

export const dynamic = 'force-dynamic'

export default async function CatchupPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  let userTeams: Awaited<ReturnType<typeof getUserTeams>> = []
  try {
    userTeams = await getUserTeams(session.user.id)
  } catch (err) {
    const e = err as { message?: string; details?: string } | Error | null
    const msg = e instanceof Error ? e.message : (typeof e === 'object' && e !== null ? `${e.message ?? ''} ${e.details ?? ''}` : String(e))
    if (msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-6 text-center text-muted-foreground text-sm">
          Cannot reach database. Check your Supabase URL in .env.local and restart the server.
        </div>
      )
    }
    throw err
  }
  if (userTeams.length === 0) redirect('/onboarding')

  const briefs = await getTeamBriefs(session.user.id)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <WhatDidIMiss
        teams={briefs.teams}
        lastOpenedAt={briefs.lastOpenedAt}
        updatedAt={briefs.updatedAt}
      />
    </div>
  )
}
