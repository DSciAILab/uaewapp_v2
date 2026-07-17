'use client'

import * as React from 'react'
import { Sidebar } from './sidebar'
import { CommandPalette } from './command-palette'

const PALETTE_EVENT = 'uaew:open-command-palette'

interface DashboardShellProps {
  children: React.ReactNode
}

/**
 * Wraps dashboard pages in the sidebar + main shell.
 * The command palette state is owned here so the sidebar
 * (⌘K listener) and the page header (search trigger via
 * the `uaew:open-command-palette` window event) can both
 * open it.
 */
export function DashboardShell({ children }: DashboardShellProps) {
  const [paletteOpen, setPaletteOpen] = React.useState(false)

  // Listen for external open requests (e.g. Header search button)
  React.useEffect(() => {
    const onOpen = () => setPaletteOpen(true)
    window.addEventListener(PALETTE_EVENT, onOpen)
    return () => window.removeEventListener(PALETTE_EVENT, onOpen)
  }, [])

  // ⌘K / Ctrl+K listener (sidebar is part of the same shell)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-background">{children}</main>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}

/** Helper for any descendant to request the command palette to open. */
export function openCommandPalette() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PALETTE_EVENT))
  }
}
