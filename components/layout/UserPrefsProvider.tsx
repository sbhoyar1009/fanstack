'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { SportKey } from '@/types/sports'

export type UserSport = { sport_key: SportKey; sport_name: string }
export type UserTeam  = { sport_key: SportKey; team_id: string; team_name: string; team_logo: string }

interface UserPrefsCtx {
  sports:        UserSport[]
  teams:         UserTeam[]
  isLoading:     boolean
  sportKeys:     SportKey[]
  teamIds:       Set<string>
  teamNames:     string[]
  followsSport:  (key: SportKey) => boolean
  followsTeam:   (teamId: string) => boolean
  toggleSport:   (key: SportKey, name: string) => Promise<void>
  toggleTeam:    (team: Omit<UserTeam, never>) => Promise<void>
  refresh:       () => Promise<void>
}

const Ctx = createContext<UserPrefsCtx | null>(null)

export function useUserPrefs(): UserPrefsCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useUserPrefs must be used inside UserPrefsProvider')
  return ctx
}

export function UserPrefsProvider({ children }: { children: ReactNode }) {
  const [sports, setSports]   = useState<UserSport[]>([])
  const [teams, setTeams]     = useState<UserTeam[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res  = await fetch('/api/user/preferences')
      const data = await res.json()
      setSports(data.sports ?? [])
      setTeams(data.teams ?? [])
    } catch {
      // silently fail — user just sees empty state
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleSport = useCallback(async (key: SportKey, name: string) => {
    const has = sports.some((s) => s.sport_key === key)
    // Optimistic
    setSports((prev) =>
      has ? prev.filter((s) => s.sport_key !== key)
          : [...prev, { sport_key: key, sport_name: name }]
    )
    if (has) setTeams((prev) => prev.filter((t) => t.sport_key !== key))

    await fetch('/api/user/preferences', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(
        has ? { action: 'remove_sport', sportKey: key }
            : { action: 'add_sport',    sportKey: key, sportName: name }
      ),
    })
  }, [sports])

  const toggleTeam = useCallback(async (team: UserTeam) => {
    const has = teams.some((t) => t.team_id === team.team_id && t.sport_key === team.sport_key)
    // Optimistic
    setTeams((prev) =>
      has ? prev.filter((t) => !(t.team_id === team.team_id && t.sport_key === team.sport_key))
          : [...prev, team]
    )

    await fetch('/api/user/preferences', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(
        has
          ? { action: 'remove_team', sportKey: team.sport_key, teamId: team.team_id }
          : { action: 'add_team',    sportKey: team.sport_key, teamId: team.team_id,
              teamName: team.team_name, teamLogo: team.team_logo }
      ),
    })
  }, [teams])

  const value: UserPrefsCtx = {
    sports,
    teams,
    isLoading,
    sportKeys:    sports.map((s) => s.sport_key),
    teamIds:      new Set(teams.map((t) => t.team_id)),
    teamNames:    teams.map((t) => t.team_name),
    followsSport: (key) => sports.some((s) => s.sport_key === key),
    followsTeam:  (id)  => teams.some((t) => t.team_id === id),
    toggleSport,
    toggleTeam,
    refresh:      load,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
