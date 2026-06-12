'use client'

import useSWRMutation from 'swr/mutation'
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

type PreGameCardProps = {
  homeTeam: string
  awayTeam: string
  league: string
  kickoffTime: string
  homeForm: string[]
  awayForm: string[]
  stakes?: string
  gameId: string
  sport: string
}

async function fetchPreview(
  url: string,
  { arg }: { arg: PreGameCardProps },
) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  })
  if (!res.ok) throw new Error('Failed')
  return res.json() as Promise<{ preview: string }>
}

export function PreGameCard(props: PreGameCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { trigger, data, isMutating, error } = useSWRMutation('/api/ai/pregame', fetchPreview)

  async function handleExpand() {
    if (!expanded && !data) await trigger(props)
    setExpanded(e => !e)
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
      <button
        onClick={handleExpand}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs font-semibold text-primary">AI Match Preview</span>
        </div>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        }
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {isMutating ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-4/5 rounded" />
            </div>
          ) : error ? (
            <p className="text-xs text-muted-foreground">Preview unavailable.</p>
          ) : (
            <p className="text-sm leading-relaxed text-foreground/90">{data?.preview}</p>
          )}
        </div>
      )}
    </div>
  )
}
