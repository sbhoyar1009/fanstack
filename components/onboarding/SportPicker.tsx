'use client'

import { SPORT_CONFIGS } from '@/lib/espn'
import type { SportKey } from '@/types/sports'
import { cn } from '@/lib/utils'

interface SportPickerProps {
  selected: SportKey[]
  onChange: (sports: SportKey[]) => void
}

// Build the list grouped by category in the order we want them displayed
const CATEGORY_ORDER = ['Soccer', 'American Sports', 'Motorsport']

const grouped = CATEGORY_ORDER.map((cat) => ({
  category: cat,
  sports: Object.values(SPORT_CONFIGS).filter((s) => s.category === cat),
}))

export function SportPicker({ selected, onChange }: SportPickerProps) {
  const toggle = (key: SportKey) => {
    onChange(
      selected.includes(key)
        ? selected.filter((k) => k !== key)
        : [...selected, key],
    )
  }

  return (
    <div className="space-y-6">
      {grouped.map(({ category, sports }) => (
        <div key={category}>
          {/* Category header */}
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-0.5">
            {category}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {sports.map((sport) => {
              const isSelected = selected.includes(sport.key)
              return (
                <button
                  key={sport.key}
                  onClick={() => toggle(sport.key)}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                    'hover:scale-[1.03] active:scale-100 text-left',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-sm shadow-primary/10'
                      : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30',
                  )}
                >
                  {/* Check badge */}
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}

                  <span className="text-2xl leading-none">{sport.emoji}</span>
                  <span className={cn(
                    'text-xs font-semibold text-center leading-snug',
                    isSelected ? 'text-primary' : 'text-foreground',
                  )}>
                    {sport.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
