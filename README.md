# 🏆 FanStack

**Your sports in one place.** Live scores, unified news, weekly schedule, and AI game summaries — for every sport you follow.

---

## Features

| Feature | Details |
|---|---|
| 📊 Live scores | NBA, NFL, Premier League, La Liga, F1, MLB, NHL — auto-refreshes every 30s |
| 📰 Unified news | One feed from all your sports, sorted by recency |
| 📅 Weekly schedule | Timeline view of your games for the next 7 days, with conflict warnings |
| ✨ AI Catch Me Up | Click any finished game for a 4-sentence Claude summary |
| 🎯 Personalized | Follow specific sports & teams, homepage shows what matters to you |

---

## Tech Stack

- **Frontend:** Next.js 15 (App Router) + Tailwind CSS v4 + shadcn/ui
- **Auth:** NextAuth.js v5 (Google OAuth)
- **Database:** Supabase (Postgres)
- **Cache:** Upstash Redis (30s TTL for live, 5min upcoming, 1h finished)
- **AI:** Anthropic API (`claude-sonnet-4-6`)
- **Sports data:** ESPN unofficial API (free, no key required)

---

## Setup

### 1. Clone and install

```bash
cd fanstack
npm install
```

### 2. Set up services

**Supabase** (free tier at [supabase.com](https://supabase.com)):
1. Create a new project
2. Go to SQL Editor → paste contents of `schema.sql` → Run
3. Go to Settings → API → copy URL and anon key

**Upstash Redis** (free tier at [upstash.com](https://console.upstash.com)):
1. Create a database (select REST API)
2. Copy the REST URL and token

**Google OAuth** ([console.cloud.google.com](https://console.cloud.google.com)):
1. Create a project → Enable Google+ API
2. OAuth consent screen → External
3. Credentials → OAuth client ID → Web application
4. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`

**Anthropic** ([console.anthropic.com](https://console.anthropic.com)):
1. Create an API key

### 3. Configure env vars

Fill in all values in `.env.local`. Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll hit Google login, then the onboarding flow.

---

## Project Structure

```
app/
├── (auth)/
│   ├── login/            # Google sign-in page
│   └── onboarding/       # Pick sports + teams (first-time setup)
├── (dashboard)/
│   ├── layout.tsx        # Sidebar + mobile bottom nav
│   ├── page.tsx          # Home feed (live + today + news)
│   ├── scores/           # Full scores grid, 30s SWR polling
│   ├── news/             # Unified news feed
│   └── schedule/         # Weekly timeline with conflict detection
└── api/
    ├── auth/[...nextauth] # NextAuth handlers
    ├── sports/scores      # ESPN proxy + Redis cache
    ├── sports/news        # ESPN news proxy
    ├── sports/standings   # ESPN standings proxy
    ├── sports/teams       # ESPN teams list
    ├── ai/catchmeup       # Claude AI game summary
    └── user/preferences   # Save/fetch user sports + teams

lib/
├── espn.ts               # ESPN API client, normalizes all sports
├── redis.ts              # Upstash Redis cache-aside helpers
├── db.ts                 # Supabase client + typed DB helpers
└── anthropic.ts          # Claude API client

types/
└── sports.ts             # NormalizedGame, NewsItem, Standing, SportKey...
```

---

## Cache TTLs

| Data | TTL | Reason |
|---|---|---|
| Live scores | 30s | Fast poll without hammering ESPN |
| Upcoming games | 5 min | Start times rarely change |
| Finished games | 1 hour | Score is final |
| News | 10 min | New articles don't publish that fast |
| Team lists | 24 hours | Rosters almost never change |
| Standings | 15 min | Updated after games end |

---

## Deploy to Vercel

```bash
npx vercel
```

Add all env vars under Project → Settings → Environment Variables.
Add your production URL to Google OAuth redirect URIs:
`https://your-app.vercel.app/api/auth/callback/google`

---

## Roadmap (v2)

- [ ] WebSocket real-time scores (replace 30s polling)
- [ ] Push notifications for your team's games
- [ ] Game detail pages (box scores, play-by-play)
- [ ] Dark/light theme toggle
- [ ] Mobile app (React Native)
