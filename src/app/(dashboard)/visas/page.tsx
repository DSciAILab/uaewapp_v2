'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { DashboardHeader } from '@/components/layout/dashboard-header'
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
import { VisasTable } from '@/components/tables/visas-table'
import { VisaStats } from '@/components/visas/visa-stats'
import { VisaForm } from '@/components/forms/visa-form'
import {
  Plus,
  Search,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getVisasByEvent,
  createVisa,
  updateVisa,
  deleteVisa,
  getVisaStats,
  getNationalitiesInEvent,
  type VisaWithEnrollment,
  type VisaFilters,
} from '@/lib/services/visas'
import { getActiveEvents } from '@/lib/services/events'
import { usePermissions } from '@/hooks/use-permissions'
import { VISA_STATUS_LABELS } from '@/lib/constants'
import type { Event, VisaStatus } from '@/types/database'
import type { VisaSchema } from '@/lib/validations/visa'

function VisasContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventIdParam = searchParams.get('event')
  
  const { canEdit, isAdmin } = usePermissions()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>(eventIdParam || '')
  const [visas, setVisas] = useState<VisaWithEnrollment[]>([])
  const [stats, setStats] = useState<any>(null)
  const [nationalities, setNationalities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<VisaFilters>({})

  // Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingVisa, setEditingVisa] = useState<VisaWithEnrollment | null>(null)
  const [saving, setSaving] = useState(false)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [visaToDelete, setVisaToDelete] = useState<VisaWithEnrollment | null>(null)

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

  // Load visas
  const fetchVisas = useCallback(async () => {
    if (!selectedEventId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [visasData, statsData, nationalitiesData] = await Promise.all([
        getVisasByEvent(selectedEventId, filters),
        getVisaStats(selectedEventId),
        getNationalitiesInEvent(selectedEventId),
      ])
      setVisas(visasData)
      setStats(statsData)
      setNationalities(nationalitiesData)
    } catch (error) {
      toast.error('Failed to load visas')
    } finally {
      setLoading(false)
    }
  }, [selectedEventId, filters])

  useEffect(() => {
    fetchVisas()
  }, [fetchVisas])

  // Update URL
  useEffect(() => {
    if (selectedEventId) {
      router.push(`/visas?event=${selectedEventId}`, { scroll: false })
    }
  }, [selectedEventId, router])

  const handleNewVisa = () => {
    setEditingVisa(null)
    setIsDrawerOpen(true)
  }

  const handleEditVisa = (visa: VisaWithEnrollment) => {
    setEditingVisa(visa)
    setIsDrawerOpen(true)
  }

  const handleDeleteClick = (visa: VisaWithEnrollment) => {
    setVisaToDelete(visa)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!visaToDelete) return

    try {
      await deleteVisa(visaToDelete.id)
      toast.success('Visa deleted successfully')
      fetchVisas()
    } catch (error) {
      toast.error('Failed to delete visa')
    } finally {
      setDeleteDialogOpen(false)
      setVisaToDelete(null)
    }
  }

  const handleToggleDone = async (visa: VisaWithEnrollment) => {
    try {
      await updateVisa(visa.id, { is_done: !visa.is_done })
      toast.success(visa.is_done ? 'Marked as pending' : 'Marked as completed')
      fetchVisas()
    } catch (error) {
      toast.error('Failed to update visa')
    }
  }

  const handleSubmit = async (data: VisaSchema) => {
    setSaving(true)
    try {
      if (editingVisa) {
        await updateVisa(editingVisa.id, data)
        toast.success('Visa updated successfully')
      } else {
        await createVisa(data)
        toast.success('Visa created successfully')
      }
      setIsDrawerOpen(false)
      fetchVisas()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save visa')
    } finally {
      setSaving(false)
    }
  }

  const selectedEvent = events.find(e => e.id === selectedEventId)

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        title="Visas"
        description={selectedEvent ? `Visas for ${selectedEvent.name}` : 'Select an event'}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Stats */}
        {stats && selectedEventId && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <VisaStats 
                    stats={stats}
                    activeStatus={filters.status}
                    onStatusClick={(status) => setFilters(prev => ({
                        ...prev,
                        status: status === 'all' ? undefined : status as VisaStatus
                    }))}
                />
            </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <Select
                value={selectedEventId}
                onValueChange={setSelectedEventId}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select an event" />
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
                    placeholder="Search by name..."
                    className="pl-9"
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
              </div>

              <Select
                value={filters.status !== undefined ? String(filters.status) : 'all'}
                onValueChange={(value) =>
                  setFilters(prev => ({
                    ...prev,
                    status: value === 'all' ? undefined : Number(value) as VisaStatus,
                  }))
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {Object.entries(VISA_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {nationalities.length > 0 && (
                <Select
                  value={filters.nationality || 'all'}
                  onValueChange={(value) =>
                    setFilters(prev => ({
                      ...prev,
                      nationality: value === 'all' ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {nationalities.map((nat) => (
                      <SelectItem key={nat} value={nat}>
                        {nat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {canEdit('visas') && selectedEventId && (
                <Button onClick={handleNewVisa}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Visa
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {selectedEventId ? (
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <VisasTable
                  visas={visas}
                  onEdit={handleEditVisa}
                  onDelete={handleDeleteClick}
                  onToggleDone={handleToggleDone}
                  canEdit={canEdit('visas')}
                  canDelete={isAdmin}
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Select an event to see its visas
            </CardContent>
          </Card>
        )}
      </div>

      {/* Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingVisa ? 'Edit Visa' : 'New Visa'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {selectedEventId && (
              <VisaForm
                eventId={selectedEventId}
                visa={editingVisa}
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
              Are you sure you want to delete the visa for{' '}
              {visaToDelete?.enrollment?.person?.compiled_name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function VisasPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <VisasContent />
    </Suspense>
  )
}
