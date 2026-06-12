'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Settings = {
  digest_format: 'brief' | 'detailed'
  digest_time: string
  timezone: string
  email_enabled: boolean
  notification_prefs: { kickoff: boolean; finalScore: boolean; injury: boolean }
}

const defaultSettings: Settings = {
  digest_format: 'brief',
  digest_time: '08:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  email_enabled: false,
  notification_prefs: { kickoff: true, finalScore: true, injury: true },
}

export default function DigestSettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/user/settings')
      const data = await res.json()
      if (data.settings) {
        setSettings({ ...defaultSettings, ...data.settings })
      }
    } catch {
      // Use defaults
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
      await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function toggle(key: keyof Settings['notification_prefs']) {
    setSettings(s => ({
      ...s,
      notification_prefs: { ...s.notification_prefs, [key]: !s.notification_prefs[key] },
    }))
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
      {/* Digest format */}
      <section className="rounded-2xl border border-border/60 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold">Daily digest format</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Choose how detailed your daily brief is</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(['brief', 'detailed'] as const).map(format => (
            <button
              key={format}
              onClick={() => setSettings(s => ({ ...s, digest_format: format }))}
              className={cn(
                'text-left p-4 rounded-xl border-2 transition-all',
                settings.digest_format === format
                  ? 'border-primary bg-primary/5'
                  : 'border-border/60 hover:border-border',
              )}
            >
              <p className="text-sm font-bold capitalize">{format}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format === 'brief' ? '1-2 sentences per team' : 'Full paragraph with context'}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Notification prefs */}
      <section className="rounded-2xl border border-border/60 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold">In-app notifications</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Which events surface in your notifications panel</p>
        </div>
        <div className="space-y-3">
          {([
            { key: 'kickoff' as const, label: 'Kickoff reminders', desc: '15 min before your teams play' },
            { key: 'finalScore' as const, label: 'Final scores', desc: 'When your team\'s game ends' },
            { key: 'injury' as const, label: 'Injury alerts', desc: 'Key player injury news' },
          ]).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <button
                onClick={() => toggle(key)}
                className={cn(
                  'relative w-10 h-5.5 rounded-full transition-colors shrink-0',
                  settings.notification_prefs[key] ? 'bg-primary' : 'bg-muted',
                )}
              >
                <span className={cn(
                  'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  settings.notification_prefs[key] ? 'translate-x-4.5' : 'translate-x-0',
                )} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {saving ? 'Saving…' : 'Save preferences'}
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
