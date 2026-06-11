import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Sidebar, MobileNav } from '@/components/layout/Sidebar'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { UserPrefsProvider } from '@/components/layout/UserPrefsProvider'
import { CommandSearch } from '@/components/layout/CommandSearch'
import { Trophy } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <UserPrefsProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar session={session} />

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Mobile top bar */}
          <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/15">
                <Trophy className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[15px] font-bold tracking-tight">FanStack</span>
            </div>
            <ThemeToggle />
          </header>

          {/* Desktop top bar */}
          <header className="hidden md:flex items-center justify-between px-6 h-14 border-b border-border/40 bg-background/60 backdrop-blur-sm sticky top-0 z-40">
            <div />
            <CommandSearch />
          </header>

          <main className="flex-1 pb-20 md:pb-0">
            {children}
          </main>
        </div>

        <MobileNav />
      </div>
    </UserPrefsProvider>
  )
}
