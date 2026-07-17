'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Plane,
  FileText,
  Building2,
  Car,
  Music,
  BarChart3,
  ShieldCheck,
  Layers,
  Activity,
  Stethoscope,
  ClipboardList,
  ArrowRight,
} from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const COMMANDS = [
  { label: 'Go to Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Navigation' },
  { label: 'Go to Events', href: '/events', icon: Calendar, group: 'Navigation' },
  { label: 'Go to People', href: '/people', icon: Users, group: 'Navigation' },
  { label: 'Go to Flights', href: '/flights', icon: Plane, group: 'Navigation' },
  { label: 'Go to Visas', href: '/visas', icon: FileText, group: 'Navigation' },
  { label: 'Go to Hotels', href: '/hotels', icon: Building2, group: 'Navigation' },
  { label: 'Go to Transport', href: '/transport', icon: Car, group: 'Navigation' },
  { label: 'Go to Music', href: '/music', icon: Music, group: 'Navigation' },
  { label: 'Go to Tasks', href: '/tasks', icon: Activity, group: 'Navigation' },
  { label: 'Go to Pre-Event', href: '/pre-event', icon: ShieldCheck, group: 'Navigation' },
  { label: 'Go to Staging', href: '/staging', icon: ClipboardList, group: 'Navigation' },
  { label: 'Go to Medical', href: '/medical', icon: Stethoscope, group: 'Navigation' },
  { label: 'Go to Batches', href: '/batches', icon: Layers, group: 'Navigation' },
  { label: 'Go to Stats', href: '/stats', icon: BarChart3, group: 'Navigation' },
  { label: 'Go to War Room', href: '/war-room', icon: Activity, group: 'Navigation' },
]

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()

  const run = React.useCallback(
    (href: string) => {
      onOpenChange(false)
      router.push(href)
    },
    [onOpenChange, router]
  )

  // Group commands
  const grouped = React.useMemo(() => {
    const groups: Record<string, typeof COMMANDS> = {}
    for (const cmd of COMMANDS) {
      groups[cmd.group] = groups[cmd.group] || []
      groups[cmd.group].push(cmd)
    }
    return groups
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" className="font-mono" />
      <CommandList>
        <CommandEmpty>No commands found.</CommandEmpty>
        {Object.entries(grouped).map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((cmd) => {
              const Icon = cmd.icon
              return (
                <CommandItem
                  key={cmd.href}
                  value={cmd.label}
                  onSelect={() => run(cmd.href)}
                  className="flex items-center gap-2.5 cursor-pointer"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                  <span className="flex-1">{cmd.label}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </CommandItem>
              )
            })}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="border-t border-border/60 px-3 py-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <span>UAEW · ops</span>
        <span className="flex items-center gap-2">
          <CommandShortcut>↑↓</CommandShortcut>
          <span>navigate</span>
          <CommandShortcut>↵</CommandShortcut>
          <span>select</span>
          <CommandShortcut>esc</CommandShortcut>
          <span>close</span>
        </span>
      </div>
    </CommandDialog>
  )
}
