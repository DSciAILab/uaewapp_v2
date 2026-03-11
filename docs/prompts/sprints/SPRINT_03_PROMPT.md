# SPRINT 03 - Flights (Aéreo)

## Contexto

Os Sprints 00, 01 e 02 estão concluídos. Temos autenticação, People Database, Events e Enrollments funcionando. Agora vamos criar o módulo de Flights (Aéreo) para gerenciar passagens dos enrolled.

## Dependências

- Sprint 00, 01 e 02 concluídos
- Tabela `mma_flights` no banco
- Enrollments com `needs_flight` definido

## Objetivo do Sprint

- CRUD de voos vinculados ao enrollment
- Tipos: arrival_only, departure_only, full
- Upload de tickets (link Google Drive)
- Listagem com filtros e status
- Indicadores visuais de pendências

---

## TAREFA 1: Criar Serviço de Flights

Criar `src/lib/services/flights.ts`:

```typescript
import { createClient } from '@/lib/supabase/client'
import type { Flight, FlightType, Enrollment } from '@/types/database'

const supabase = createClient()

export interface FlightWithEnrollment extends Flight {
  enrollment: Enrollment & {
    person: {
      id: string
      compiled_name: string
      event_name: string | null
      fighter_id: number | null
      nationality: string | null
    }
    role: {
      id: string
      name: string
      code: string
    }
    event_code: string
  }
}

export interface FlightFilters {
  eventId?: string
  status?: string
  type?: FlightType
  arrivalDate?: string
  departureDate?: string
  search?: string
}

export async function getFlightsByEvent(eventId: string, filters: FlightFilters = {}): Promise<FlightWithEnrollment[]> {
  let query = supabase
    .from('mma_flights')
    .select(`
      *,
      enrollment:mma_enrollments!inner(
        id,
        event_id,
        event_code,
        person:mma_people(
          id,
          compiled_name,
          event_name,
          fighter_id,
          nationality
        ),
        role:mma_roles(
          id,
          name,
          code
        )
      )
    `)
    .eq('enrollment.event_id', eventId)

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.type) {
    query = query.eq('type', filters.type)
  }

  if (filters.arrivalDate) {
    query = query.eq('arrival_date', filters.arrivalDate)
  }

  if (filters.departureDate) {
    query = query.eq('departure_date', filters.departureDate)
  }

  if (filters.search) {
    query = query.or(`
      enrollment.person.compiled_name.ilike.%${filters.search}%,
      enrollment.event_code.ilike.%${filters.search}%,
      arrival_flight_number.ilike.%${filters.search}%,
      departure_flight_number.ilike.%${filters.search}%
    `)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) throw error
  return (data || []) as FlightWithEnrollment[]
}

export async function getFlightByEnrollment(enrollmentId: string): Promise<Flight | null> {
  const { data, error } = await supabase
    .from('mma_flights')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getFlightById(id: string): Promise<FlightWithEnrollment | null> {
  const { data, error } = await supabase
    .from('mma_flights')
    .select(`
      *,
      enrollment:mma_enrollments(
        id,
        event_id,
        event_code,
        person:mma_people(
          id,
          compiled_name,
          event_name,
          fighter_id,
          nationality
        ),
        role:mma_roles(
          id,
          name,
          code
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as FlightWithEnrollment
}

export interface FlightFormData {
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
  status?: string
  notes?: string
}

export async function createFlight(formData: FlightFormData): Promise<Flight> {
  const { data, error } = await supabase
    .from('mma_flights')
    .insert({
      ...formData,
      status: formData.status || 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateFlight(id: string, formData: Partial<FlightFormData>): Promise<Flight> {
  const { data, error } = await supabase
    .from('mma_flights')
    .update(formData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteFlight(id: string): Promise<void> {
  const { error } = await supabase
    .from('mma_flights')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getEnrollmentsNeedingFlight(eventId: string): Promise<any[]> {
  // Get enrollments that need flight but don't have one yet
  const { data: enrollments, error: enrollError } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      event_code,
      needs_flight,
      person:mma_people(
        id,
        compiled_name,
        event_name,
        fighter_id,
        nationality
      ),
      role:mma_roles(
        id,
        name,
        code
      )
    `)
    .eq('event_id', eventId)
    .eq('status', 'active')
    .neq('needs_flight', 'none')

  if (enrollError) throw enrollError

  // Get existing flights for this event
  const { data: flights, error: flightError } = await supabase
    .from('mma_flights')
    .select('enrollment_id')
    .in('enrollment_id', enrollments?.map(e => e.id) || [])

  if (flightError) throw flightError

  const existingFlightEnrollmentIds = new Set(flights?.map(f => f.enrollment_id) || [])

  // Filter enrollments without flights
  return (enrollments || []).filter(e => !existingFlightEnrollmentIds.has(e.id))
}

export async function getFlightStats(eventId: string) {
  const { data, error } = await supabase
    .from('mma_flights')
    .select(`
      id,
      status,
      type,
      enrollment:mma_enrollments!inner(event_id)
    `)
    .eq('enrollment.event_id', eventId)

  if (error) throw error

  const flights = data || []
  
  return {
    total: flights.length,
    pending: flights.filter(f => f.status === 'pending').length,
    booked: flights.filter(f => f.status === 'booked').length,
    confirmed: flights.filter(f => f.status === 'confirmed').length,
    cancelled: flights.filter(f => f.status === 'cancelled').length,
    arrivalOnly: flights.filter(f => f.type === 'arrival_only').length,
    departureOnly: flights.filter(f => f.type === 'departure_only').length,
    fullTrip: flights.filter(f => f.type === 'full').length,
  }
}
```

---

## TAREFA 2: Criar Schema de Validação

Criar `src/lib/validations/flight.ts`:

```typescript
import { z } from 'zod'

export const flightSchema = z.object({
  enrollment_id: z.string().uuid(),
  type: z.enum(['arrival_only', 'departure_only', 'full']),
  
  // Arrival
  arrival_reservation: z.string().max(50).optional().nullable(),
  arrival_flight_number: z.string().max(20).optional().nullable(),
  arrival_date: z.string().optional().nullable(),
  arrival_time: z.string().optional().nullable(),
  arrival_airport: z.string().max(10).optional().nullable(),
  arrival_ticket_link: z.string().url().optional().nullable().or(z.literal('')),
  
  // Departure
  departure_reservation: z.string().max(50).optional().nullable(),
  departure_flight_number: z.string().max(20).optional().nullable(),
  departure_date: z.string().optional().nullable(),
  departure_time: z.string().optional().nullable(),
  departure_airport: z.string().max(10).optional().nullable(),
  departure_ticket_link: z.string().url().optional().nullable().or(z.literal('')),
  
  status: z.enum(['pending', 'booked', 'confirmed', 'cancelled']).optional(),
  notes: z.string().optional().nullable(),
}).refine((data) => {
  // Validar que arrival está preenchido se type inclui arrival
  if (data.type === 'arrival_only' || data.type === 'full') {
    return data.arrival_date && data.arrival_flight_number
  }
  return true
}, {
  message: 'Dados de chegada são obrigatórios para este tipo de voo',
  path: ['arrival_date'],
}).refine((data) => {
  // Validar que departure está preenchido se type inclui departure
  if (data.type === 'departure_only' || data.type === 'full') {
    return data.departure_date && data.departure_flight_number
  }
  return true
}, {
  message: 'Dados de partida são obrigatórios para este tipo de voo',
  path: ['departure_date'],
})

export type FlightSchema = z.infer<typeof flightSchema>
```

---

## TAREFA 3: Criar Componente FlightForm

Criar `src/components/forms/flight-form.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Plane, PlaneLanding, PlaneTakeoff } from 'lucide-react'
import { flightSchema, type FlightSchema } from '@/lib/validations/flight'
import { getEnrollmentsNeedingFlight, type FlightWithEnrollment } from '@/lib/services/flights'
import { getFighterPhotoUrl } from '@/lib/utils'
import type { Flight, FlightType } from '@/types/database'

interface FlightFormProps {
  eventId: string
  flight?: FlightWithEnrollment | null
  onSubmit: (data: FlightSchema) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const FLIGHT_TYPES = [
  { value: 'arrival_only', label: 'Apenas Chegada', icon: PlaneLanding },
  { value: 'departure_only', label: 'Apenas Partida', icon: PlaneTakeoff },
  { value: 'full', label: 'Ida e Volta', icon: Plane },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendente' },
  { value: 'booked', label: 'Reservado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'cancelled', label: 'Cancelado' },
]

export function FlightForm({
  eventId,
  flight,
  onSubmit,
  onCancel,
  loading,
}: FlightFormProps) {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loadingEnrollments, setLoadingEnrollments] = useState(!flight)
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FlightSchema>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      enrollment_id: flight?.enrollment_id || '',
      type: flight?.type || 'full',
      arrival_reservation: flight?.arrival_reservation || '',
      arrival_flight_number: flight?.arrival_flight_number || '',
      arrival_date: flight?.arrival_date || '',
      arrival_time: flight?.arrival_time || '',
      arrival_airport: flight?.arrival_airport || '',
      arrival_ticket_link: flight?.arrival_ticket_link || '',
      departure_reservation: flight?.departure_reservation || '',
      departure_flight_number: flight?.departure_flight_number || '',
      departure_date: flight?.departure_date || '',
      departure_time: flight?.departure_time || '',
      departure_airport: flight?.departure_airport || '',
      departure_ticket_link: flight?.departure_ticket_link || '',
      status: flight?.status || 'pending',
      notes: flight?.notes || '',
    },
  })

  const flightType = watch('type')
  const showArrival = flightType === 'arrival_only' || flightType === 'full'
  const showDeparture = flightType === 'departure_only' || flightType === 'full'

  useEffect(() => {
    if (flight) {
      setSelectedEnrollment(flight.enrollment)
      return
    }

    async function loadEnrollments() {
      try {
        const data = await getEnrollmentsNeedingFlight(eventId)
        setEnrollments(data)
      } catch (error) {
        console.error('Error loading enrollments:', error)
      } finally {
        setLoadingEnrollments(false)
      }
    }
    loadEnrollments()
  }, [eventId, flight])

  const handleEnrollmentChange = (enrollmentId: string) => {
    setValue('enrollment_id', enrollmentId)
    const enrollment = enrollments.find(e => e.id === enrollmentId)
    setSelectedEnrollment(enrollment)
    
    // Set type based on needs_flight
    if (enrollment?.needs_flight) {
      setValue('type', enrollment.needs_flight as FlightType)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Pessoa */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Pessoa
        </h3>

        {flight ? (
          // Modo edição: mostrar pessoa selecionada
          <div className="p-4 bg-muted rounded-lg flex items-center gap-4">
            <Avatar className="h-12 w-12">
              {flight.enrollment.person?.fighter_id && (
                <AvatarImage src={getFighterPhotoUrl(flight.enrollment.person.fighter_id)} />
              )}
              <AvatarFallback>
                {flight.enrollment.person?.compiled_name?.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{flight.enrollment.person?.compiled_name}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{flight.enrollment.event_code}</Badge>
                <Badge variant="secondary">{flight.enrollment.role?.name}</Badge>
              </div>
            </div>
          </div>
        ) : (
          // Modo criação: selecionar pessoa
          <>
            {loadingEnrollments ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : enrollments.length === 0 ? (
              <p className="text-muted-foreground">
                Todas as pessoas que precisam de voo já têm registro.
              </p>
            ) : (
              <Select
                value={watch('enrollment_id')}
                onValueChange={handleEnrollmentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma pessoa" />
                </SelectTrigger>
                <SelectContent>
                  {enrollments.map((enrollment) => (
                    <SelectItem key={enrollment.id} value={enrollment.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {enrollment.event_code}
                        </Badge>
                        <span>{enrollment.person?.compiled_name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {enrollment.needs_flight}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedEnrollment && (
              <div className="p-4 bg-muted rounded-lg flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  {selectedEnrollment.person?.fighter_id && (
                    <AvatarImage src={getFighterPhotoUrl(selectedEnrollment.person.fighter_id)} />
                  )}
                  <AvatarFallback>
                    {selectedEnrollment.person?.compiled_name?.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedEnrollment.person?.compiled_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEnrollment.person?.nationality}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
        {errors.enrollment_id && (
          <p className="text-sm text-red-500">Selecione uma pessoa</p>
        )}
      </div>

      {/* Tipo de Voo */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Tipo de Voo
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {FLIGHT_TYPES.map((type) => {
            const Icon = type.icon
            const isSelected = flightType === type.value
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setValue('type', type.value as FlightType)}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors
                  ${isSelected 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'}
                `}
              >
                <Icon className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm ${isSelected ? 'font-medium' : ''}`}>
                  {type.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chegada */}
      {showArrival && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <PlaneLanding className="h-4 w-4" />
            Chegada
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="arrival_reservation">Nº Reserva</Label>
              <Input
                id="arrival_reservation"
                {...register('arrival_reservation')}
                placeholder="ABC123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrival_flight_number">Nº Voo *</Label>
              <Input
                id="arrival_flight_number"
                {...register('arrival_flight_number')}
                placeholder="LA4521"
              />
              {errors.arrival_flight_number && (
                <p className="text-sm text-red-500">{errors.arrival_flight_number.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="arrival_date">Data *</Label>
              <Input
                id="arrival_date"
                type="date"
                {...register('arrival_date')}
              />
              {errors.arrival_date && (
                <p className="text-sm text-red-500">{errors.arrival_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrival_time">Hora</Label>
              <Input
                id="arrival_time"
                type="time"
                {...register('arrival_time')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrival_airport">Aeroporto</Label>
              <Input
                id="arrival_airport"
                {...register('arrival_airport')}
                placeholder="GRU"
                maxLength={10}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="arrival_ticket_link">Link do Ticket (Google Drive)</Label>
            <Input
              id="arrival_ticket_link"
              {...register('arrival_ticket_link')}
              placeholder="https://drive.google.com/..."
            />
          </div>
        </div>
      )}

      {/* Partida */}
      {showDeparture && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <PlaneTakeoff className="h-4 w-4" />
            Partida
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departure_reservation">Nº Reserva</Label>
              <Input
                id="departure_reservation"
                {...register('departure_reservation')}
                placeholder="XYZ789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departure_flight_number">Nº Voo *</Label>
              <Input
                id="departure_flight_number"
                {...register('departure_flight_number')}
                placeholder="LA4522"
              />
              {errors.departure_flight_number && (
                <p className="text-sm text-red-500">{errors.departure_flight_number.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departure_date">Data *</Label>
              <Input
                id="departure_date"
                type="date"
                {...register('departure_date')}
              />
              {errors.departure_date && (
                <p className="text-sm text-red-500">{errors.departure_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="departure_time">Hora</Label>
              <Input
                id="departure_time"
                type="time"
                {...register('departure_time')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departure_airport">Aeroporto</Label>
              <Input
                id="departure_airport"
                {...register('departure_airport')}
                placeholder="GRU"
                maxLength={10}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="departure_ticket_link">Link do Ticket (Google Drive)</Label>
            <Input
              id="departure_ticket_link"
              {...register('departure_ticket_link')}
              placeholder="https://drive.google.com/..."
            />
          </div>
        </div>
      )}

      {/* Status e Notas */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Status
        </h3>

        <div className="space-y-2">
          <Label>Status do Voo</Label>
          <Select
            value={watch('status') || 'pending'}
            onValueChange={(value) => setValue('status', value as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder="Informações adicionais..."
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : flight ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
```

---

## TAREFA 4: Criar Componente FlightsTable

Criar `src/components/tables/flights-table.tsx`:

```typescript
'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
} from 'lucide-react'
import type { FlightWithEnrollment } from '@/lib/services/flights'
import { getFighterPhotoUrl, formatDate, formatTime } from '@/lib/utils'

interface FlightsTableProps {
  flights: FlightWithEnrollment[]
  onEdit: (flight: FlightWithEnrollment) => void
  onDelete: (flight: FlightWithEnrollment) => void
  canEdit?: boolean
  canDelete?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  booked: 'bg-blue-500',
  confirmed: 'bg-green-500',
  cancelled: 'bg-red-500',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  booked: 'Reservado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
}

const TYPE_ICONS: Record<string, any> = {
  arrival_only: PlaneLanding,
  departure_only: PlaneTakeoff,
  full: Plane,
}

const TYPE_LABELS: Record<string, string> = {
  arrival_only: 'Chegada',
  departure_only: 'Partida',
  full: 'Ida/Volta',
}

export function FlightsTable({
  flights,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = false,
}: FlightsTableProps) {
  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">ID</TableHead>
            <TableHead>Pessoa</TableHead>
            <TableHead className="text-center">Tipo</TableHead>
            <TableHead>Chegada</TableHead>
            <TableHead>Partida</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flights.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Nenhum voo cadastrado
              </TableCell>
            </TableRow>
          ) : (
            flights.map((flight) => {
              const TypeIcon = TYPE_ICONS[flight.type] || Plane
              
              return (
                <TableRow key={flight.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {flight.enrollment?.event_code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {flight.enrollment?.person?.fighter_id && (
                          <AvatarImage
                            src={getFighterPhotoUrl(flight.enrollment.person.fighter_id)}
                          />
                        )}
                        <AvatarFallback className="text-xs">
                          {flight.enrollment?.person?.compiled_name?.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {flight.enrollment?.person?.compiled_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {flight.enrollment?.person?.nationality}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger>
                        <TypeIcon className="h-5 w-5 mx-auto text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        {TYPE_LABELS[flight.type]}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {flight.arrival_date ? (
                      <div className="space-y-1">
                        <p className="font-medium">
                          {formatDate(flight.arrival_date)}
                          {flight.arrival_time && ` ${formatTime(flight.arrival_time)}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {flight.arrival_flight_number}
                          {flight.arrival_airport && ` • ${flight.arrival_airport}`}
                        </p>
                        {flight.arrival_ticket_link && (
                          <a
                            href={flight.arrival_ticket_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ticket
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {flight.departure_date ? (
                      <div className="space-y-1">
                        <p className="font-medium">
                          {formatDate(flight.departure_date)}
                          {flight.departure_time && ` ${formatTime(flight.departure_time)}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {flight.departure_flight_number}
                          {flight.departure_airport && ` • ${flight.departure_airport}`}
                        </p>
                        {flight.departure_ticket_link && (
                          <a
                            href={flight.departure_ticket_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ticket
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={STATUS_COLORS[flight.status]}>
                      {STATUS_LABELS[flight.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <DropdownMenuItem onClick={() => onEdit(flight)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            className="text-red-500"
                            onClick={() => onDelete(flight)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </TooltipProvider>
  )
}
```

---

## TAREFA 5: Criar Página de Flights

Criar `src/app/(dashboard)/flights/page.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
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

export default function FlightsPage() {
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
        actions={
          canEdit('flights') && selectedEventId && (
            <Button onClick={handleNewFlight}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Voo
            </Button>
          )
        }
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
```

---

## TAREFA 6: Adicionar Tooltip ao shadcn/ui

Se ainda não instalado:

```bash
pnpm dlx shadcn@latest add tooltip
```

---

## VERIFICAÇÃO FINAL

Após executar todas as tarefas:

```bash
pnpm dev
```

Deve:
1. Acessar `/flights`
2. Selecionar um evento
3. Ver listagem de voos (vazia inicialmente)
4. Clicar em "Novo Voo"
5. Selecionar pessoa que precisa de voo
6. Preencher dados de chegada/partida
7. Salvar e ver na listagem
8. Editar voo existente
9. Ver stats (total, pendentes, confirmados)

---

## Critérios de Aceitação

- [ ] Seletor de evento funciona
- [ ] Listagem de voos por evento funciona
- [ ] Criar voo funciona
- [ ] Editar voo funciona
- [ ] Excluir voo funciona (admin)
- [ ] Tipos arrival/departure/full funcionam
- [ ] Campos de chegada aparecem quando necessário
- [ ] Campos de partida aparecem quando necessário
- [ ] Link de ticket salva corretamente
- [ ] Filtro por status funciona
- [ ] Busca funciona
- [ ] Stats aparecem corretamente

---

## Arquivos Criados/Modificados

```
src/
├── lib/
│   ├── services/
│   │   └── flights.ts (novo)
│   └── validations/
│       └── flight.ts (novo)
├── components/
│   ├── forms/
│   │   └── flight-form.tsx (novo)
│   └── tables/
│       └── flights-table.tsx (novo)
└── app/(dashboard)/flights/
    └── page.tsx (novo)
```

---

## Próximo Sprint

**SPRINT_04**: Visas (CRUD de vistos, workflow de status)
