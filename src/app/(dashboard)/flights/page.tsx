'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FlightsTable } from '@/components/tables/flights-table'
import { FlightForm } from '@/components/forms/flight-form'
import { Plus, Search, Plane, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  getFlightsByEvent,
  createFlight,
  updateFlight,
  deleteFlight,
  getFlightStats,
  type FlightWithEnrollment,
  type FlightFilters,
} from '@/lib/services/flights'
import { getActiveEvents } from '@/lib/services/events'
import { usePermissions } from '@/hooks/use-permissions'
import type { Event } from '@/types/database'
import type { FlightSchema } from '@/lib/validations/flight'

function FlightsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventIdParam = searchParams.get('event')
  
  const { canEdit, isAdmin } = usePermissions()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>(eventIdParam || '')
  const [flights, setFlights] = useState<FlightWithEnrollment[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FlightFilters>({})

  // Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingFlight, setEditingFlight] = useState<FlightWithEnrollment | null>(null)
  const [saving, setSaving] = useState(false)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [flightToDelete, setFlightToDelete] = useState<FlightWithEnrollment | null>(null)

  // Load events
  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await getActiveEvents()
        setEvents(data)
        if (data.length > 0 && !selectedEventId) {
          setSelectedEventId(data[0].id)
        }
      } catch (error) {
        toast.error('Erro ao carregar eventos')
      }
    }
    loadEvents()
  }, [])

  // Load flights when event changes
  const fetchFlights = useCallback(async () => {
    if (!selectedEventId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [flightsData, statsData] = await Promise.all([
        getFlightsByEvent(selectedEventId, filters),
        getFlightStats(selectedEventId),
      ])
      setFlights(flightsData)
      setStats(statsData)
    } catch (error) {
      toast.error('Erro ao carregar voos')
    } finally {
      setLoading(false)
    }
  }, [selectedEventId, filters])

  useEffect(() => {
    fetchFlights()
  }, [fetchFlights])

  // Update URL when event changes
  useEffect(() => {
    if (selectedEventId) {
      router.push(`/flights?event=${selectedEventId}`, { scroll: false })
    }
  }, [selectedEventId, router])

  const handleNewFlight = () => {
    setEditingFlight(null)
    setIsDrawerOpen(true)
  }

  const handleEditFlight = (flight: FlightWithEnrollment) => {
    setEditingFlight(flight)
    setIsDrawerOpen(true)
  }

  const handleDeleteClick = (flight: FlightWithEnrollment) => {
    setFlightToDelete(flight)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!flightToDelete) return

    try {
      await deleteFlight(flightToDelete.id)
      toast.success('Voo excluído com sucesso')
      fetchFlights()
    } catch (error) {
      toast.error('Erro ao excluir voo')
    } finally {
      setDeleteDialogOpen(false)
      setFlightToDelete(null)
    }
  }

  const handleSubmit = async (data: FlightSchema) => {
    setSaving(true)
    try {
      if (editingFlight) {
        await updateFlight(editingFlight.id, data)
        toast.success('Voo atualizado com sucesso')
      } else {
        await createFlight(data)
        toast.success('Voo criado com sucesso')
      }
      setIsDrawerOpen(false)
      fetchFlights()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar voo')
    } finally {
      setSaving(false)
    }
  }

  const selectedEvent = events.find(e => e.id === selectedEventId)

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Aéreo"
        description={selectedEvent ? `Voos para ${selectedEvent.name}` : 'Selecione um evento'}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Event Selector + Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <Select
                value={selectedEventId}
                onValueChange={setSelectedEventId}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Selecione um evento" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, voo..."
                    className="pl-9"
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
              </div>

              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value }))
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="booked">Reservado</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              {canEdit('flights') && selectedEventId && (
                <Button onClick={handleNewFlight}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Voo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {stats && selectedEventId && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{stats.total}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold">{stats.pending}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Confirmados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">{stats.confirmed}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cancelados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold">{stats.cancelled}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Table */}
        {selectedEventId ? (
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Carregando...
                </div>
              ) : (
                <FlightsTable
                  flights={flights}
                  onEdit={handleEditFlight}
                  onDelete={handleDeleteClick}
                  canEdit={canEdit('flights')}
                  canDelete={isAdmin}
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Selecione um evento para ver os voos
            </CardContent>
          </Card>
        )}
      </div>

      {/* Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingFlight ? 'Editar Voo' : 'Novo Voo'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {selectedEventId && (
              <FlightForm
                eventId={selectedEventId}
                flight={editingFlight}
                onSubmit={handleSubmit}
                onCancel={() => setIsDrawerOpen(false)}
                loading={saving}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o voo de{' '}
              {flightToDelete?.enrollment?.person?.compiled_name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function FlightsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <FlightsContent />
    </Suspense>
  )
}
