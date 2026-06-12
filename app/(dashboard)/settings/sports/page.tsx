'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SportPicker } from '@/components/onboarding/SportPicker'
import { TeamPicker } from '@/components/onboarding/TeamPicker'
import { Button } from '@/components/ui/button'
import { SPORT_CONFIGS } from '@/lib/espn'
import type { SportKey } from '@/types/sports'
import { CheckCircle, Loader2 } from 'lucide-react'

export default function SportSettingsPage() {
  const router = useRouter()
  const [selectedSports, setSelectedSports] = useState<SportKey[]>([])
  const [selectedTeams, setSelectedTeams] = useState<Record<SportKey, string[]>>({} as Record<SportKey, string[]>)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/user/preferences')
      const data = await res.json()
      const sports = (data.sports ?? []).map((s: { sport_key: string }) => s.sport_key as SportKey)
      const teams: Record<SportKey, string[]> = {} as Record<SportKey, string[]>
      for (const t of (data.teams ?? [])) {
        if (!teams[t.sport_key as SportKey]) teams[t.sport_key as SportKey] = []
        teams[t.sport_key as SportKey].push(t.team_id)
      }
      setSelectedSports(sports)
      setSelectedTeams(teams)
    } catch {
      setError('Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      const sportsPayload = selectedSports.map((key) => ({
        sportKey: key,
        sportName: SPORT_CONFIGS[key].name,
      }))

      const teamsPayload: Array<{ sportKey: string; teamId: string; teamName: string; teamLogo: string }> = []
      for (const sportKey of selectedSports) {
        const teamIds = selectedTeams[sportKey] ?? []
        if (teamIds.length > 0) {
          const res = await fetch(`/api/sports/teams?sport=${sportKey}`)
          const data = await res.json()
          for (const teamId of teamIds) {
            const team = (data.teams ?? []).find((t: { id: string }) => t.id === teamId)
            if (team) teamsPayload.push({ sportKey, teamId, teamName: team.name, teamLogo: team.logo })
          }
        }
      }

      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sports: sportsPayload, teams: teamsPayload }),
      })

      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-bold mb-4">Sports you follow</h2>
        <SportPicker selected={selectedSports} onChange={setSelectedSports} />
      </section>

      {selectedSports.length > 0 && (
        <section>
          <h2 className="text-sm font-bold mb-4">Favourite teams</h2>
          <TeamPicker
            sports={selectedSports}
            selected={selectedTeams}
            onChange={(sport, ids) => setSelectedTeams(prev => ({ ...prev, [sport]: ids }))}
          />
        </section>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle className="w-4 h-4" /> Saved
          </span>
        )}
      </div>
    </div>
  )
}
