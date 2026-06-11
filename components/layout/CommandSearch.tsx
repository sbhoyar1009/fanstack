'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command'
import { useUserPrefs } from './UserPrefsProvider'
import { SPORT_CONFIGS } from '@/lib/espn'
import type { ESPNTeam, SportKey } from '@/types/sports'
import Image from 'next/image'
import { Activity, Calendar, Home, Newspaper, Trophy } from 'lucide-react'

const NAV = [
  { label: 'Home',      href: '/',          icon: Home     },
  { label: 'Scores',    href: '/scores',    icon: Activity },
  { label: 'News',      href: '/news',      icon: Newspaper},
  { label: 'Schedule',  href: '/schedule',  icon: Calendar },
  { label: 'Standings', href: '/standings', icon: Trophy   },
]

export function CommandSearch() {
  const [open, setOpen]           = useState(false)
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<ESPNTeam[]>([])
  const [searching, setSearching] = useState(false)
  const [activeSport, setActiveSport] = useState<SportKey>('nba')
  const { teams: followedTeams, sportKeys, toggleTeam, followsTeam } = useUserPrefs()
  const router = useRouter()

  // Cmd+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Debounced team search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timeout = setTimeout(async () => {
      setSearching(true)
      try {
        const sport = sportKeys[0] ?? activeSport
        const res   = await fetch(`/api/sports/teams?sport=${sport}`)
        const data  = await res.json()
        const filtered = (data.teams ?? []).filter((t: ESPNTeam) =>
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.displayName.toLowerCase().includes(query.toLowerCase())
        )
        setResults(filtered.slice(0, 6))
      } catch { /* ignore */ }
      setSearching(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [query, sportKeys, activeSport])

  const go = useCallback((href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }, [router])

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted transition-colors text-sm text-muted-foreground w-48"
      >
        <span className="flex-1 text-left">Search...</span>
        <kbd className="text-[10px] font-mono bg-background border border-border/60 px-1.5 py-0.5 rounded text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search teams, navigate pages..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {searching ? 'Searching...' : 'No results found.'}
          </CommandEmpty>

          {/* Navigation */}
          {!query && (
            <CommandGroup heading="Navigate">
              {NAV.map(({ label, href, icon: Icon }) => (
                <CommandItem key={href} onSelect={() => go(href)} className="gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* My teams */}
          {!query && followedTeams.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="My Teams">
                {followedTeams.slice(0, 6).map((t) => (
                  <CommandItem
                    key={t.team_id}
                    onSelect={() => go(`/teams/${t.sport_key}/${t.team_id}`)}
                    className="gap-3"
                  >
                    {t.team_logo && (
                      <Image src={t.team_logo} alt={t.team_name} width={20} height={20} className="object-contain" unoptimized />
                    )}
                    {t.team_name}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {SPORT_CONFIGS[t.sport_key]?.emoji}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Sport filter for search */}
          {query && sportKeys.length > 1 && (
            <CommandGroup heading="Search in sport">
              {sportKeys.map((key) => (
                <CommandItem
                  key={key}
                  onSelect={() => setActiveSport(key)}
                  className={activeSport === key ? 'bg-accent' : ''}
                >
                  {SPORT_CONFIGS[key].emoji} {SPORT_CONFIGS[key].name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Team results */}
          {results.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={`Teams · ${SPORT_CONFIGS[activeSport]?.name}`}>
                {results.map((team) => {
                  const isFav = followsTeam(team.id)
                  return (
                    <CommandItem
                      key={team.id}
                      onSelect={() => go(`/teams/${activeSport}/${team.id}`)}
                      className="flex items-center gap-3"
                    >
                      {team.logo && (
                        <Image src={team.logo} alt={team.name} width={20} height={20} className="object-contain" unoptimized />
                      )}
                      <span className="flex-1">{team.displayName}</span>
                      {isFav && <span className="text-xs text-primary">Following</span>}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </>
          )}

          {/* Standings shortcut */}
          {query.toLowerCase().includes('stand') && (
            <CommandGroup heading="Standings">
              {sportKeys.map((key) => (
                <CommandItem key={key} onSelect={() => go(`/standings?sport=${key}`)}>
                  {SPORT_CONFIGS[key].emoji} {SPORT_CONFIGS[key].name} Standings
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
