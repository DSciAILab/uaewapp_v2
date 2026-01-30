import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CheckCircle2, Calendar, ArrowRight, Radio } from 'lucide-react';
import { getDashboardData, calculateModuleStatuses, getUpcomingDeadlines } from '@/lib/services/dashboard-service';
import { MetricsGrid } from '@/components/dashboard/metrics-grid';
import { ProgressWidget } from '@/components/dashboard/progress-widget';
import { UpcomingDeadlines } from '@/components/dashboard/upcoming-deadlines';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Get active event
  const { data: event } = await supabase
    .from('mma_events')
    .select('id, name, event_date, city, status')
    .eq('status', 'active')
    .single();

  let dashboardData = null;
  let modules: ReturnType<typeof calculateModuleStatuses> = [];
  let deadlines: Awaited<ReturnType<typeof getUpcomingDeadlines>> = [];

  if (event) {
    try {
      dashboardData = await getDashboardData(event.id, supabase, event);
      modules = calculateModuleStatuses(dashboardData.metrics);
      deadlines = dashboardData.deadlines;
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  }

  // Calculate summary stats for legacy KPIs
  const criticalCount = dashboardData 
    ? (dashboardData.metrics.pending_tickets + dashboardData.metrics.visas_denied + dashboardData.metrics.clearance_denied + dashboardData.metrics.tasks_overdue) 
    : 0;
  const warningCount = dashboardData 
    ? (dashboardData.metrics.divergences_pending + dashboardData.metrics.visas_pending + dashboardData.metrics.clearance_pending) 
    : 0;
  const confirmedCount = dashboardData 
    ? (dashboardData.metrics.hotels_confirmed + dashboardData.metrics.visas_approved + dashboardData.metrics.clearance_complete) 
    : 0;

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Command Center" 
        description={event ? `${event.name} • ${event.city}` : "No Active Event"}
      />
      
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Event Header with Quick Access */}
        {event && (
          <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{event.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {event.event_date ? format(new Date(event.event_date), 'EEEE, MMMM d, yyyy') : 'Date TBD'} • {event.city || 'Location TBD'}
                </p>
              </div>
            </div>
            <Link href={`/events/${event.id}/war-room`}>
              <Button variant="outline" className="gap-2">
                <Radio className="h-4 w-4 text-red-500 animate-pulse" />
                War Room
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* Priority KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
              <p className="text-xs text-muted-foreground">Require immediate attention</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{warningCount}</div>
              <p className="text-xs text-muted-foreground">Awaiting review or approval</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{confirmedCount}</div>
              <p className="text-xs text-muted-foreground">Items completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Metrics Grid */}
        {dashboardData && (
          <MetricsGrid metrics={dashboardData.metrics} />
        )}

        {/* Module Progress + Deadlines */}
        {dashboardData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ProgressWidget modules={modules} />
            </div>
            <UpcomingDeadlines deadlines={deadlines} />
          </div>
        )}

        {/* No Event State */}
        {!event && (
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  No active event found. Please activate an event to see the dashboard.
                </p>
                <Link href="/events">
                  <Button>Go to Events</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
