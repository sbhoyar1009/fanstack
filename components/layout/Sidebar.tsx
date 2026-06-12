'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Home, Activity, Newspaper, Calendar, Settings, LogOut, Trophy, BarChart2, Sparkles, ShieldAlert, ArrowLeftRight, BarChart3, ArrowLeftRight as Compare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ThemeToggle } from './ThemeToggle'
import { useUserPrefs } from './UserPrefsProvider'
import { SPORT_CONFIGS } from '@/lib/espn'
import Image from 'next/image'
import type { Session } from 'next-auth'

const navItems = [
  { href: '/',           label: 'Home',       icon: Home,          exact: true  },
  { href: '/catchup',    label: 'Catch Up',   icon: Sparkles,      exact: false },
  { href: '/scores',     label: 'Scores',     icon: Activity,      exact: false },
  { href: '/news',       label: 'News',       icon: Newspaper,     exact: false },
  { href: '/schedule',   label: 'Schedule',   icon: Calendar,      exact: false },
  { href: '/standings',  label: 'Standings',  icon: BarChart2,     exact: false },
  { href: '/digest',     label: 'Digest',     icon: Sparkles,      exact: false },
  { href: '/injuries',   label: 'Injuries',   icon: ShieldAlert,   exact: false },
  { href: '/transfers',  label: 'Transfers',  icon: ArrowLeftRight,exact: false },
  { href: '/stats',      label: 'Stats',      icon: BarChart3,     exact: false },
  { href: '/compare',    label: 'Compare',    icon: Compare,       exact: false },
]

export function Sidebar({ session }: { session: Session }) {
  const pathname = usePathname()
  const { teams: followedTeams, sportKeys } = useUserPrefs()

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-border/60 bg-sidebar overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border/40 shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/15">
          <Trophy className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="leading-none">
          <span className="text-[15px] font-bold tracking-tight">FanStack</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {/* Main nav */}
        <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Menu
        </p>
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        {/* My teams quick links */}
        {followedTeams.length > 0 && (
          <div className="pt-3">
            <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              My Teams
            </p>
            {followedTeams.slice(0, 8).map((t) => {
              const href      = `/teams/${t.sport_key}/${t.team_id}`
              const isActive  = pathname === href
              const config    = SPORT_CONFIGS[t.sport_key]
              return (
                <Link key={t.team_id} href={href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  {t.team_logo ? (
                    <Image src={t.team_logo} alt={t.team_name} width={16} height={16} className="object-contain shrink-0" unoptimized />
                  ) : (
                    <span className="text-[10px] shrink-0">{config?.emoji}</span>
                  )}
                  <span className="truncate">{t.team_name}</span>
                </Link>
              )
            })}
          </div>
        )}

        {/* Account */}
        <div className="pt-3">
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Account
          </p>
          <Link href="/settings/sports"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150"
          >
            <Settings className="w-4 h-4 shrink-0" />
            Settings
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-150"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </div>
      </nav>

      {/* Bottom: avatar + theme toggle */}
      <div className="px-3 py-3 border-t border-border/40 shrink-0">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarImage src={session.user?.image ?? undefined} />
              <AvatarFallback className="text-xs bg-primary/20 text-primary font-semibold">
                {session.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 leading-none">
              <p className="text-xs font-semibold truncate">{session.user?.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{session.user?.email}</p>
            </div>
          </div>
          <ThemeToggle className="shrink-0 ml-1" />
        </div>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const mobileItems = navItems.slice(0, 5)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="flex">
        {mobileItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2 text-[9px] font-semibold transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5 transition-transform duration-150', isActive && 'scale-110')} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
