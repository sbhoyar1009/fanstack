'use client'

import useSWR from 'swr'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { SPORT_CONFIGS } from '@/lib/espn'
import type { SportKey } from '@/types/sports'
import type { LeaderCategory } from '@/lib/espn-detail'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const STAT_SPORTS: SportKey[] = ['nba', 'nfl', 'mlb', 'nhl', 'epl', 'laliga', 'mls']

export default function StatsPage() {
  const [sport, setSport] = useState<SportKey>('nba')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const { data, isLoading } = useSWR<{ leaders: LeaderCategory[] }>(
    `/api/stats/leaders?sport=${sport}`,
    fetcher,
  )

  const categories = data?.leaders ?? []
  const currentCat = categories.find(c => c.name === activeCategory) ?? categories[0]

  const chartData = (currentCat?.leaders ?? []).slice(0, 10).map(l => ({
    name: l.athleteName.split(' ').pop() ?? l.athleteName,
    fullName: l.athleteName,
    value: parseFloat(l.value) || 0,
    displayValue: l.displayValue,
    teamName: l.teamName,
    headshot: l.athleteHeadshot,
    athleteId: l.athleteId,
  }))

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Stats Deep-Dive</h1>
          <p className="text-[11px] text-muted-foreground">League leaders and statistical breakdowns</p>
        </div>
      </div>

      {/* Sport selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STAT_SPORTS.map(s => {
          const cfg = SPORT_CONFIGS[s]
          return (
            <button
              key={s}
              onClick={() => { setSport(s); setActiveCategory(null) }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                sport === s
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'border-border/60 text-muted-foreground hover:border-border',
              )}
            >
              {cfg.emoji} {cfg.name}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 rounded-xl" />)}
          </div>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm">No stats available for this league.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
                  (activeCategory ?? categories[0]?.name) === cat.name
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border/60 text-muted-foreground hover:border-border',
                )}
              >
                {cat.displayName}
              </button>
            ))}
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                {currentCat?.displayName} Leaders
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 40, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={55}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    formatter={(value, _, props) => [props.payload.displayValue, props.payload.fullName]}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {chartData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.4)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Leader list */}
          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/40 bg-muted/30">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Top {currentCat?.displayName}
              </h3>
            </div>
            <div className="divide-y divide-border/30">
              {(currentCat?.leaders ?? []).slice(0, 10).map((l) => (
                <Link
                  key={l.athleteId}
                  href={`/players/${sport}/${l.athleteId}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-xs font-mono text-muted-foreground w-5">{l.rank}</span>
                  {l.athleteHeadshot ? (
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0">
                      <Image src={l.athleteHeadshot} alt={l.athleteName} fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs">
                      {l.athleteName[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{l.athleteName}</p>
                    <p className="text-[10px] text-muted-foreground">{l.teamName}</p>
                  </div>
                  <span className="text-lg font-black text-primary tabular-nums">{l.displayValue}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
