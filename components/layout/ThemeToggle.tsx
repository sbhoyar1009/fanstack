'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className={cn('w-8 h-8', className)} />

  const isDark = theme === 'dark'
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      className={cn(
        'relative flex items-center justify-center w-8 h-8 rounded-lg',
        'text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200',
        className
      )}
    >
      <Sun  className="w-4 h-4 absolute transition-all duration-300 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
      <Moon className="w-4 h-4 absolute transition-all duration-300 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
    </button>
  )
}
