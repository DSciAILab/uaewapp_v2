import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { getHotelStats } from '@/lib/services/hotel-service'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Get active event
  const { data: event } = await supabase
    .from('mma_events')
    .select('id, name')
    .eq('status', 'active')
    .single()

  let stats = {
    total: 0,
    confirmed: 0,
    pending: 0,
    with_divergence: 0,
    pending_approval: 0
  }

  if (event) {
    try {
      stats = await getHotelStats(event.id)
    } catch (error) {
       console.error('Failed to fetch stats', error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Dashboard" 
        description={event ? `Overview: ${event.name}` : "System Overview"}
      />
      
      <div className="flex-1 p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending + stats.pending_approval}</div>
              <p className="text-xs text-muted-foreground">pending actions</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Attention</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.with_divergence}</div>
              <p className="text-xs text-muted-foreground">divergences</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.confirmed}</div>
              <p className="text-xs text-muted-foreground">reservations confirmed</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Message */}
        {!event && (
            <Card>
            <CardHeader>
                <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-center py-8">
                No active event found. Please check 'Events' to activate one.
                </p>
            </CardContent>
            </Card>
        )}

        {event && (
             <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Event <strong>{event.name}</strong> is currently active. Go to the side menu to manage Hotels, Flights, or Visas.
                    </p>
                </CardContent>
             </Card>
        )}
      </div>
    </div>
  )
}
