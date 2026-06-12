'use client'

import { useState } from 'react'
import { Share2, Check, Copy, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

type ShareCardProps = {
  title: string
  text: string
  url?: string
  className?: string
}

export function ShareCard({ title, text, url, className }: ShareCardProps) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '')
  const tweetText = `${title}\n\n${text}\n\n${shareUrl}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${text}\n\n${shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback silently
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl })
      } catch {
        // user cancelled
      }
    }
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border transition-all"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-xl border border-border/60 bg-card shadow-lg overflow-hidden">
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={() => { handleNativeShare(); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold hover:bg-muted/40 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                Share…
              </button>
            )}
            <button
              onClick={() => { handleCopy(); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold hover:bg-muted/40 transition-colors border-t border-border/30"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              {copied ? 'Copied!' : 'Copy text'}
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold hover:bg-muted/40 transition-colors border-t border-border/30"
            >
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              Post on X
            </a>
          </div>
        </>
      )}
    </div>
  )
}
