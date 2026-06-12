'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import { SPORT_CONFIGS } from '@/lib/espn'
import type { SportKey } from '@/types/sports'
import type { PlayerProfile } from '@/lib/espn-detail'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, X, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

type SearchResult = {
  id: string
  name: string
  position: string
  team: string
  headshot?: string
  sport: SportKey
  league: string
}

function PlayerSearch({
  sport,
  onSelect,
  placeholder,
}: {
  sport: SportKey
  onSelect: (r: SearchResult) => void
  placeholder: string
}) {
  const [q, setQ] = useState('')

  const { data, isLoading } = useSWR<{ results: SearchResult[] }>(
    q.length >= 2 ? `/api/players/search?q=${encodeURIComponent(q)}&sport=${sport}` : null,
    fetcher,
  )

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-card focus-within:border-primary transition-colors">
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
        />
        {q && (
          <button onClick={() => setQ('')}>
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {q.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border/60 bg-card shadow-lg z-10 overflow-hidden">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 rounded-lg" />)}
            </div>
          ) : (data?.results ?? []).length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No players found</div>
          ) : (
            <div className="divide-y divide-border/30">
              {(data?.results ?? []).map(r => (
                <button
                  key={r.id}
                  onClick={() => { onSelect(r); setQ('') }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
                >
                  {r.headshot ? (
                    <div className="relative w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0">
                      <Image src={r.headshot} alt={r.name} fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{r.name}</p>
                    <p className="text-[10px] text-muted-foreground">{r.position} · {r.team}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{r.league}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerCard({
  result,
  profile,
  loading,
  onClear,
}: {
  result: SearchResult
  profile: PlayerProfile | null
  loading: boolean
  onClear: () => void
}) {
  const config = SPORT_CONFIGS[result.sport]

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-3">
          {result.headshot ? (
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
              <Image src={result.headshot} alt={result.name} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted shrink-0 flex items-center justify-center text-lg">{config.emoji}</div>
          )}
          <div>
            <p className="text-sm font-bold">{result.name}</p>
            <p className="text-[10px] text-muted-foreground">{result.position} · {result.team}</p>
          </div>
        </div>
        <button onClick={onClear} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 rounded" />)}
        </div>
      ) : !profile ? (
        <div className="p-6 text-center text-xs text-muted-foreground">No stats available</div>
      ) : (
        <div className="divide-y divide-border/30">
          {(profile.statistics ?? []).map(stat => (
            <div key={stat.name} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-muted-foreground">{stat.name}</span>
              <span className="text-xs font-bold tabular-nums">{stat.displayValue}</span>
            </div>
          ))}
          {(profile.statistics ?? []).length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">No season stats</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ComparePage() {
  const [sport, setSport] = useState<SportKey>('nba')
  const [playerA, setPlayerA] = useState<SearchResult | null>(null)
  const [playerB, setPlayerB] = useState<SearchResult | null>(null)

  const { data: dataA, isLoading: loadingA } = useSWR<{ profile: PlayerProfile }>(
    playerA ? `/api/players/profile?sport=${playerA.sport}&athleteId=${playerA.id}` : null,
    fetcher,
  )
  const { data: dataB, isLoading: loadingB } = useSWR<{ profile: PlayerProfile }>(
    playerB ? `/api/players/profile?sport=${playerB.sport}&athleteId=${playerB.id}` : null,
    fetcher,
  )

  const allStats = Array.from(new Set([
    ...(dataA?.profile?.statistics ?? []).map(s => s.name),
    ...(dataB?.profile?.statistics ?? []).map(s => s.name),
  ]))

  function getVal(profile: PlayerProfile | undefined, name: string) {
    return profile?.statistics?.find(s => s.name === name)?.displayValue ?? '—'
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <ArrowLeftRight className="w-4 h-4 text-purple-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Player Comparison</h1>
          <p className="text-[11px] text-muted-foreground">Compare stats between two players</p>
        </div>
      </div>

      {/* Sport selector */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(['nba', 'nfl', 'mlb', 'nhl', 'epl', 'laliga', 'mls'] as SportKey[]).map(s => (
          <button
            key={s}
            onClick={() => { setSport(s); setPlayerA(null); setPlayerB(null) }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              sport === s ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border/60 text-muted-foreground hover:border-border',
            )}
          >
            {SPORT_CONFIGS[s].emoji} {SPORT_CONFIGS[s].name}
          </button>
        ))}
      </div>

      {/* Search boxes */}
      {(!playerA || !playerB) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {!playerA ? (
            <div>
              <p className="text-xs font-semibold mb-2 text-muted-foreground">Player A</p>
              <PlayerSearch sport={sport} onSelect={setPlayerA} placeholder="Search player A…" />
            </div>
          ) : <div />}
          {!playerB ? (
            <div>
              <p className="text-xs font-semibold mb-2 text-muted-foreground">Player B</p>
              <PlayerSearch sport={sport} onSelect={setPlayerB} placeholder="Search player B…" />
            </div>
          ) : <div />}
        </div>
      )}

      {/* Side by side comparison */}
      {playerA && playerB ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <PlayerCard result={playerA} profile={dataA?.profile ?? null} loading={loadingA} onClear={() => setPlayerA(null)} />
            <PlayerCard result={playerB} profile={dataB?.profile ?? null} loading={loadingB} onClear={() => setPlayerB(null)} />
          </div>

          {allStats.length > 0 && (
            <div className="rounded-2xl border border-border/60 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border/40 bg-muted/30">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Head-to-head</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/10">
                    <th className="text-center px-4 py-2 text-xs font-bold text-foreground/80 w-1/3">{playerA.name.split(' ').pop()}</th>
                    <th className="text-center px-4 py-2 text-xs text-muted-foreground w-1/3">Stat</th>
                    <th className="text-center px-4 py-2 text-xs font-bold text-foreground/80 w-1/3">{playerB.name.split(' ').pop()}</th>
                  </tr>
                </thead>
                <tbody>
                  {allStats.map((name, i) => {
                    const vA = getVal(dataA?.profile, name)
                    const vB = getVal(dataB?.profile, name)
                    const nA = parseFloat(vA)
                    const nB = parseFloat(vB)
                    const aWins = !isNaN(nA) && !isNaN(nB) && nA > nB
                    const bWins = !isNaN(nA) && !isNaN(nB) && nB > nA
                    return (
                      <tr key={name} className={cn('border-b border-border/30 last:border-0', i % 2 === 0 ? '' : 'bg-muted/10')}>
                        <td className={cn('px-4 py-2.5 text-xs text-center font-bold tabular-nums', aWins ? 'text-primary' : 'text-foreground/70')}>{vA}</td>
                        <td className="px-4 py-2.5 text-xs text-center text-muted-foreground">{name}</td>
                        <td className={cn('px-4 py-2.5 text-xs text-center font-bold tabular-nums', bWins ? 'text-primary' : 'text-foreground/70')}>{vB}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : playerA ? (
        <div>
          <p className="text-xs font-semibold mb-2 text-muted-foreground">Player B</p>
          <PlayerSearch sport={sport} onSelect={setPlayerB} placeholder="Search player B…" />
        </div>
      ) : null}
    </div>
  )
}
