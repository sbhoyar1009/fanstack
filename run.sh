#!/usr/bin/env bash
set -euo pipefail

# ─── FanStack dev runner ──────────────────────────────────────────────────────
# Usage: ./run.sh [--prod]
#
# Without flags: installs deps (if needed) and starts the Next.js dev server.
# With --prod:   runs a production build then starts the production server.
# ─────────────────────────────────────────────────────────────────────────────

PROD=false
for arg in "$@"; do
  [[ "$arg" == "--prod" ]] && PROD=true
done

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; RESET='\033[0m'
info()  { echo -e "${GREEN}▶${RESET} $*"; }
warn()  { echo -e "${YELLOW}⚠${RESET}  $*"; }
error() { echo -e "${RED}✗${RESET}  $*" >&2; }

# ── Required env vars ─────────────────────────────────────────────────────────
REQUIRED_VARS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  NEXTAUTH_SECRET
  NEXTAUTH_URL
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  UPSTASH_REDIS_REST_URL
  UPSTASH_REDIS_REST_TOKEN
)

ENV_FILE=".env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  warn "$ENV_FILE not found. Creating a template — fill it in and re-run."
  {
    echo "# FanStack environment — fill in all values before running"
    echo ""
    echo "# Supabase (https://app.supabase.com → project → Settings → API)"
    echo "NEXT_PUBLIC_SUPABASE_URL="
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY="
    echo "SUPABASE_SERVICE_ROLE_KEY="
    echo ""
    echo "# NextAuth (NEXTAUTH_URL = http://localhost:3000 for local dev)"
    echo "NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || echo 'REPLACE_ME')"
    echo "NEXTAUTH_URL=http://localhost:3000"
    echo ""
    echo "# Google OAuth (https://console.cloud.google.com → APIs → Credentials)"
    echo "GOOGLE_CLIENT_ID="
    echo "GOOGLE_CLIENT_SECRET="
    echo ""
    echo "# Upstash Redis (https://console.upstash.com)"
    echo "UPSTASH_REDIS_REST_URL="
    echo "UPSTASH_REDIS_REST_TOKEN="
    echo ""
    echo "# Anthropic (https://console.anthropic.com)"
    echo "ANTHROPIC_API_KEY="
  } > "$ENV_FILE"
  echo ""
  error "Edit $ENV_FILE and run ./run.sh again."
  exit 1
fi

# Load env file for the check below (not for the server — Next.js loads it itself)
set -o allexport
source "$ENV_FILE"
set +o allexport

MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  [[ -z "${!var:-}" ]] && MISSING+=("$var")
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  error "Missing required env vars in $ENV_FILE:"
  for v in "${MISSING[@]}"; do echo "    $v"; done
  echo ""
  warn "Fill them in and re-run."
  exit 1
fi

info "All required env vars present."

# ── Dependencies ──────────────────────────────────────────────────────────────
if [[ ! -d node_modules ]]; then
  info "Installing dependencies..."
  npm install
else
  info "node_modules present — skipping install. Run 'npm install' manually if deps changed."
fi

# ── Schema reminder ───────────────────────────────────────────────────────────
echo ""
warn "Reminder: if this is a fresh Supabase project, run schema.sql in the SQL editor first."
warn "  → https://app.supabase.com → SQL Editor → paste schema.sql → Run"
echo ""

# ── Start server ──────────────────────────────────────────────────────────────
if $PROD; then
  info "Building for production..."
  npm run build
  info "Starting production server on http://localhost:3000"
  npm run start
else
  info "Starting dev server on http://localhost:3000"
  npm run dev
fi
