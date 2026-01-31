'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useUser } from '@/hooks/use-user'
import { usePermissions } from '@/hooks/use-permissions'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

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
  
  const eventIdMatch = pathname.match(/\/events\/([^\/]+)/)
  const eventId = eventIdMatch ? eventIdMatch[1] : null

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.refresh()
      router.replace('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Fallback to hard navigation
      window.location.href = '/login'
    }
  }

  const filteredItems = navItems.map(item => {
    // Se estivermos dentro de um evento e o item for contextualizado,
    // atualizamos o link para ser contextual ao evento.
    const eventScopedAreas = ['hotels', 'transport', 'operations', 'pre_event']
    if (eventId && eventScopedAreas.includes(item.area || '')) {
      const subPath = item.href.startsWith('/') ? item.href : `/${item.href}`
      return {
        ...item,
        href: `/events/${eventId}${subPath}`
      }
    }
    return item
  }).filter(item => {
    // Sempre mostrar dashboard
    if (!item.area) return true
    
    // If permissions are still loading, showing everything is misleading for non-admins
    if (permissionsLoading) {
       // Admins see everything, others wait for permissions
       return user?.user_type === 'admin'
    }

    if (isAdmin) return true
    return canView(item.area)
  })

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-card border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <span className="font-bold text-lg text-primary">MMA System</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {permissionsLoading && filteredItems.length <= 1 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-50">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            {!collapsed && <span className="text-[10px] uppercase font-bold tracking-widest">Carregando...</span>}
          </div>
        ) : (
          filteredItems.map(item => {
            const Icon = icons[item.icon as keyof typeof icons]
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })
        )}
      </nav>

      {/* User */}
      <div className="p-4 border-t">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.user_type}
              </p>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
