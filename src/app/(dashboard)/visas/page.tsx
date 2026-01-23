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
import { VisasTable } from '@/components/tables/visas-table'
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
        toast.error('Erro ao carregar eventos')
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
      toast.error('Erro ao carregar vistos')
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
      toast.success('Visto excluído com sucesso')
      fetchVisas()
    } catch (error) {
      toast.error('Erro ao excluir visto')
    } finally {
      setDeleteDialogOpen(false)
      setVisaToDelete(null)
    }
  }

  const handleToggleDone = async (visa: VisaWithEnrollment) => {
    try {
      await updateVisa(visa.id, { is_done: !visa.is_done })
      toast.success(visa.is_done ? 'Marcado como pendente' : 'Marcado como concluído')
      fetchVisas()
    } catch (error) {
      toast.error('Erro ao atualizar visto')
    }
  }

  const handleSubmit = async (data: VisaSchema) => {
    setSaving(true)
    try {
      if (editingVisa) {
        await updateVisa(editingVisa.id, data)
        toast.success('Visto atualizado com sucesso')
      } else {
        await createVisa(data)
        toast.success('Visto criado com sucesso')
      }
      setIsDrawerOpen(false)
      fetchVisas()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar visto')
    } finally {
      setSaving(false)
    }
  }

  const selectedEvent = events.find(e => e.id === selectedEventId)

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Vistos"
        description={selectedEvent ? `Vistos para ${selectedEvent.name}` : 'Selecione um evento'}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Filters */}
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
                    placeholder="Buscar por nome..."
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
                  <SelectItem value="all">Todos</SelectItem>
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
                    <SelectValue placeholder="Nacionalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
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
                  Novo Visto
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {stats && selectedEventId && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
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
                  Applied
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold">{stats.applied}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Approved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">{stats.approved}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rejected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold">{stats.rejected}</span>
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
              Selecione um evento para ver os vistos
            </CardContent>
          </Card>
        )}
      </div>

      {/* Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingVisa ? 'Editar Visto' : 'Novo Visto'}
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
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o visto de{' '}
              {visaToDelete?.enrollment?.person?.compiled_name}?
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
