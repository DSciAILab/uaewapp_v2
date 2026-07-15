'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { EventForm } from '@/components/forms/event-form'
import { Plus, Search, Calendar, MapPin, Users } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/use-permissions'
import { getEvents, createEvent, type EventFilters } from '@/lib/services/events'
import { getEnrollmentStats } from '@/lib/services/enrollments'
import { formatDate } from '@/lib/utils'
import type { Event, EventStatus } from '@/types/database'
import type { EventSchema } from '@/lib/validations/event'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'planning', label: 'Planejamento' },
  { value: 'active', label: 'Ativo' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
]

const STATUS_COLORS: Record<EventStatus, string> = {
  planning: 'bg-blue-500',
  active: 'bg-green-500',
  completed: 'bg-gray-500',
  cancelled: 'bg-red-500',
}

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [stats, setStats] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filters, setFilters] = useState<EventFilters>({})

  const { canEdit } = usePermissions()
  const canEditEvents = canEdit('events')

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const data = await getEvents(filters)
      setEvents(data)
      
      // Fetch stats for each event
      const statsMap: Record<string, any> = {}
      for (const event of data) {
        try {
          statsMap[event.id] = await getEnrollmentStats(event.id)
        } catch {
          statsMap[event.id] = { total: 0, fighters: 0, corners: 0 }
        }
      }
      setStats(statsMap)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar eventos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvents() }, [filters])

  const handleCreate = async (data: EventSchema) => {
    setFormLoading(true)
    try {
      await createEvent(data)
      toast.success('Evento criado com sucesso')
      setDrawerOpen(false)
      fetchEvents()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar evento')
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Eventos" description="Gerenciamento de eventos" />
      
      <div className="flex-1 p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar eventos..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select
              value={filters.status || 'all'}
              onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? undefined : v as EventStatus })}
            >
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
              </SelectContent>
            </Select>
            
            {canEditEvents && (
              <Button onClick={() => setDrawerOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />Novo Evento
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Nenhum evento encontrado</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const eventStats = stats[event.id] || { total: 0, fighters: 0, corners: 0 }
              return (
                <Card
                  key={event.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => router.push(`/events/${event.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{event.name}</CardTitle>
                        {event.code && <CardDescription className="font-mono">{event.code}</CardDescription>}
                      </div>
                      <Badge className={STATUS_COLORS[event.status]}>{event.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                    {(event.city || event.country) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{[event.city, event.country].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{eventStats.total}</span>
                      <span className="text-muted-foreground">
                        ({eventStats.fighters}F / {eventStats.corners}C)
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Novo Evento</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <EventForm onSubmit={handleCreate} onCancel={() => setDrawerOpen(false)} loading={formLoading} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
