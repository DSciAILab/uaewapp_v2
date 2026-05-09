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
  LogOut,
  Menu,
  Music,
  Activity,
  BarChart3,
  ShieldCheck,
  Layers,
  ClipboardList,
  Stethoscope,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { useUser } from '@/hooks/use-user'
import { usePermissions } from '@/hooks/use-permissions'
import { createClient } from '@/lib/supabase/client'

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
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Eventos', href: '/events', icon: 'Calendar', area: 'events' },
  { label: 'People', href: '/people', icon: 'Users', area: 'people' },
  { label: 'Aéreo', href: '/flights', icon: 'Plane', area: 'flights' },
  { label: 'Vistos', href: '/visas', icon: 'FileText', area: 'visas' },
  { label: 'Hotel', href: '/hotels', icon: 'Building2', area: 'hotels' },
  { label: 'Transporte', href: '/transport', icon: 'Car', area: 'transport' },
  { label: 'Fighter Stats', href: '/stats', icon: 'BarChart3', area: 'operations' },
  { label: 'Entrance Music', href: '/music', icon: 'Music', area: 'operations' },
  { label: 'Tasks', href: '/tasks', icon: 'Activity', area: 'operations' },
  { label: 'Pre-Event', href: '/pre-event', icon: 'ShieldCheck', area: 'pre_event' },
  { label: 'Pre-Departure Check', href: '/staging', icon: 'ClipboardList', area: 'pre_event' },
  { label: 'Medical', href: '/medical', icon: 'Stethoscope', area: 'pre_event' },
  { label: 'Batches', href: '/batches', icon: 'Layers', area: 'operations' },
  { label: 'War Room', href: '/war-room', icon: 'Activity', area: 'operations' },
  { label: 'Configurações', href: '/settings', icon: 'Settings', area: 'admin' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { canView, isAdmin, loading: permissionsLoading } = usePermissions()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const eventIdMatch = pathname.match(/\/events\/([^\/]+)/)
  const eventId = eventIdMatch ? eventIdMatch[1] : null

  // Auto-close the mobile drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false)
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

  const filteredItems = navItems
    .map((item) => {
      const eventScopedAreas = ['hotels', 'transport', 'operations', 'pre_event']
      if (eventId && eventScopedAreas.includes(item.area || '')) {
        const subPath = item.href.startsWith('/') ? item.href : `/${item.href}`
        return { ...item, href: `/events/${eventId}${subPath}` }
      }
      return item
    })
    .filter((item) => {
      if (!item.area) return true
      if (permissionsLoading) return user?.user_type === 'admin'
      if (isAdmin) return true
      return canView(item.area)
    })

  const navContent = (variant: 'desktop' | 'mobile') => {
    const isMobile = variant === 'mobile'
    return (
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {permissionsLoading && filteredItems.length <= 1 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-50">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            {(isMobile || !collapsed) && (
              <span className="text-[10px] uppercase font-bold tracking-widest">
                Carregando...
              </span>
            )}
          </div>
        ) : (
          filteredItems.map((item) => {
            const Icon = icons[item.icon as keyof typeof icons]
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {(isMobile || !collapsed) && <span>{item.label}</span>}
              </Link>
            )
          })
        )}
      </nav>
    )
  }

  const userBlock = (variant: 'desktop' | 'mobile') => {
    const isMobile = variant === 'mobile'
    return (
      <div className="p-4 border-t">
        <div className={cn('flex items-center gap-3', !isMobile && collapsed && 'justify-center')}>
          {(isMobile || !collapsed) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.user_type}</p>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile top bar — only visible on small screens */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-2 bg-card border-b px-3 h-12">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-bold text-base text-primary">MMA System</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label="Log out"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72 sm:w-72 flex flex-col">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SheetDescription className="sr-only">
            Main navigation links and account info
          </SheetDescription>
          <div className="flex items-center justify-between p-4 border-b">
            <span className="font-bold text-lg text-primary">MMA System</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          {navContent('mobile')}
          {userBlock('mobile')}
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar — hidden on small screens */}
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen bg-card border-r transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          {!collapsed && (
            <span className="font-bold text-lg text-primary">MMA System</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        {navContent('desktop')}
        {userBlock('desktop')}
      </aside>
    </>
  )
}
