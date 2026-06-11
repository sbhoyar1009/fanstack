import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getUserSports, getUserTeams } from '@/lib/db'
import { getScores, getNews } from '@/lib/espn'
import { getGoogleNews } from '@/lib/googlenews'
import { filterGamesByTeams, filterNewsByTeams } from '@/lib/filters'
import { withCache, TTL } from '@/lib/redis'
import type { NormalizedGame, NewsItem, SportKey } from '@/types/sports'
import { HomeFeedClient } from './HomeFeedClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  let dbSports: Awaited<ReturnType<typeof getUserSports>> = []
  let dbTeams:  Awaited<ReturnType<typeof getUserTeams>>  = []

  try {
    ;[dbSports, dbTeams] = await Promise.all([
      getUserSports(userId),
      getUserTeams(userId),
    ])
  } catch (err) {
    const e = err as { message?: string; details?: string; code?: string } | Error | null
    const msg = e instanceof Error ? e.message : (typeof e === 'object' && e !== null ? `${e.message ?? ''} ${e.details ?? ''}` : String(e))
    if (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('PGRST')) {
      return <SetupRequired />
    }
    if (msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
      return <DatabaseUnreachable />
    }
    throw err
  }

  if (dbSports.length === 0) redirect('/onboarding')

  const sportKeys = dbSports.map((s) => s.sport_key as SportKey)

  const teamNames = dbTeams.map((t) => t.team_name)

  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  const [allScoreResults, espnNewsResults, googleNewsResults] = await Promise.all([
    Promise.allSettled(sportKeys.map((k) =>
      withCache<NormalizedGame[]>(`scores:${k}`, TTL.LIVE, () => getScores(k))
    )),
    Promise.allSettled(sportKeys.map((k) =>
      withCache<NewsItem[]>(`news:espn:${k}:${todayStr}`, TTL.NEWS, () => getNews(k))
    )),
    Promise.allSettled(sportKeys.map((k) => {
      const cfg = dbSports.find((s) => s.sport_key === k)
      return withCache<NewsItem[]>(`news:google:${k}:${todayStr}`, TTL.NEWS, () =>
        getGoogleNews(k, cfg?.sport_name ?? k, teamNames)
      )
    })),
  ])

  const allGames = allScoreResults
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof getScores>>>).value)

  const espnNews = espnNewsResults
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof getNews>>>).value)

  const googleNews = googleNewsResults
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof getGoogleNews>>>).value)

  // ── Filter & merge news ────────────────────────────────────────────────────
  const filteredGames = filterGamesByTeams(allGames, dbTeams)

  const seenHeadlines = new Set<string>()
  const filteredNews = filterNewsByTeams([...espnNews, ...googleNews], dbTeams)
    .filter((n) => {
      const key = n.headline.toLowerCase().slice(0, 60)
      if (seenHeadlines.has(key)) return false
      seenHeadlines.add(key)
      return true
    })
    .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
    .slice(0, 8)

  const liveGames   = filteredGames.filter((g) => g.status === 'in')
  const todayGames  = filteredGames.filter((g) => {
    if (g.status !== 'pre') return false
    const s = new Date(g.startTime), n = new Date()
    return s.getFullYear() === n.getFullYear() && s.getMonth() === n.getMonth() && s.getDate() === n.getDate()
  })
  const recentGames = filteredGames.filter((g) => g.status === 'post').slice(0, 3)

  return (
    <HomeFeedClient
      liveGames={liveGames}
      todayGames={todayGames}
      recentGames={recentGames}
      news={filteredNews}
      sportKeys={sportKeys}
      followedTeamIds={dbTeams.map((t) => t.team_id)}
    />
  )
}

function DatabaseUnreachable() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-5">
        <div className="text-5xl">🔌</div>
        <h1 className="text-xl font-bold">Cannot reach database</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The app cannot connect to Supabase. The project may be paused, deleted, or
          the URL in <code className="bg-muted px-1 rounded text-xs">.env.local</code> is incorrect.
        </p>
        <ol className="text-left text-sm space-y-2 bg-muted/40 rounded-xl p-4 border">
          <li className="flex gap-2">
            <span className="font-bold text-primary shrink-0">1.</span>
            Go to{' '}
            <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer"
              className="text-primary underline underline-offset-2">
              app.supabase.com
            </a>{' '}and check your project is active (not paused)
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary shrink-0">2.</span>
            In Project Settings → API, copy the <strong>Project URL</strong> and <strong>anon key</strong>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary shrink-0">3.</span>
            Update <code className="bg-muted px-1 rounded text-xs">.env.local</code>:{' '}
            <code className="bg-muted px-1 rounded text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="bg-muted px-1 rounded text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary shrink-0">4.</span>
            Restart the dev server and refresh
          </li>
        </ol>
      </div>
    </div>
  )
}

function SetupRequired() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-5">
        <div className="text-5xl">🗄️</div>
        <h1 className="text-xl font-bold">Database setup required</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The app connected to Supabase but the tables don&apos;t exist yet.
          You need to run the schema in the Supabase SQL editor.
        </p>
        <ol className="text-left text-sm space-y-2 bg-muted/40 rounded-xl p-4 border">
          <li className="flex gap-2">
            <span className="font-bold text-primary shrink-0">1.</span>
            Go to{' '}
            <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer"
              className="text-primary underline underline-offset-2">
              app.supabase.com
            </a>{' '}→ your project
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary shrink-0">2.</span>
            Click <strong>SQL Editor</strong> → <strong>New query</strong>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary shrink-0">3.</span>
            Open <code className="bg-muted px-1 rounded text-xs">fanstack/schema.sql</code>, paste all contents, click <strong>Run</strong>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary shrink-0">4.</span>
            Refresh this page
          </li>
        </ol>
        <a href="/"
          className="inline-block mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Refresh after running schema →
        </a>
      </div>
    </div>
  )
}
