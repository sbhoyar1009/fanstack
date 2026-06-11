import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// NextAuth v5 auth() wraps the handler and injects req.auth
// We export it as `proxy` to satisfy Next.js 16's file convention
export const proxy = auth((req: NextRequest & { auth?: unknown }) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!(req as unknown as { auth: unknown }).auth

  // Public routes — always accessible
  const publicRoutes = ['/login']
  if (publicRoutes.includes(pathname)) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  }

  // Protected routes — redirect to login if not authenticated
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
