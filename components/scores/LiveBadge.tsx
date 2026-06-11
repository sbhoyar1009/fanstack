'use client'

export function LiveBadge({ statusText }: { statusText?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[11px] font-bold tracking-wide">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
      </span>
      {statusText ?? 'LIVE'}
    </span>
  )
}
