'use client'

import useSWR from 'swr'
import { use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { SPORT_CONFIGS } from '@/lib/espn'
import type { SportKey } from '@/types/sports'
import type { PlayerProfile } from '@/lib/espn-detail'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, Award, GraduationCap, Calendar, ChevronRight } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function PlayerProfilePage({
  params,
}: {
  params: Promise<{ sport: string; playerId: string }>
}) {
  const { sport, playerId } = use(params)
  const sportKey = sport as SportKey
  const config = SPORT_CONFIGS[sportKey]

  const { data, isLoading, error } = useSWR<{ profile: PlayerProfile }>(
    `/api/players/profile?sport=${sportKey}&athleteId=${playerId}`,
    fetcher,
  )

  const profile = data?.profile

  if (isLoading) return <PlayerSkeleton />

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="text-sm font-semibold">Player not found</p>
        <p className="text-xs text-muted-foreground mt-1 mb-4">Could not load profile for this athlete.</p>
        <Link href="/scores" className="text-xs text-primary underline underline-offset-2">← Back</Link>
      </div>
    )
  }

  const facts = [
    profile.age         && { icon: Calendar,      label: 'Age',        value: String(profile.age) },
    profile.height      && { icon: Award,          label: 'Height',     value: profile.height },
    profile.birthPlace  && { icon: MapPin,         label: 'From',       value: profile.birthPlace },
    profile.college     && { icon: GraduationCap,  label: 'College',    value: profile.college },
    profile.experience  && { icon: Award,          label: 'Experience', value: profile.experience },
  ].filter(Boolean) as Array<{ icon: React.ElementType; label: string; value: string }>

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero */}
      <div
        className="relative px-4 sm:px-6 pt-8 pb-6"
        style={{
          background: profile.team?.color
            ? `linear-gradient(135deg, ${profile.team.color}25 0%, transparent 60%)`
            : undefined,
        }}
      >
        <Link href="/scores" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
          ← Back
        </Link>

        <div className="flex items-start gap-5">
          {/* Headshot */}
          <div className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-muted border border-border/40">
            {profile.headshot ? (
              <Image src={profile.headshot} alt={profile.fullName} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">{config.emoji}</div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
              {config.emoji} {config.name}
            </p>
            <h1 className="text-2xl font-black tracking-tight leading-tight">{profile.fullName}</h1>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {profile.jersey && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary">
                  #{profile.jersey}
                </span>
              )}
              {profile.position && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-muted text-muted-foreground">
                  {profile.position}
                </span>
              )}
              {profile.team && (
                <Link
                  href={`/teams/${sportKey}/${profile.team.id}`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {profile.team.logo && (
                    <div className="relative w-4 h-4">
                      <Image src={profile.team.logo} alt={profile.team.name} fill className="object-contain" unoptimized />
                    </div>
                  )}
                  {profile.team.name}
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bio facts */}
      {facts.length > 0 && (
        <div className="px-4 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {facts.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2 p-3 rounded-xl border border-border/50 bg-card">
              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
                <p className="text-xs font-bold truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Season stats */}
      {profile.statistics && profile.statistics.length > 0 && (
        <div className="px-4 sm:px-6 py-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Season stats</h2>
          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <table className="w-full">
              <tbody>
                {profile.statistics.map((stat, i) => (
                  <tr key={stat.name} className={`border-b border-border/30 last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{stat.name}</td>
                    <td className="px-4 py-2.5 text-xs font-bold text-right tabular-nums">{stat.displayValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-6 space-y-4">
      <Skeleton className="h-4 w-12 rounded" />
      <div className="flex gap-5">
        <Skeleton className="w-24 h-24 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2 pt-2">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-7 w-48 rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-12 rounded-lg" />
            <Skeleton className="h-5 w-16 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
      <div className="space-y-2 mt-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
      </div>
    </div>
  )
}
