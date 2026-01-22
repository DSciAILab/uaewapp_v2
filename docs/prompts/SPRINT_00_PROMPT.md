# SPRINT 00 - Setup Inicial do Projeto

## Contexto

Este é um sistema de gestão de logística e operações para eventos de MMA. O banco de dados já está configurado no Supabase com 27 tabelas (prefixo `mma_`). Este sprint configura a base do projeto Next.js.

## Stack

- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase (Auth, Database, Realtime)
- @supabase/ssr

## Objetivo do Sprint

Configurar o projeto base com autenticação, layout e estrutura de pastas.

---

## TAREFA 1: Verificar/Instalar Dependências

Se ainda não instaladas, execute:

```bash
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add class-variance-authority clsx tailwind-merge lucide-react
pnpm add react-hook-form @hookform/resolvers zod
pnpm add date-fns
```

---

## TAREFA 2: Criar arquivo .env.example

Criar `.env.example` na raiz:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google OAuth (configurar no Supabase Dashboard)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## TAREFA 3: Criar Supabase Client (Browser)

Criar `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

## TAREFA 4: Criar Supabase Client (Server)

Criar `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore em Server Components
          }
        },
      },
    }
  )
}
```

---

## TAREFA 5: Criar Middleware

Criar `src/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rotas públicas
  const publicRoutes = ['/login', '/callback', '/']
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith('/tv')
  )

  // Redirecionar para login se não autenticado
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirecionar para dashboard se já autenticado e tentando acessar login
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## TAREFA 6: Criar Types do Database

Criar `src/types/database.ts`:

```typescript
export type UserType = 'admin' | 'staff' | 'temporary'
export type PermissionLevel = 'view' | 'edit'
export type FlightType = 'arrival_only' | 'departure_only' | 'full'
export type TransportNeed = 'none' | 'arrival' | 'departure' | 'both'
export type EnrollmentStatus = 'active' | 'cancelled' | 'replaced'
export type TaskStatus = 'not_required' | 'required' | 'done'
export type TaskType = 'blood_test' | 'photoshoot' | 'video_shoot'
export type BatchStatus = 'scheduled' | 'boarding' | 'departed' | 'arrived'
export type EventStatus = 'planning' | 'active' | 'completed' | 'cancelled'
export type VisaStatus = 1 | 2 | 3 | 4 | 5 | 6 // 1=Not Required, 2=Required, 3=Applied, 4=Approved, 5=Rejected, 6=Resident

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  user_type: UserType
  is_active: boolean
  expires_at?: string
  last_login_at?: string
  created_at: string
  updated_at: string
}

export interface Person {
  id: string
  name: string
  surname: string
  compiled_name: string
  event_name?: string
  fighter_id?: number
  gender?: string
  phone?: string
  dob?: string
  nationality?: string
  passport_number?: string
  passport_expiry?: string
  passport_photo?: string
  document_folder?: string
  height?: number
  reach?: number
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  name: string
  code?: string
  event_date: string
  event_end_date?: string
  city?: string
  country?: string
  venue?: string
  main_airport?: string
  checkin_margin_hours: number
  checkout_margin_hours: number
  status: EventStatus
  notes?: string
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  name: string
  code: string
  parent_id?: string
  is_base: boolean
  is_active: boolean
}

export interface Enrollment {
  id: string
  event_id: string
  person_id: string
  role_id: string
  event_code: string
  event_code_seq: number
  needs_flight: FlightType | 'none'
  needs_visa: boolean
  needs_hotel: boolean
  needs_transport: TransportNeed
  status: EnrollmentStatus
  cancelled_at?: string
  cancelled_by?: string
  cancellation_reason?: string
  created_at: string
  updated_at: string
  // Joins
  person?: Person
  role?: Role
  event?: Event
}

export interface Flight {
  id: string
  enrollment_id: string
  type: FlightType
  arrival_reservation?: string
  arrival_flight_number?: string
  arrival_date?: string
  arrival_time?: string
  arrival_airport?: string
  arrival_ticket_link?: string
  departure_reservation?: string
  departure_flight_number?: string
  departure_date?: string
  departure_time?: string
  departure_airport?: string
  departure_ticket_link?: string
  status: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Visa {
  id: string
  enrollment_id: string
  passport_name?: string
  nationality?: string
  departure_airport?: string
  document_link?: string
  status: VisaStatus
  is_done: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface Hotel {
  id: string
  enrollment_id: string
  suggested_checkin_date?: string
  suggested_checkin_time?: string
  suggested_checkout_date?: string
  suggested_checkout_time?: string
  reservation_number?: string
  checkin_date?: string
  checkin_time?: string
  checkout_date?: string
  checkout_time?: string
  has_divergence: boolean
  divergence_type?: string[]
  divergence_approved?: boolean
  divergence_approved_by?: string
  divergence_approved_at?: string
  status: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface TransportDriver {
  id: string
  name: string
  phone: string
  notes?: string
  is_active: boolean
  created_at: string
}

export interface TransportCar {
  id: string
  event_id: string
  car_number: number
  type: 'arrival' | 'departure' | 'event'
  vehicle_type?: string
  driver_id?: string
  flight_number?: string
  flight_date?: string
  flight_time?: string
  airport?: string
  scheduled_date?: string
  scheduled_time?: string
  status: string
  notes?: string
  created_at: string
  // Joins
  driver?: TransportDriver
}

export interface PermissionArea {
  id: string
  code: string
  name: string
  display_order: number
}

export interface UserPermission {
  id: string
  user_id: string
  area_id: string
  permission: PermissionLevel
  area?: PermissionArea
}
```

---

## TAREFA 7: Criar Constantes

Criar `src/lib/constants.ts`:

```typescript
export const APP_NAME = 'MMA Event System'

export const COLORS = {
  primary: '#E63946',
  primaryHover: '#C1121F',
  primaryLight: '#FFCCD5',
  critical: '#DC2626',
  warning: '#F59E0B',
  success: '#22C55E',
  neutral: '#6B7280',
} as const

export const VISA_STATUS_LABELS: Record<number, string> = {
  1: 'Not Required',
  2: 'Required',
  3: 'Applied',
  4: 'Approved',
  5: 'Rejected',
  6: 'Resident',
}

export const VISA_STATUS_COLORS: Record<number, string> = {
  1: 'bg-gray-500',
  2: 'bg-red-500',
  3: 'bg-yellow-500',
  4: 'bg-green-500',
  5: 'bg-red-700',
  6: 'bg-blue-500',
}

export const ROLE_CODES = {
  FIGHTER: 'F',
  CORNER: 'C',
  GUEST: 'G',
  STAFF: 'ST',
} as const

export const PERMISSION_AREAS = [
  'people',
  'events',
  'flights',
  'visas',
  'hotels',
  'transport',
  'operations',
  'pre_event',
  'admin',
] as const

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Eventos', href: '/events', icon: 'Calendar', area: 'events' },
  { label: 'People', href: '/people', icon: 'Users', area: 'people' },
  { label: 'Aéreo', href: '/flights', icon: 'Plane', area: 'flights' },
  { label: 'Vistos', href: '/visas', icon: 'FileText', area: 'visas' },
  { label: 'Hotel', href: '/hotels', icon: 'Building2', area: 'hotels' },
  { label: 'Transporte', href: '/transport', icon: 'Car', area: 'transport' },
  { label: 'Configurações', href: '/settings', icon: 'Settings', area: 'admin' },
] as const
```

---

## TAREFA 8: Criar Utils

Criar `src/lib/utils.ts` (substituir o existente):

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(time: string): string {
  return time.slice(0, 5) // HH:MM
}

export function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function getFighterPhotoUrl(fighterId: number): string {
  return `https://appadmin.uaewarriors.com/imagecdn/FighterDP?fighterId=${fighterId}`
}

export function generateEventCode(roleCode: string, sequence: number): string {
  return `${roleCode}.${sequence.toString().padStart(3, '0')}`
}
```

---

## TAREFA 9: Criar Hook useUser

Criar `src/hooks/use-user.ts`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/database'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (authUser) {
          const { data } = await supabase
            .from('mma_users')
            .select('*')
            .eq('id', authUser.id)
            .single()
          
          setUser(data)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
        } else if (session?.user) {
          const { data } = await supabase
            .from('mma_users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          setUser(data)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
```

---

## TAREFA 10: Criar Hook usePermissions

Criar `src/hooks/use-permissions.ts`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'
import type { UserPermission, PermissionLevel } from '@/types/database'

export function usePermissions() {
  const { user } = useUser()
  const [permissions, setPermissions] = useState<UserPermission[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchPermissions() {
      if (!user) {
        setPermissions([])
        setLoading(false)
        return
      }

      // Admin tem acesso total
      if (user.user_type === 'admin') {
        setLoading(false)
        return
      }

      try {
        const { data } = await supabase
          .from('mma_user_permissions')
          .select(`
            *,
            area:mma_permission_areas(*)
          `)
          .eq('user_id', user.id)

        setPermissions(data || [])
      } catch (error) {
        console.error('Error fetching permissions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [user])

  const hasPermission = (areaCode: string, level: PermissionLevel = 'view'): boolean => {
    if (!user) return false
    if (user.user_type === 'admin') return true

    const permission = permissions.find(p => p.area?.code === areaCode)
    if (!permission) return false

    if (level === 'view') return true
    return permission.permission === 'edit'
  }

  const canView = (areaCode: string): boolean => hasPermission(areaCode, 'view')
  const canEdit = (areaCode: string): boolean => hasPermission(areaCode, 'edit')

  return {
    permissions,
    loading,
    hasPermission,
    canView,
    canEdit,
    isAdmin: user?.user_type === 'admin',
  }
}
```

---

## TAREFA 11: Criar Layout Principal

Criar `src/components/layout/sidebar.tsx`:

```typescript
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
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Eventos', href: '/events', icon: 'Calendar', area: 'events' },
  { label: 'People', href: '/people', icon: 'Users', area: 'people' },
  { label: 'Aéreo', href: '/flights', icon: 'Plane', area: 'flights' },
  { label: 'Vistos', href: '/visas', icon: 'FileText', area: 'visas' },
  { label: 'Hotel', href: '/hotels', icon: 'Building2', area: 'hotels' },
  { label: 'Transporte', href: '/transport', icon: 'Car', area: 'transport' },
  { label: 'Configurações', href: '/settings', icon: 'Settings', area: 'admin' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { canView, isAdmin } = usePermissions()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filteredItems = navItems.filter(item => {
    if (!item.area) return true
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
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredItems.map(item => {
          const Icon = icons[item.icon as keyof typeof icons]
          const isActive = pathname.startsWith(item.href)

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
        })}
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
```

---

## TAREFA 12: Criar Header

Criar `src/components/layout/header.tsx`:

```typescript
'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function Header({ title, description, actions }: HeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="flex items-center justify-between p-6 border-b bg-card">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        {actions}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  )
}
```

---

## TAREFA 13: Criar Theme Provider

Criar `src/components/providers/theme-provider.tsx`:

```typescript
'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes/dist/types'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

Instalar next-themes se necessário:

```bash
pnpm add next-themes
```

---

## TAREFA 14: Atualizar Layout Root

Substituir `src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MMA Event System',
  description: 'Sistema de gestão de eventos de MMA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

---

## TAREFA 15: Criar Layout do Dashboard

Criar `src/app/(dashboard)/layout.tsx`:

```typescript
import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  )
}
```

---

## TAREFA 16: Criar Página de Login

Criar `src/app/(auth)/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/callback`,
        },
      })

      if (error) throw error
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login com Google')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary">MMA Event System</CardTitle>
          <CardDescription>
            Faça login para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar com Email'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                ou continue com
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Entrar com Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## TAREFA 17: Criar Callback Page

Criar `src/app/(auth)/callback/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
```

---

## TAREFA 18: Criar Página Dashboard

Criar `src/app/(dashboard)/dashboard/page.tsx`:

```typescript
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Dashboard" 
        description="Visão geral do sistema"
      />
      
      <div className="flex-1 p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Crítico</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">pendências urgentes</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Atenção</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">pendências próximas</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Concluído</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">tarefas finalizadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder para urgências */}
        <Card>
          <CardHeader>
            <CardTitle>Urgências</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Nenhum evento ativo. Crie um evento para começar.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

---

## TAREFA 19: Criar Página Inicial (Redirect)

Substituir `src/app/page.tsx`:

```typescript
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
```

---

## TAREFA 20: Atualizar globals.css

Substituir `src/app/globals.css` adicionando no final:

```css
/* Adicionar ao final do arquivo existente */

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: hsl(var(--muted));
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.5);
}

/* Status colors */
.status-critical { @apply bg-red-500; }
.status-warning { @apply bg-yellow-500; }
.status-success { @apply bg-green-500; }
.status-neutral { @apply bg-gray-500; }
```

---

## VERIFICAÇÃO FINAL

Após executar todas as tarefas:

```bash
pnpm dev
```

Deve:
1. Abrir em http://localhost:3000
2. Redirecionar para /login
3. Mostrar página de login com opções Email e Google
4. Após login, mostrar dashboard com sidebar

---

## Critérios de Aceitação

- [ ] Projeto roda sem erros (`pnpm dev`)
- [ ] Página de login funciona
- [ ] Sidebar aparece após login
- [ ] Toggle dark/light mode funciona
- [ ] Middleware redireciona corretamente
- [ ] Estrutura de pastas criada

---

## Próximo Sprint

**SPRINT_01**: People Database (CRUD, importação CSV, listagem)
