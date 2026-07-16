'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun, Search, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusDot } from '@/components/ui/status-dot'

interface HeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  children?: React.ReactNode
  onCommandPalette?: () => void
}

export function Header({
  title,
  description,
  actions,
  children,
  onCommandPalette,
}: HeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border/60 bg-surface-1/30">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <StatusDot status="confirmed" size="sm" />
          <h1 className="font-display text-lg font-semibold tracking-tight text-foreground truncate">
            {title}
          </h1>
        </div>
        {description && (
          <p className="label-mono mt-1 truncate">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {children}

        {onCommandPalette && (
          <button
            onClick={onCommandPalette}
            className="hidden sm:flex items-center gap-2 h-8 px-2.5 rounded-md border border-border/60 bg-surface-1/40 text-muted-foreground hover:text-foreground hover:bg-surface-2/60 transition-colors text-xs"
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="font-mono">Search</span>
            <kbd className="label-mono">⌘K</kbd>
          </button>
        )}

        {actions}

        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
        >
          <Bell className="h-4 w-4" />
          <StatusDot
            status="warning"
            size="sm"
            className="absolute -top-0.5 -right-0.5"
            label="New alerts"
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>
    </header>
  )
}
