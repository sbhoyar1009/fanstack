import { signIn } from '@/auth'
import { Trophy } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/40%)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/40%)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm space-y-8 z-10">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 shadow-lg shadow-primary/10">
            <Trophy className="w-7 h-7 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">FanStack</h1>
            <p className="text-sm text-muted-foreground mt-1">Your sports. One dashboard.</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 shadow-xl shadow-black/5 space-y-5">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Sign in to continue</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Live scores, AI game summaries, and news — filtered to your teams.
            </p>
          </div>

          <form
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: '/' })
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-border/80 bg-background hover:bg-muted/60 text-sm font-semibold transition-all duration-150 active:scale-[0.98] shadow-sm"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-widest">Features</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <ul className="space-y-1.5">
            {[
              ['🏀', 'Live scores for NBA, NFL, EPL, F1 + more'],
              ['✦',  'AI game summaries powered by Gemini'],
              ['📰', 'News from ESPN, BBC, Reuters & more'],
              ['📅', 'Weekly schedule with conflict alerts'],
            ].map(([icon, text]) => (
              <li key={text} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="shrink-0 mt-px">{icon}</span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/50">
          Sports data from ESPN · AI by Google Gemini
        </p>
      </div>
    </div>
  )
}
