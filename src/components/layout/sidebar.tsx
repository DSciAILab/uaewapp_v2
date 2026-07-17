'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Plane,
  FileText,
  Building2,
  Car,
  Settings,
  Menu,
  Music,
  Activity,
  BarChart3,
  ShieldCheck,
  Layers,
  ClipboardList,
  Stethoscope,
  X,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Luggage,
  Command,
  LogOut,
  Swords,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { StatusDot } from '@/components/ui/status-dot'
import { useUser } from '@/hooks/use-user'
import { usePermissions } from '@/hooks/use-permissions'
import { createClient } from '@/lib/supabase/client'
import { FightCardDialog } from '@/components/fight-card/fight-card-dialog'

const icons = {
  LayoutDashboard,
  Calendar,
  Users,
  Plane,
  FileText,
  Building2,
  Car,
  Settings,
  Music,
  Activity,
  BarChart3,
  ShieldCheck,
  Layers,
  ClipboardList,
  Stethoscope,
  Luggage,
}

interface NavLeaf {
  label: string
  href: string
  icon: string
  area?: string
}

interface NavGroup {
  label: string
  icon: string
  children: NavLeaf[]
}

type NavEntry = NavLeaf | NavGroup

const isGroup = (entry: NavEntry): entry is NavGroup => 'children' in entry

const navItems: NavEntry[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Events', href: '/events', icon: 'Calendar', area: 'events' },
  { label: 'People', href: '/people', icon: 'Users', area: 'people' },
  {
    label: 'Logistics',
    icon: 'Luggage',
    children: [
      { label: 'Flights', href: '/flights', icon: 'Plane', area: 'flights' },
      { label: 'Visas', href: '/visas', icon: 'FileText', area: 'visas' },
      { label: 'Hotel', href: '/hotels', icon: 'Building2', area: 'hotels' },
      { label: 'Transport', href: '/transport', icon: 'Car', area: 'transport' },
    ],
  },
  { label: 'Fighter Stats', href: '/stats', icon: 'BarChart3', area: 'operations' },
  { label: 'Walk-out Songs', href: '/music', icon: 'Music', area: 'operations' },
  { label: 'Tasks', href: '/tasks', icon: 'Activity', area: 'operations' },
  { label: 'Pre-Event', href: '/pre-event', icon: 'ShieldCheck', area: 'pre_event' },
  { label: 'Pre-Departure Check', href: '/staging', icon: 'ClipboardList', area: 'pre_event' },
  { label: 'Medical', href: '/medical', icon: 'Stethoscope', area: 'pre_event' },
  { label: 'Batches', href: '/batches', icon: 'Layers', area: 'operations' },
  { label: 'War Room', href: '/war-room', icon: 'Activity', area: 'operations' },
  { label: 'Settings', href: '/settings', icon: 'Settings', area: 'admin' },
]

interface SidebarProps {
  onCommandPalette?: () => void
}

export function Sidebar({ onCommandPalette }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useUser()
  const { canView, isAdmin, loading: permissionsLoading } = usePermissions()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<string[]>([])
  const [fightCardOpen, setFightCardOpen] = useState(false)

  const eventIdMatch = pathname.match(/\/events\/([^\/]+)/)
  const eventId = eventIdMatch ? eventIdMatch[1] : null

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Land on /hotels (or /events/x/hotels) and its group must already be open —
  // otherwise a deep link shows a menu with no visible trace of where you are.
  useEffect(() => {
    const active = navItems
      .filter(isGroup)
      .filter((g) => g.children.some((c) => pathname.includes(c.href)))
      .map((g) => g.label)
    if (active.length) setOpenGroups((prev) => Array.from(new Set([...prev, ...active])))
  }, [pathname])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.refresh()
      router.replace('/login')
    } catch (error) {
      console.error('Logout error:', error)
      window.location.href = '/login'
    }
  }

  const scopeHref = (item: NavLeaf): NavLeaf => {
    const eventScopedAreas = ['hotels', 'transport', 'operations', 'pre_event']
    if (eventId && eventScopedAreas.includes(item.area || '')) {
      const subPath = item.href.startsWith('/') ? item.href : `/${item.href}`
      return { ...item, href: `/events/${eventId}${subPath}` }
    }
    return item
  }

  const canSee = (item: NavLeaf) => {
    if (!item.area) return true
    if (permissionsLoading) return user?.user_type === 'admin'
    if (isAdmin) return true
    return canView(item.area)
  }

  // A group is only as visible as its children: hide the ones this user can't
  // see, and drop the group itself once nothing is left inside it.
  const filteredItems: NavEntry[] = navItems
    .map((entry) =>
      isGroup(entry)
        ? { ...entry, children: entry.children.map(scopeHref).filter(canSee) }
        : scopeHref(entry)
    )
    .filter((entry) => (isGroup(entry) ? entry.children.length > 0 : canSee(entry)))

  const isLeafActive = (item: NavLeaf) =>
    pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

  const navContent = (variant: 'desktop' | 'mobile') => {
    const isMobile = variant === 'mobile'
    const showLabels = isMobile || !collapsed

    const renderLeaf = (item: NavLeaf, nested = false) => {
      const Icon = icons[item.icon as keyof typeof icons]
      const isActive = isLeafActive(item)

      return (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'group flex items-center gap-3 px-2.5 py-1.5 rounded-md transition-colors text-sm',
            isActive
              ? 'bg-primary/15 text-primary border-l-2 border-primary'
              : 'text-muted-foreground hover:bg-surface-2/60 hover:text-foreground',
            nested && 'text-xs'
          )}
          title={collapsed ? item.label : undefined}
        >
          <Icon className={cn('shrink-0', nested ? 'h-3.5 w-3.5' : 'h-4 w-4')} strokeWidth={2} />
          {showLabels && <span className="truncate">{item.label}</span>}
        </Link>
      )
    }

    const renderGroup = (group: NavGroup) => {
      const Icon = icons[group.icon as keyof typeof icons]
      const isOpen = openGroups.includes(group.label)
      const hasActiveChild = group.children.some(isLeafActive)

      return (
        <div key={group.label}>
          <button
            type="button"
            onClick={() => {
              // The collapsed rail is 56px wide — no room for children. Open the
              // sidebar first, then reveal the group, instead of doing nothing.
              if (!isMobile && collapsed) {
                setCollapsed(false)
                setOpenGroups((prev) => Array.from(new Set([...prev, group.label])))
                return
              }
              setOpenGroups((prev) =>
                prev.includes(group.label)
                  ? prev.filter((l) => l !== group.label)
                  : [...prev, group.label]
              )
            }}
            className={cn(
              'w-full flex items-center gap-3 px-2.5 py-1.5 rounded-md transition-colors text-sm',
              hasActiveChild && !isOpen
                ? 'text-primary'
                : 'text-muted-foreground hover:bg-surface-2/60 hover:text-foreground'
            )}
            title={collapsed ? group.label : undefined}
            aria-expanded={isOpen}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            {showLabels && (
              <>
                <span className="truncate flex-1 text-left">{group.label}</span>
                <ChevronDown
                  className={cn('h-3.5 w-3.5 shrink-0 transition-transform', isOpen && 'rotate-180')}
                />
              </>
            )}
          </button>

          {showLabels && isOpen && (
            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/60 pl-2">
              {group.children.map((child) => renderLeaf(child, true))}
            </div>
          )}
        </div>
      )
    }

    return (
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {permissionsLoading && filteredItems.length <= 1 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-50">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            {showLabels && <span className="label-mono">Loading</span>}
          </div>
        ) : (
          filteredItems.map((entry) => (isGroup(entry) ? renderGroup(entry) : renderLeaf(entry)))
        )}
      </nav>
    )
  }

  const userBlock = (variant: 'desktop' | 'mobile') => {
    const isMobile = variant === 'mobile'
    return (
      <div className="p-3 border-t border-border/60">
        <div
          className={cn(
            'flex items-center gap-2.5',
            !isMobile && collapsed && 'justify-center'
          )}
        >
          {(isMobile || !collapsed) && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <StatusDot status="confirmed" size="sm" />
                <p className="text-xs font-medium truncate">{user?.name}</p>
              </div>
              <p className="label-mono mt-0.5">{user?.user_type}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-7 w-7 text-muted-foreground hover:text-status-critical"
            aria-label="Log out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  const brand = (variant: 'desktop' | 'mobile') => {
    const isMobile = variant === 'mobile'
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 h-12 border-b border-border/60 bg-surface-1/40',
          !isMobile && collapsed && 'justify-center px-0'
        )}
      >
        <div className="flex items-center justify-center h-6 w-6 rounded bg-primary/15 border border-primary/30 shrink-0">
          <span className="font-display font-bold text-[10px] text-primary">UW</span>
        </div>
        {(isMobile || !collapsed) && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-semibold text-xs tracking-tight">UAEW</span>
              <span className="label-mono">/ ops</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <StatusDot status="confirmed" size="sm" />
              <span className="label-mono">Online</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  const fightCardTrigger = (variant: 'desktop' | 'mobile') => {
    const isMobile = variant === 'mobile'
    const showLabels = isMobile || !collapsed
    return (
      <button
        onClick={() => setFightCardOpen(true)}
        className={cn(
          'flex items-center gap-2 px-2.5 h-8 mx-2 mb-2 rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors',
          !isMobile && collapsed && 'justify-center px-0 mx-1'
        )}
        title="Fight Card"
        aria-label="Open fight card"
      >
        <Swords className="h-3.5 w-3.5 shrink-0" />
        {showLabels && <span className="text-xs flex-1 text-left">Fight Card</span>}
      </button>
    )
  }

  const commandTrigger = (variant: 'desktop' | 'mobile') => {
    if (variant === 'mobile' || !onCommandPalette) return null
    return (
      <button
        onClick={onCommandPalette}
        className={cn(
          'flex items-center gap-2 px-2.5 h-8 mx-2 my-2 rounded-md border border-border/60 bg-surface-1/40 text-muted-foreground hover:text-foreground hover:bg-surface-2/60 transition-colors',
          collapsed && 'justify-center px-0 mx-1'
        )}
        aria-label="Open command palette"
      >
        <Command className="h-3.5 w-3.5 shrink-0" />
        {!collapsed && (
          <>
            <span className="text-xs flex-1 text-left">Commands</span>
            <kbd className="label-mono">⌘K</kbd>
          </>
        )}
      </button>
    )
  }

  return (
    <>
      <FightCardDialog open={fightCardOpen} onOpenChange={setFightCardOpen} />

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-2 bg-surface-1/60 border-b border-border/60 px-3 h-12">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="h-8 w-8"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1.5">
          <StatusDot status="confirmed" size="sm" />
          <span className="font-display font-semibold text-xs tracking-tight">UAEW</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label="Log out"
          className="h-8 w-8"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72 sm:w-72 flex flex-col bg-surface-1">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SheetDescription className="sr-only">
            Main navigation links and account info
          </SheetDescription>
          {brand('mobile')}
          <div className="pt-2">{fightCardTrigger('mobile')}</div>
          {navContent('mobile')}
          {userBlock('mobile')}
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen bg-surface-1/30 border-r border-border/60 transition-all duration-200',
          collapsed ? 'w-14' : 'w-60'
        )}
      >
        {brand('desktop')}
        {commandTrigger('desktop')}
        <div className="flex items-center justify-end px-2 -mt-1.5 mb-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-6 w-6 text-muted-foreground"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronsRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronsLeft className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        {fightCardTrigger('desktop')}
        {navContent('desktop')}
        {userBlock('desktop')}
      </aside>
    </>
  )
}
