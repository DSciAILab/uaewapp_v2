'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { EventForm } from '@/components/forms/event-form'
import { EnrollmentForm } from '@/components/forms/enrollment-form'
import { EnrollmentsTable } from '@/components/tables/enrollments-table'
import { Settings, Plus, Users, Plane, FileText, Hotel, Car, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/use-permissions'
import { getEventById, updateEvent } from '@/lib/services/events'
import {
  getEnrollmentsByEvent,
  createEnrollment,
  updateEnrollment,
  cancelEnrollment,
  getEnrollmentStats,
  type EnrollmentWithDetails,
} from '@/lib/services/enrollments'
import { formatDate } from '@/lib/utils'
import type { Event } from '@/types/database'
import type { EventSchema, EnrollmentSchema } from '@/lib/validations/event'

export default function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params)
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [isEventDrawerOpen, setIsEventDrawerOpen] = useState(false)
  const [isEnrollmentDrawerOpen, setIsEnrollmentDrawerOpen] = useState(false)
  const [editingEnrollment, setEditingEnrollment] = useState<EnrollmentWithDetails | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [enrollmentToCancel, setEnrollmentToCancel] = useState<EnrollmentWithDetails | null>(null)

  const { canEdit } = usePermissions()
  const canEditEvents = canEdit('events')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [eventData, enrollmentsData, statsData] = await Promise.all([
        getEventById(eventId),
        getEnrollmentsByEvent(eventId),
        getEnrollmentStats(eventId),
      ])
      setEvent(eventData)
      setEnrollments(enrollmentsData)
      setStats(statsData)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar evento')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [eventId])

  const fighters = enrollments.filter(e => e.role?.code === 'F')
  const corners = enrollments.filter(e => e.role?.code === 'C')
  const staff = enrollments.filter(e => e.role?.code === 'ST')
  const guests = enrollments.filter(e => e.role?.code === 'G')

  const handleUpdateEvent = async (data: EventSchema) => {
    setSaving(true)
    try {
      await updateEvent(eventId, data)
      toast.success('Evento atualizado')
      setIsEventDrawerOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar evento')
    } finally {
      setSaving(false)
    }
  }

  const handleAddEnrollment = () => {
    setEditingEnrollment(null)
    setIsEnrollmentDrawerOpen(true)
  }

  const handleEditEnrollment = (enrollment: EnrollmentWithDetails) => {
    setEditingEnrollment(enrollment)
    setIsEnrollmentDrawerOpen(true)
  }

  const handleSubmitEnrollment = async (data: EnrollmentSchema) => {
    setSaving(true)
    try {
      if (editingEnrollment) {
        await updateEnrollment(editingEnrollment.id, data)
        toast.success('Inscrição atualizada')
      } else {
        await createEnrollment(data)
        toast.success('Pessoa adicionada ao evento')
      }
      setIsEnrollmentDrawerOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar inscrição')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelClick = (enrollment: EnrollmentWithDetails) => {
    setEnrollmentToCancel(enrollment)
    setCancelDialogOpen(true)
  }

  const handleCancelConfirm = async () => {
    if (!enrollmentToCancel) return
    setSaving(true)
    try {
      await cancelEnrollment(enrollmentToCancel.id)
      toast.success('Inscrição cancelada')
      setCancelDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar inscrição')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Evento não encontrado</p>
        <Button onClick={() => router.push('/events')}>Voltar</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title={event.name}
        description={`${formatDate(event.event_date)}${event.city ? ` • ${event.city}` : ''}`}
      />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/events')}>
            <ArrowLeft className="mr-2 h-4 w-4" />Voltar
          </Button>
          <div className="flex gap-2">
            {canEditEvents && (
              <>
                <Button variant="outline" onClick={() => setIsEventDrawerOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />Configurações
                </Button>
                <Button onClick={handleAddEnrollment}>
                  <Plus className="mr-2 h-4 w-4" />Adicionar Pessoa
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push(`/events/${eventId}`)}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader>
            <CardContent><div className="flex items-center gap-2"><Users className="h-5 w-5" /><span className="text-2xl font-bold">{stats.total || 0}</span></div></CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push(`/flights`)}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Aéreo</CardTitle></CardHeader>
            <CardContent><div className="flex items-center gap-2"><Plane className="h-5 w-5" /><span className="text-2xl font-bold">{stats.needsFlight || 0}</span></div></CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push(`/visas`)}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Visto</CardTitle></CardHeader>
            <CardContent><div className="flex items-center gap-2"><FileText className="h-5 w-5" /><span className="text-2xl font-bold">{stats.needsVisa || 0}</span></div></CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push(`/events/${eventId}/hotels`)}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Hotel</CardTitle></CardHeader>
            <CardContent><div className="flex items-center gap-2"><Hotel className="h-5 w-5 text-blue-600" /><span className="text-2xl font-bold">{stats.needsHotel || 0}</span></div></CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push(`/events/${eventId}/transport`)}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Transporte</CardTitle></CardHeader>
            <CardContent><div className="flex items-center gap-2"><Car className="h-5 w-5 text-orange-600" /><span className="text-2xl font-bold">Logística</span></div></CardContent>
          </Card>
        </div>

        <Card>
          <Tabs defaultValue="fighters">
            <CardHeader className="pb-0">
              <TabsList>
                <TabsTrigger value="fighters">Fighters ({fighters.length})</TabsTrigger>
                <TabsTrigger value="corners">Corners ({corners.length})</TabsTrigger>
                <TabsTrigger value="staff">Staff ({staff.length})</TabsTrigger>
                <TabsTrigger value="guests">Guests ({guests.length})</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <TabsContent value="fighters" className="m-0">
                <EnrollmentsTable enrollments={fighters} onEdit={handleEditEnrollment} onCancel={handleCancelClick} canEdit={canEditEvents} />
              </TabsContent>
              <TabsContent value="corners" className="m-0">
                <EnrollmentsTable enrollments={corners} onEdit={handleEditEnrollment} onCancel={handleCancelClick} canEdit={canEditEvents} />
              </TabsContent>
              <TabsContent value="staff" className="m-0">
                <EnrollmentsTable enrollments={staff} onEdit={handleEditEnrollment} onCancel={handleCancelClick} canEdit={canEditEvents} />
              </TabsContent>
              <TabsContent value="guests" className="m-0">
                <EnrollmentsTable enrollments={guests} onEdit={handleEditEnrollment} onCancel={handleCancelClick} canEdit={canEditEvents} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      <Sheet open={isEventDrawerOpen} onOpenChange={setIsEventDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Configurações do Evento</SheetTitle></SheetHeader>
          <div className="mt-6">
            <EventForm event={event} onSubmit={handleUpdateEvent} onCancel={() => setIsEventDrawerOpen(false)} loading={saving} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isEnrollmentDrawerOpen} onOpenChange={setIsEnrollmentDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{editingEnrollment ? 'Editar Inscrição' : 'Adicionar Pessoa'}</SheetTitle></SheetHeader>
          <div className="mt-6">
            <EnrollmentForm eventId={eventId} enrollment={editingEnrollment} onSubmit={handleSubmitEnrollment} onCancel={() => setIsEnrollmentDrawerOpen(false)} loading={saving} />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Inscrição</DialogTitle>
            <DialogDescription>Tem certeza que deseja cancelar a inscrição de {enrollmentToCancel?.person?.compiled_name}?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Não</Button>
            <Button variant="destructive" onClick={handleCancelConfirm} disabled={saving}>Sim, Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
