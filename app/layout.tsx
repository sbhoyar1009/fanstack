import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import './globals.css'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FanStack — Your sports, one place',
  description: 'Live scores, news, schedules, and AI summaries for every sport you follow.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
