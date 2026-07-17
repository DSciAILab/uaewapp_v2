import { DashboardHeader } from '@/components/layout/dashboard-header'
import { Button } from '@/components/ui/button'
import { StatusDot } from '@/components/ui/status-dot'
import { StatCard } from '@/components/ui/stat-card'
import { EventCountdown } from '@/components/ui/event-countdown'
import { getDashboardData, calculateModuleStatuses, getUpcomingDeadlines } from '@/lib/services/dashboard-service'
import { MetricsGrid } from '@/components/dashboard/metrics-grid'
import { ProgressWidget } from '@/components/dashboard/progress-widget'
import { UpcomingDeadlines } from '@/components/dashboard/upcoming-deadlines'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Radio,
  ArrowRight,
  Plane,
  Users,
  Stethoscope,
  Building2,
  Car,
  ClipboardList,
  Music,
  ShieldCheck,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// Map Supabase metric keys → operational module display
const MODULE_REGISTRY = [
  { key: 'flights', label: 'Flights', icon: Plane, path: '/flights' },
  { key: 'people', label: 'People', icon: Users, path: '/people' },
  { key: 'medical', label: 'Medical', icon: Stethoscope, path: '/medical' },
  { key: 'hotels', label: 'Hotels', icon: Building2, path: '/hotels' },
  { key: 'transport', label: 'Transport', icon: Car, path: '/transport' },
  { key: 'tasks', label: 'Tasks', icon: ClipboardList, path: '/tasks' },
  { key: 'music', label: 'Music', icon: Music, path: '/music' },
  { key: 'visas', label: 'Visas', icon: ShieldCheck, path: '/visas' },
] as const

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('mma_events')
    .select('id, name, event_date, city, status')
    .eq('status', 'active')
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  let dashboardData = null
  let modules: ReturnType<typeof calculateModuleStatuses> = []
  let deadlines: Awaited<ReturnType<typeof getUpcomingDeadlines>> = []

  if (event) {
    try {
      dashboardData = await getDashboardData(event.id, supabase, event)
      modules = calculateModuleStatuses(dashboardData.metrics)
      deadlines = dashboardData.deadlines
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    }
  }

  // Aggregate KPIs (priority counters)
  const m = dashboardData?.metrics
  const criticalCount = m
    ? m.pending_tickets + m.visas_denied + m.clearance_denied + m.tasks_overdue
    : 0
  const warningCount = m
    ? m.divergences_pending + m.visas_pending + m.clearance_pending
    : 0
  const confirmedCount = m
    ? m.hotels_confirmed + m.visas_approved + m.clearance_complete
    : 0

  // Build module tiles from registry + calculated statuses
  // The service returns `module` (string id) and status in
  // 'good' | 'warning' | 'critical' | 'neutral'. We map to our
  // status dot vocabulary for the visual.
  type DotStatus = 'pending' | 'confirmed' | 'warning' | 'critical' | 'neutral'
  const STATUS_MAP: Record<string, DotStatus> = {
    good: 'confirmed',
    warning: 'pending',
    critical: 'critical',
    neutral: 'neutral',
  }
  const moduleTiles = modules.map((mod) => {
    const reg = MODULE_REGISTRY.find((r) => r.key === mod.module) ?? MODULE_REGISTRY[0]
    const pendingCount = mod.pending > 0 ? mod.pending : mod.alerts
    return {
      ...mod,
      ...reg,
      status: (STATUS_MAP[mod.status] ?? 'neutral') as DotStatus,
      count: pendingCount || mod.total,
    }
  })

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        title="Command Center"
        description={event ? `${event.name} • ${event.city}` : 'No Active Event'}
      />

      <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-auto">
        {event ? (
          <>
            {/* === HERO STRIP: Event + Countdown + KPIs === */}
            <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
              {/* Event identity card */}
              <div className="grid-cell rounded-lg p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary/15 border border-primary/30 shrink-0">
                    <Radio className="h-5 w-5 text-primary" strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="label-mono text-primary mb-1">Active event</p>
                    <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
                      {event.name}
                    </h2>
                    <p className="numeric text-xs text-muted-foreground">
                      {event.event_date
                        ? format(new Date(event.event_date), 'EEE, MMM d, yyyy')
                        : 'Date TBD'}
                      {' • '}
                      {event.city || 'Location TBD'}
                    </p>
                  </div>
                </div>
                <Link href={`/events/${event.id}/war-room`}>
                  <Button variant="outline" size="sm" className="gap-2 shrink-0">
                    <Radio className="h-3.5 w-3.5 text-red-500 animate-pulse" />
                    War Room
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>

              {/* Countdown */}
              {event.event_date && (
                <EventCountdown
                  targetDate={event.event_date}
                  eventName="Time to fight"
                  eventCode={`${event.name} · ${event.city || 'TBD'}`}
                  className="lg:min-w-[420px]"
                />
              )}
            </section>

            {/* === PRIORITY KPI ROW === */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard
                label="Critical"
                value={criticalCount}
                delta={criticalCount > 0 ? criticalCount : undefined}
                deltaUnit={criticalCount > 0 ? 'open' : undefined}
                status={criticalCount > 0 ? 'critical' : 'confirmed'}
                hint="Require immediate action"
              />
              <StatCard
                label="Pending"
                value={warningCount}
                status={warningCount > 0 ? 'pending' : 'confirmed'}
                hint="Awaiting review or approval"
              />
              <StatCard
                label="Confirmed"
                value={confirmedCount}
                status="confirmed"
                hint="Items completed today"
              />
            </section>

            {/* === MODULE STATUS GRID === */}
            {moduleTiles.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="label-mono text-muted-foreground">Modules</p>
                    <h3 className="font-display text-lg font-semibold tracking-tight">
                      Operational status
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <StatusDot status="confirmed" size="sm" /> OK
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <StatusDot status="pending" size="sm" /> Pending
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <StatusDot status="critical" size="sm" /> Critical
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {moduleTiles.map((tile) => {
                    const Icon = tile.icon
                    return (
                      <Link
                        key={tile.key}
                        href={tile.path}
                        className="grid-cell rounded-md p-3 flex flex-col gap-2 hover:bg-surface-2/60 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <Icon
                            className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors"
                            strokeWidth={2}
                          />
                          <StatusDot status={tile.status} size="sm" />
                        </div>
                        <span className="label-mono text-foreground">{tile.label}</span>
                        <span className="numeric text-xl font-semibold tracking-tight leading-none">
                          {tile.count}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            {/* === DETAILED METRICS === */}
            {dashboardData && <MetricsGrid metrics={dashboardData.metrics} />}

            {/* === PROGRESS + DEADLINES === */}
            {dashboardData && (
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <ProgressWidget modules={modules} />
                </div>
                <UpcomingDeadlines deadlines={deadlines} />
              </section>
            )}
          </>
        ) : (
          <section className="grid-cell rounded-lg p-12 text-center">
            <Radio className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4" strokeWidth={1.5} />
            <p className="label-mono text-muted-foreground mb-2">No active event</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Activate an event to load operational data, or create a new one to start
              tracking fighters, flights, and walkouts.
            </p>
            <Link href="/events">
              <Button>Open events</Button>
            </Link>
          </section>
        )}
      </div>
    </div>
  )
}
