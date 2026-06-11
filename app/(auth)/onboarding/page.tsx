'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SportPicker } from '@/components/onboarding/SportPicker'
import { TeamPicker } from '@/components/onboarding/TeamPicker'
import { Button } from '@/components/ui/button'
import { SPORT_CONFIGS } from '@/lib/espn'
import type { SportKey } from '@/types/sports'
import { cn } from '@/lib/utils'

type Step = 'sports' | 'teams' | 'saving'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('sports')
  const [selectedSports, setSelectedSports] = useState<SportKey[]>([])
  const [selectedTeams, setSelectedTeams] = useState<Record<SportKey, string[]>>({} as Record<SportKey, string[]>)
  const [error, setError] = useState<string | null>(null)

  const handleTeamChange = (sportKey: SportKey, teamIds: string[]) => {
    setSelectedTeams((prev) => ({ ...prev, [sportKey]: teamIds }))
  }

  async function handleFinish() {
    setStep('saving')
    setError(null)

    try {
      // Build the sports payload
      const sportsPayload = selectedSports.map((key) => ({
        sportKey: key,
        sportName: SPORT_CONFIGS[key].name,
      }))

      // Build the teams payload
      const teamsPayload: Array<{
        sportKey: string
        teamId: string
        teamName: string
        teamLogo: string
      }> = []

      for (const sportKey of selectedSports) {
        const teamIds = selectedTeams[sportKey] ?? []
        // Fetch team details to get names + logos
        if (teamIds.length > 0) {
          const res = await fetch(`/api/sports/teams?sport=${sportKey}`)
          const data = await res.json()
          const teams = data.teams ?? []
          for (const teamId of teamIds) {
            const team = teams.find((t: { id: string }) => t.id === teamId)
            if (team) {
              teamsPayload.push({
                sportKey,
                teamId,
                teamName: team.name,
                teamLogo: team.logo,
              })
            }
          }
        }
      }

      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sports: sportsPayload, teams: teamsPayload }),
      })

      router.push('/')
      router.refresh()
    } catch (e) {
      setError('Something went wrong. Please try again.')
      setStep('teams')
    }
  }

  const totalTeamSelections = Object.values(selectedTeams).reduce(
    (sum, ids) => sum + ids.length, 0
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">🏆 Set up FanStack</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pick your sports and teams to personalize your dashboard
          </p>
          {/* Progress dots */}
          <div className="flex gap-2 mt-4">
            <div className={cn('h-1.5 rounded-full w-16 transition-colors', step !== 'sports' ? 'bg-primary' : 'bg-primary')} />
            <div className={cn('h-1.5 rounded-full w-16 transition-colors', step === 'teams' || step === 'saving' ? 'bg-primary' : 'bg-muted')} />
          </div>
        </div>

        {/* Step 1: Sports */}
        {step === 'sports' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Which sports do you follow?</h2>
              <p className="text-sm text-muted-foreground mt-1">Select all that apply</p>
            </div>
            <SportPicker selected={selectedSports} onChange={setSelectedSports} />
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setStep('teams')}
                disabled={selectedSports.length === 0}
                size="lg"
              >
                Next: Pick teams →
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Teams */}
        {(step === 'teams' || step === 'saving') && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Which teams do you root for?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Optional — skip to follow all teams in your sports
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep('sports')}>
                ← Back
              </Button>
            </div>

            <TeamPicker
              sports={selectedSports}
              selected={selectedTeams}
              onChange={handleTeamChange}
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {totalTeamSelections > 0
                  ? `${totalTeamSelections} team${totalTeamSelections !== 1 ? 's' : ''} selected`
                  : 'No teams selected (following all sports)'}
              </p>
              <Button
                onClick={handleFinish}
                disabled={step === 'saving'}
                size="lg"
              >
                {step === 'saving' ? 'Saving…' : "Let's go! 🚀"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
