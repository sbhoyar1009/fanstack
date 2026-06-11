'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { ESPNTeam, SportKey } from '@/types/sports'
import { SPORT_CONFIGS } from '@/lib/espn'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface TeamPickerProps {
  sports: SportKey[]
  selected: Record<SportKey, string[]>  // sportKey -> array of teamIds
  onChange: (sportKey: SportKey, teamIds: string[]) => void
}

export function TeamPicker({ sports, selected, onChange }: TeamPickerProps) {
  const [teams, setTeams] = useState<Record<SportKey, ESPNTeam[]>>({} as Record<SportKey, ESPNTeam[]>)
  const [loading, setLoading] = useState<Set<SportKey>>(new Set())

  useEffect(() => {
    sports.forEach(async (sportKey) => {
      if (teams[sportKey]) return // already loaded
      setLoading((prev) => new Set(prev).add(sportKey))
      try {
        const res = await fetch(`/api/sports/teams?sport=${sportKey}`)
        const data = await res.json()
        setTeams((prev) => ({ ...prev, [sportKey]: data.teams ?? [] }))
      } catch {
        console.error('Failed to fetch teams for', sportKey)
      } finally {
        setLoading((prev) => {
          const next = new Set(prev)
          next.delete(sportKey)
          return next
        })
      }
    })
  }, [sports]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTeam = (sportKey: SportKey, teamId: string) => {
    const current = selected[sportKey] ?? []
    if (current.includes(teamId)) {
      onChange(sportKey, current.filter((id) => id !== teamId))
    } else {
      onChange(sportKey, [...current, teamId])
    }
  }

  return (
    <div className="space-y-8">
      {sports.map((sportKey) => {
        const config = SPORT_CONFIGS[sportKey]
        const sportTeams = teams[sportKey] ?? []
        const selectedTeams = selected[sportKey] ?? []
        const isLoading = loading.has(sportKey)

        return (
          <div key={sportKey}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>{config.emoji}</span>
              <span>{config.name}</span>
              {selectedTeams.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {selectedTeams.length} team{selectedTeams.length !== 1 ? 's' : ''} selected
                </span>
              )}
            </h3>

            {isLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {sportTeams.map((team) => {
                  const isSelected = selectedTeams.includes(team.id)
                  return (
                    <button
                      key={team.id}
                      onClick={() => toggleTeam(sportKey, team.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all duration-150',
                        'hover:scale-105 active:scale-100',
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card hover:border-primary/50'
                      )}
                    >
                      {team.logo ? (
                        <div className="relative w-8 h-8">
                          <Image src={team.logo} alt={team.name} fill className="object-contain" unoptimized />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {team.abbreviation.slice(0, 2)}
                        </div>
                      )}
                      <span className="text-xs font-medium truncate w-full text-center leading-tight">
                        {team.abbreviation || team.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
