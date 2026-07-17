'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { FlightsTable } from '@/components/tables/flights-table'
import { FlightBatchGrid } from '@/components/flights/flight-batch-grid'
import { FlightForm } from '@/components/forms/flight-form'
import { FlightStats } from '@/components/flights/flight-stats'
import { FlightToolbar } from '@/components/flights/flight-toolbar'
import { GenericCSVImport, type FieldDef } from '@/components/shared/generic-csv-import'
import { Plus, Search, Plane, Clock, CheckCircle2, XCircle, LayoutList, Table2, Upload } from 'lucide-react'
import { CSVImportDropdown, downloadCSVTemplate } from '@/components/shared/csv-import-dropdown'
import {
  getFlightsByEvent,
  createFlight,
  updateFlight,
  deleteFlight,
  getFlightStats,
  importFlightsFromCSV,
  type FlightWithEnrollment,
  type FlightFilters,
  type FlightCSVRow,
} from '@/lib/services/flights'
import { getActiveEvents } from '@/lib/services/events'
import { usePermissions } from '@/hooks/use-permissions'
import type { Event } from '@/types/database'
import type { FlightSchema } from '@/lib/validations/flight'
import { parseCSVDate, parseCSVTime } from '@/lib/utils/csv-values'

/**
 * Coerces one mapped CSV cell for a flight.
 *
 * This screen used to send the raw cell straight through, so a European
 * "23/07/2026" reached Postgres, which read 23 as a month and rejected the row.
 */
function transformFlightValue(field: string, value: string): unknown {
  if (!value) return null;
  if (field.endsWith('_date')) return parseCSVDate(value);
  if (field.endsWith('_time')) return parseCSVTime(value);
  return String(value).trim() || null;
}

const FLIGHT_FIELDS: FieldDef[] = [
  { value: 'passport_name', label: 'Passport Name' },
  { value: 'flight_type', label: 'Flight Type' },
  { value: 'arrival_reservation', label: 'Arrival Reservation' },
  { value: 'arrival_flight_number', label: 'Arrival Flight Number' },
  { value: 'arrival_date', label: 'Arrival Date' },
  { value: 'arrival_time', label: 'Arrival Time' },
  { value: 'arrival_airport', label: 'Arrival Airport' },
  { value: 'arrival_ticket_link', label: 'Arrival Ticket Link' },
  { value: 'departure_reservation', label: 'Departure Reservation' },
  { value: 'departure_flight_number', label: 'Departure Flight Number' },
  { value: 'departure_date', label: 'Departure Date' },
  { value: 'departure_time', label: 'Departure Time' },
  { value: 'departure_airport', label: 'Departure Airport' },
  { value: 'departure_ticket_link', label: 'Departure Ticket Link' },
  { value: 'notes', label: 'Notes' },
]

const FLIGHT_CSV_TEMPLATE =
  'Passport Name,Flight Type,Arrival Reservation,Arrival Flight Number,Arrival Date,Arrival Time,Arrival Airport,Arrival Ticket Link,Departure Reservation,Departure Flight Number,Departure Date,Departure Time,Departure Airport,Departure Ticket Link,Notes\nJohn Doe,full,ABC123,EK204,2026-04-15,14:30,DXB,,DEF456,EK205,2026-04-20,09:00,DXB,,\n'

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
  const [viewMode, setViewMode] = useState<'list' | 'batch'>('list')

  // Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingFlight, setEditingFlight] = useState<FlightWithEnrollment | null>(null)
  const [saving, setSaving] = useState(false)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [flightToDelete, setFlightToDelete] = useState<FlightWithEnrollment | null>(null)

  // CSV import
  const [csvOpen, setCsvOpen] = useState(false)

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
        toast.error('Failed to load events')
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
      toast.error('Failed to load flights')
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
      toast.success('Flight deleted')
      fetchFlights()
    } catch (error) {
      toast.error('Failed to delete flight')
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
        toast.success('Flight updated')
      } else {
        await createFlight(data)
        toast.success('Flight created')
      }
      setIsDrawerOpen(false)
      fetchFlights()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save flight')
    } finally {
      setSaving(false)
    }
  }

  const selectedEvent = events.find(e => e.id === selectedEventId)

  return (
    <div className="flex flex-col h-full space-y-6">
      <DashboardHeader
        title="Flights Manager"
        description={selectedEvent ? `Flights for ${selectedEvent.name}` : 'Select an event to view flights'}
      >
          <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as 'list' | 'batch')} className="mr-2">
             <TabsList>
                 <TabsTrigger value="list" className="flex items-center gap-2 h-8">
                     <LayoutList className="h-4 w-4" />
                     List
                 </TabsTrigger>
                 <TabsTrigger value="batch" className="flex items-center gap-2 h-8">
                     <Table2 className="h-4 w-4" />
                     Batch
                 </TabsTrigger>
             </TabsList>
          </Tabs>
      </DashboardHeader>

      <div className="flex-1 px-6 pb-6 space-y-6">
         {selectedEventId ? (
            <>
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <FlightStats 
                        stats={stats} 
                        activeStatus={filters.status}
                        onStatusClick={(status) => setFilters(prev => ({ ...prev, status: status || undefined }))}
                    />
                </div>

                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
                    <FlightToolbar
                        events={events}
                        selectedEventId={selectedEventId}
                        onEventChange={setSelectedEventId}
                        searchValue={filters.search || ''}
                        onSearchChange={(v) => setFilters(prev => ({ ...prev, search: v }))}
                        statusValue={filters.status || 'all'}
                        onStatusChange={(v) => setFilters(prev => ({ ...prev, status: v === 'all' ? undefined : v }))}
                        onAddClick={handleNewFlight}
                        canEdit={canEdit('flights')}
                    />
                    {canEdit('flights') && selectedEventId && (
                      <div className="flex justify-end -mt-2">
                        <CSVImportDropdown
                          onImportClick={() => setCsvOpen(true)}
                          onTemplateDownload={() => downloadCSVTemplate('flight_import_template.csv', 'Passport Name,Flight Type,Arrival Reservation,Arrival Flight Number,Arrival Date,Arrival Time,Arrival Airport,Arrival Ticket Link,Departure Reservation,Departure Flight Number,Departure Date,Departure Time,Departure Airport,Departure Ticket Link,Notes\nJohn Doe,full,ABC123,EK204,2026-04-15,14:30,DXB,,DEF456,EK205,2026-04-20,09:00,DXB,,\n')}
                        />
                      </div>
                    )}

                    {loading ? (
                        <Card className="min-h-[300px] flex items-center justify-center">
                            <CardContent>
                                <div className="flex flex-col items-center gap-2 text-muted-foreground animate-pulse">
                                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                    Loading flights...
                                </div>
                            </CardContent>
                        </Card>
                    ) : viewMode === 'list' ? (
                        <FlightsTable
                            flights={flights}
                            onEdit={handleEditFlight}
                            onDelete={handleDeleteClick}
                            canEdit={canEdit('flights')}
                            canDelete={isAdmin}
                        />
                    ) : (
                        <FlightBatchGrid 
                            flights={flights}
                            onRefresh={fetchFlights}
                        />
                    )}
                </div>
            </>
         ) : (
            <Card className="border-dashed">
                <CardContent className="py-20 text-center text-muted-foreground">
                    <p className="text-lg font-medium mb-2">No event selected</p>
                    <p>Please select an active event to manage flights.</p>
                </CardContent>
            </Card>
         )}
      </div>

      {/* Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingFlight ? 'Edit Flight' : 'New Flight'}
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
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the flight for{' '}
              <span className="font-semibold text-foreground">{flightToDelete?.enrollment?.person?.compiled_name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete Flight
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 border-none bg-transparent gap-0">
          <div className="bg-background rounded-lg border shadow-2xl flex flex-col h-full w-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col">
              <GenericCSVImport<FlightCSVRow>
                title="Import Flights via CSV"
                subtitle={`Event: ${selectedEvent?.name || ''}`}
                fields={FLIGHT_FIELDS}
                requiredField="passport_name"
                uploadHint="Matching is done by passport name"
                onTemplateDownload={() => downloadCSVTemplate('flight_import_template.csv', FLIGHT_CSV_TEMPLATE)}
                transformValue={transformFlightValue}
                onImport={(rows, upsertMode, onProgress) =>
                  importFlightsFromCSV(selectedEventId, rows, upsertMode, onProgress)
                }
                onComplete={() => { setCsvOpen(false); fetchFlights(); }}
              />
            </div>
          </div>
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
