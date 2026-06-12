import Link from 'next/link'
import { Settings, Bell, User } from 'lucide-react'

const tabs = [
  { href: '/settings/sports', label: 'Sports & Teams', icon: User },
  { href: '/settings/digest', label: 'Digest & Alerts', icon: Bell },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
          <p className="text-xs text-muted-foreground">Manage your sports preferences and notifications</p>
        </div>
      </div>

      <div className="flex gap-1 mb-8 border-b border-border/60">
        {tabs.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors border-b-2 border-transparent hover:border-border"
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  )
}
