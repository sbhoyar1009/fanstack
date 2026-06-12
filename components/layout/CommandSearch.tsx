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
import {
  Activity, Calendar, Home, Newspaper, Trophy,
  Sparkles, ShieldAlert, ArrowLeftRight, BarChart3, Settings, ArrowLeftRight as Compare,
} from 'lucide-react'

const NAV = [
  { label: 'Home',          href: '/',             icon: Home       },
  { label: 'Scores',        href: '/scores',       icon: Activity   },
  { label: 'News',          href: '/news',         icon: Newspaper  },
  { label: 'Schedule',      href: '/schedule',     icon: Calendar   },
  { label: 'Standings',     href: '/standings',    icon: Trophy     },
  { label: 'Daily Digest',  href: '/digest',       icon: Sparkles   },
  { label: 'Injuries',      href: '/injuries',     icon: ShieldAlert},
  { label: 'Transfers',     href: '/transfers',    icon: ArrowLeftRight },
  { label: 'Stats',         href: '/stats',        icon: BarChart3  },
  { label: 'Compare',       href: '/compare',      icon: Compare    },
  { label: 'Settings',      href: '/settings/sports', icon: Settings },
]

type PlayerResult = {
  id: string
  name: string
  position: string
  team: string
  headshot?: string
  sport: SportKey
  league: string
}

export function CommandSearch() {
  const [open, setOpen]                     = useState(false)
  const [query, setQuery]                   = useState('')
  const [teamResults, setTeamResults]       = useState<ESPNTeam[]>([])
  const [playerResults, setPlayerResults]   = useState<PlayerResult[]>([])
  const [searching, setSearching]           = useState(false)
  const [activeSport, setActiveSport]       = useState<SportKey>('nba')
  const { teams: followedTeams, sportKeys, followsTeam } = useUserPrefs()
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

  // Debounced search — teams + players in parallel
  useEffect(() => {
    if (!query.trim()) { setTeamResults([]); setPlayerResults([]); return }
    const timeout = setTimeout(async () => {
      setSearching(true)
      const sport = sportKeys[0] ?? activeSport
      const [teamRes, playerRes] = await Promise.allSettled([
        fetch(`/api/sports/teams?sport=${sport}`)
          .then(r => r.json())
          .then(d => (d.teams ?? []).filter((t: ESPNTeam) =>
            t.name.toLowerCase().includes(query.toLowerCase()) ||
            t.displayName.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 4)),
        fetch(`/api/players/search?q=${encodeURIComponent(query)}&sport=${sport}`)
          .then(r => r.json())
          .then(d => (d.results ?? []).slice(0, 5)),
      ])
      setTeamResults(teamRes.status === 'fulfilled' ? teamRes.value : [])
      setPlayerResults(playerRes.status === 'fulfilled' ? playerRes.value : [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [query, sportKeys, activeSport])

  const go = useCallback((href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }, [router])

  const filteredNav = query
    ? NAV.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
    : NAV

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted transition-colors text-sm text-muted-foreground w-56"
      >
        <span className="flex-1 text-left">Search teams, players...</span>
        <kbd className="text-[10px] font-mono bg-background border border-border/60 px-1.5 py-0.5 rounded text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Teams, players, pages…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {searching ? 'Searching…' : 'No results found.'}
          </CommandEmpty>

          {/* Navigation */}
          {filteredNav.length > 0 && (
            <CommandGroup heading="Navigate">
              {filteredNav.slice(0, query ? undefined : 5).map(({ label, href, icon: Icon }) => (
                <CommandItem key={href} onSelect={() => go(href)} className="gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* My teams (no query) */}
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

          {/* League shortcuts (no query) */}
          {!query && sportKeys.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Leagues">
                {sportKeys.map(key => (
                  <CommandItem key={key} onSelect={() => go(`/league/${key}`)} className="gap-3">
                    <span className="w-5 text-center">{SPORT_CONFIGS[key].emoji}</span>
                    {SPORT_CONFIGS[key].name} Overview
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Team search results */}
          {teamResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={`Teams · ${SPORT_CONFIGS[sportKeys[0] ?? activeSport]?.name}`}>
                {teamResults.map((team) => {
                  const isFav = followsTeam(team.id)
                  const sport = sportKeys[0] ?? activeSport
                  return (
                    <CommandItem
                      key={team.id}
                      onSelect={() => go(`/teams/${sport}/${team.id}`)}
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

          {/* Player search results */}
          {playerResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Players">
                {playerResults.map((p) => (
                  <CommandItem
                    key={`${p.sport}-${p.id}`}
                    onSelect={() => go(`/players/${p.sport}/${p.id}`)}
                    className="flex items-center gap-3"
                  >
                    {p.headshot ? (
                      <div className="relative w-5 h-5 rounded-full overflow-hidden bg-muted shrink-0">
                        <Image src={p.headshot} alt={p.name} fill className="object-cover" unoptimized />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-muted shrink-0" />
                    )}
                    <span className="flex-1">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.position} · {p.league}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Sport filter for search */}
          {query && sportKeys.length > 1 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Filter by sport">
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
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
