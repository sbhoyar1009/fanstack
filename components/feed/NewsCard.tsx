import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import type { NewsItem } from '@/types/sports'
import { SPORT_CONFIGS } from '@/lib/espn'

interface NewsCardProps {
  item: NewsItem
}

// Map known sources to a short display label + optional colour
const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  'ESPN':           { label: 'ESPN',       color: 'bg-red-500/10 text-red-600' },
  'BBC Sport':      { label: 'BBC',        color: 'bg-orange-500/10 text-orange-600' },
  'Sky Sports':     { label: 'Sky',        color: 'bg-blue-500/10 text-blue-600' },
  'The Guardian':   { label: 'Guardian',   color: 'bg-blue-700/10 text-blue-700' },
  'Reuters':        { label: 'Reuters',    color: 'bg-orange-600/10 text-orange-700' },
  'Associated Press': { label: 'AP',       color: 'bg-zinc-500/10 text-zinc-600' },
  'Bleacher Report':{ label: 'BR',         color: 'bg-green-500/10 text-green-600' },
  'The Athletic':   { label: 'Athletic',   color: 'bg-purple-500/10 text-purple-600' },
  'Yahoo Sports':   { label: 'Yahoo',      color: 'bg-violet-500/10 text-violet-600' },
  'CBS Sports':     { label: 'CBS',        color: 'bg-sky-500/10 text-sky-600' },
  'Fox Sports':     { label: 'Fox',        color: 'bg-blue-600/10 text-blue-700' },
  'NBCSports':      { label: 'NBC',        color: 'bg-indigo-500/10 text-indigo-600' },
  'Google News':    { label: 'News',       color: 'bg-zinc-400/10 text-zinc-500' },
}

function sourceChip(source: string) {
  for (const [key, val] of Object.entries(SOURCE_LABELS)) {
    if (source.toLowerCase().includes(key.toLowerCase())) {
      return val
    }
  }
  return { label: source.split(' ')[0], color: 'bg-zinc-400/10 text-zinc-500' }
}

export function NewsCard({ item }: NewsCardProps) {
  const config  = SPORT_CONFIGS[item.sport]
  const timeAgo = item.published
    ? formatDistanceToNow(new Date(item.published), { addSuffix: true })
    : ''
  const chip = sourceChip(item.source)

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-xl border bg-card hover:bg-muted/40 transition-colors group"
    >
      {item.imageUrl && (
        <div className="relative w-20 h-16 shrink-0 rounded-lg overflow-hidden">
          <Image
            src={item.imageUrl}
            alt={item.headline}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Meta row */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {config.emoji} {item.league}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${chip.color}`}>
            {chip.label}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>

        <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {item.headline}
        </h3>

        {item.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
        )}
      </div>
    </a>
  )
}
