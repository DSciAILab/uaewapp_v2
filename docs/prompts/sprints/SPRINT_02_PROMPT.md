# SPRINT 02 - Events + Enrolled

## Contexto

O Sprint 00 (setup) e Sprint 01 (People Database) estão concluídos. Agora vamos criar o módulo de Eventos e Enrollment, que permite criar eventos, definir o fightcard e fazer o enrollment de pessoas.

## Dependências

- Sprint 00 e 01 concluídos
- Tabelas `mma_events`, `mma_enrollments`, `mma_enrollment_corners`, `mma_roles` no banco

## Objetivo do Sprint

- CRUD de Eventos
- Enrollment de pessoas no evento (com Event ID automático: F.001, C.002, etc.)
- Vinculação de Corners a Fighters
- Definição de necessidades logísticas por pessoa

---

## TAREFA 1: Criar Serviço de Events

Criar `src/lib/services/events.ts`:

```typescript
import { createClient } from '@/lib/supabase/client'
import type { Event, EventStatus } from '@/types/database'

const supabase = createClient()

export interface EventFilters {
  status?: EventStatus
  search?: string
}

export async function getEvents(filters: EventFilters = {}): Promise<Event[]> {
  let query = supabase
    .from('mma_events')
    .select('*')
    .order('event_date', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function getEventById(id: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('mma_events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export interface EventFormData {
  name: string
  code?: string
  event_date: string
  event_end_date?: string
  city?: string
  country?: string
  venue?: string
  main_airport?: string
  checkin_margin_hours?: number
  checkout_margin_hours?: number
  status?: EventStatus
  notes?: string
}

export async function createEvent(formData: EventFormData): Promise<Event> {
  const { data, error } = await supabase
    .from('mma_events')
    .insert({
      ...formData,
      checkin_margin_hours: formData.checkin_margin_hours || 3,
      checkout_margin_hours: formData.checkout_margin_hours || 4,
      status: formData.status || 'planning',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateEvent(id: string, formData: Partial<EventFormData>): Promise<Event> {
  const { data, error } = await supabase
    .from('mma_events')
    .update(formData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('mma_events')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getActiveEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('mma_events')
    .select('*')
    .in('status', ['planning', 'active'])
    .order('event_date', { ascending: true })

  if (error) throw error
  return data || []
}
```

---

## TAREFA 2: Criar Serviço de Enrollments

Criar `src/lib/services/enrollments.ts`:

```typescript
import { createClient } from '@/lib/supabase/client'
import type { Enrollment, Role, Person, TransportNeed, FlightType } from '@/types/database'

const supabase = createClient()

export interface EnrollmentWithDetails extends Enrollment {
  person: Person
  role: Role
}

export async function getEnrollmentsByEvent(eventId: string): Promise<EnrollmentWithDetails[]> {
  const { data, error } = await supabase
    .from('mma_enrollments')
    .select(`
      *,
      person:mma_people(*),
      role:mma_roles(*)
    `)
    .eq('event_id', eventId)
    .eq('status', 'active')
    .order('event_code_seq', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getEnrollmentById(id: string): Promise<EnrollmentWithDetails | null> {
  const { data, error } = await supabase
    .from('mma_enrollments')
    .select(`
      *,
      person:mma_people(*),
      role:mma_roles(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export interface EnrollmentFormData {
  event_id: string
  person_id: string
  role_id: string
  needs_flight?: FlightType | 'none'
  needs_visa?: boolean
  needs_hotel?: boolean
  needs_transport?: TransportNeed
}

export async function createEnrollment(formData: EnrollmentFormData): Promise<Enrollment> {
  const { data, error } = await supabase
    .from('mma_enrollments')
    .insert({
      ...formData,
      needs_flight: formData.needs_flight || 'none',
      needs_visa: formData.needs_visa || false,
      needs_hotel: formData.needs_hotel || false,
      needs_transport: formData.needs_transport || 'none',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateEnrollment(id: string, formData: Partial<EnrollmentFormData>): Promise<Enrollment> {
  const { data, error } = await supabase
    .from('mma_enrollments')
    .update(formData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function cancelEnrollment(id: string, reason?: string): Promise<void> {
  const { error } = await supabase
    .from('mma_enrollments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
    })
    .eq('id', id)

  if (error) throw error
}

export async function getRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from('mma_roles')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data || []
}

export async function getAvailablePeopleForEvent(eventId: string): Promise<Person[]> {
  // Get people already enrolled
  const { data: enrolled } = await supabase
    .from('mma_enrollments')
    .select('person_id')
    .eq('event_id', eventId)
    .eq('status', 'active')

  const enrolledIds = enrolled?.map(e => e.person_id) || []

  // Get all people not enrolled
  let query = supabase
    .from('mma_people')
    .select('*')
    .order('compiled_name')

  if (enrolledIds.length > 0) {
    query = query.not('id', 'in', `(${enrolledIds.join(',')})`)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Corner linking
export async function linkCornerToFighter(fighterEnrollmentId: string, cornerEnrollmentId: string): Promise<void> {
  const { error } = await supabase
    .from('mma_enrollment_corners')
    .insert({
      fighter_enrollment_id: fighterEnrollmentId,
      corner_enrollment_id: cornerEnrollmentId,
    })

  if (error) throw error
}

export async function unlinkCornerFromFighter(fighterEnrollmentId: string, cornerEnrollmentId: string): Promise<void> {
  const { error } = await supabase
    .from('mma_enrollment_corners')
    .delete()
    .eq('fighter_enrollment_id', fighterEnrollmentId)
    .eq('corner_enrollment_id', cornerEnrollmentId)

  if (error) throw error
}

export async function getCornersByFighter(fighterEnrollmentId: string): Promise<EnrollmentWithDetails[]> {
  const { data, error } = await supabase
    .from('mma_enrollment_corners')
    .select(`
      corner:corner_enrollment_id(
        *,
        person:mma_people(*),
        role:mma_roles(*)
      )
    `)
    .eq('fighter_enrollment_id', fighterEnrollmentId)

  if (error) throw error
  return data?.map((d: any) => d.corner) || []
}

export async function getFightersByCorner(cornerEnrollmentId: string): Promise<EnrollmentWithDetails[]> {
  const { data, error } = await supabase
    .from('mma_enrollment_corners')
    .select(`
      fighter:fighter_enrollment_id(
        *,
        person:mma_people(*),
        role:mma_roles(*)
      )
    `)
    .eq('corner_enrollment_id', cornerEnrollmentId)

  if (error) throw error
  return data?.map((d: any) => d.fighter) || []
}

// Stats
export async function getEnrollmentStats(eventId: string) {
  const { data, error } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      role:mma_roles(code),
      needs_flight,
      needs_visa,
      needs_hotel,
      needs_transport
    `)
    .eq('event_id', eventId)
    .eq('status', 'active')

  if (error) throw error

  const stats = {
    total: data?.length || 0,
    fighters: data?.filter((e: any) => e.role?.code === 'F').length || 0,
    corners: data?.filter((e: any) => e.role?.code === 'C').length || 0,
    staff: data?.filter((e: any) => e.role?.code === 'ST').length || 0,
    guests: data?.filter((e: any) => e.role?.code === 'G').length || 0,
    needsFlight: data?.filter((e: any) => e.needs_flight !== 'none').length || 0,
    needsVisa: data?.filter((e: any) => e.needs_visa).length || 0,
    needsHotel: data?.filter((e: any) => e.needs_hotel).length || 0,
    needsTransport: data?.filter((e: any) => e.needs_transport !== 'none').length || 0,
  }

  return stats
}
```

---

## TAREFA 3: Criar Schema de Validação de Event

Criar `src/lib/validations/event.ts`:

```typescript
import { z } from 'zod'

export const eventSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  code: z.string().max(20).optional().nullable(),
  event_date: z.string().min(1, 'Data é obrigatória'),
  event_end_date: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  venue: z.string().max(200).optional().nullable(),
  main_airport: z.string().max(10).optional().nullable(),
  checkin_margin_hours: z.coerce.number().min(0).max(24).optional(),
  checkout_margin_hours: z.coerce.number().min(0).max(24).optional(),
  status: z.enum(['planning', 'active', 'completed', 'cancelled']).optional(),
  notes: z.string().optional().nullable(),
})

export type EventSchema = z.infer<typeof eventSchema>

export const enrollmentSchema = z.object({
  event_id: z.string().uuid(),
  person_id: z.string().uuid(),
  role_id: z.string().uuid(),
  needs_flight: z.enum(['none', 'arrival_only', 'departure_only', 'full']).optional(),
  needs_visa: z.boolean().optional(),
  needs_hotel: z.boolean().optional(),
  needs_transport: z.enum(['none', 'arrival', 'departure', 'both']).optional(),
})

export type EnrollmentSchema = z.infer<typeof enrollmentSchema>
```

---

## TAREFA 4: Criar Componente EventForm

Criar `src/components/forms/event-form.tsx`:

```typescript
'use client'

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
import { eventSchema, type EventSchema } from '@/lib/validations/event'
import type { Event } from '@/types/database'

interface EventFormProps {
  event?: Event | null
  onSubmit: (data: EventSchema) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planejamento' },
  { value: 'active', label: 'Ativo' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
]

const COUNTRIES = [
  'UAE', 'BRAZIL', 'USA', 'SAUDI ARABIA', 'UK', 'AUSTRALIA',
  'JAPAN', 'SINGAPORE', 'THAILAND', 'CHINA',
]

export function EventForm({ event, onSubmit, onCancel, loading }: EventFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventSchema>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: event?.name || '',
      code: event?.code || '',
      event_date: event?.event_date || '',
      event_end_date: event?.event_end_date || '',
      city: event?.city || '',
      country: event?.country || '',
      venue: event?.venue || '',
      main_airport: event?.main_airport || '',
      checkin_margin_hours: event?.checkin_margin_hours || 3,
      checkout_margin_hours: event?.checkout_margin_hours || 4,
      status: event?.status || 'planning',
      notes: event?.notes || '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Informações Básicas */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Informações Básicas
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Evento *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="UFC 300"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Código</Label>
            <Input
              id="code"
              {...register('code')}
              placeholder="UAEW65"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="event_date">Data Início *</Label>
            <Input
              id="event_date"
              type="date"
              {...register('event_date')}
            />
            {errors.event_date && (
              <p className="text-sm text-red-500">{errors.event_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_end_date">Data Fim</Label>
            <Input
              id="event_end_date"
              type="date"
              {...register('event_end_date')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={watch('status') || 'planning'}
            onValueChange={(value: any) => setValue('status', value)}
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
      </div>

      {/* Local */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Local
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              {...register('city')}
              placeholder="Abu Dhabi"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">País</Label>
            <Select
              value={watch('country') || ''}
              onValueChange={(value) => setValue('country', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="venue">Local/Arena</Label>
            <Input
              id="venue"
              {...register('venue')}
              placeholder="Etihad Arena"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="main_airport">Aeroporto Principal</Label>
            <Input
              id="main_airport"
              {...register('main_airport')}
              placeholder="AUH"
              maxLength={10}
            />
          </div>
        </div>
      </div>

      {/* Configurações de Hotel */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Configurações de Hotel
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="checkin_margin_hours">
              Margem Check-in (horas após pouso)
            </Label>
            <Input
              id="checkin_margin_hours"
              type="number"
              min={0}
              max={24}
              {...register('checkin_margin_hours')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkout_margin_hours">
              Margem Check-out (horas antes decolagem)
            </Label>
            <Input
              id="checkout_margin_hours"
              type="number"
              min={0}
              max={24}
              {...register('checkout_margin_hours')}
            />
          </div>
        </div>
      </div>

      {/* Notas */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Informações adicionais..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : event ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
```

---

## TAREFA 5: Criar Componente EnrollmentForm

Criar `src/components/forms/enrollment-form.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { enrollmentSchema, type EnrollmentSchema } from '@/lib/validations/event'
import { getAvailablePeopleForEvent, getRoles } from '@/lib/services/enrollments'
import { getFighterPhotoUrl } from '@/lib/utils'
import type { Person, Role, Enrollment } from '@/types/database'

interface EnrollmentFormProps {
  eventId: string
  enrollment?: Enrollment | null
  onSubmit: (data: EnrollmentSchema) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const FLIGHT_OPTIONS = [
  { value: 'none', label: 'Não precisa' },
  { value: 'arrival_only', label: 'Apenas chegada' },
  { value: 'departure_only', label: 'Apenas partida' },
  { value: 'full', label: 'Ida e volta' },
]

const TRANSPORT_OPTIONS = [
  { value: 'none', label: 'Não precisa' },
  { value: 'arrival', label: 'Apenas chegada' },
  { value: 'departure', label: 'Apenas partida' },
  { value: 'both', label: 'Chegada e partida' },
]

export function EnrollmentForm({
  eventId,
  enrollment,
  onSubmit,
  onCancel,
  loading,
}: EnrollmentFormProps) {
  const [people, setPeople] = useState<Person[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EnrollmentSchema>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      event_id: eventId,
      person_id: enrollment?.person_id || '',
      role_id: enrollment?.role_id || '',
      needs_flight: enrollment?.needs_flight || 'none',
      needs_visa: enrollment?.needs_visa || false,
      needs_hotel: enrollment?.needs_hotel || false,
      needs_transport: enrollment?.needs_transport || 'none',
    },
  })

  useEffect(() => {
    async function loadData() {
      try {
        const [peopleData, rolesData] = await Promise.all([
          getAvailablePeopleForEvent(eventId),
          getRoles(),
        ])
        setPeople(peopleData)
        setRoles(rolesData)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [eventId])

  const handlePersonChange = (personId: string) => {
    setValue('person_id', personId)
    const person = people.find(p => p.id === personId)
    setSelectedPerson(person || null)
  }

  const personId = watch('person_id')
  const needsVisa = watch('needs_visa')
  const needsHotel = watch('needs_hotel')

  if (loadingData) {
    return <div className="py-8 text-center text-muted-foreground">Carregando...</div>
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Pessoa */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Pessoa
        </h3>

        <div className="space-y-2">
          <Label>Selecionar Pessoa *</Label>
          <Select
            value={personId}
            onValueChange={handlePersonChange}
            disabled={!!enrollment}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma pessoa" />
            </SelectTrigger>
            <SelectContent>
              {people.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      {person.fighter_id && (
                        <AvatarImage src={getFighterPhotoUrl(person.fighter_id)} />
                      )}
                      <AvatarFallback className="text-xs">
                        {person.name[0]}{person.surname[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span>{person.compiled_name}</span>
                    {person.nationality && (
                      <span className="text-muted-foreground">({person.nationality})</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.person_id && (
            <p className="text-sm text-red-500">Pessoa é obrigatória</p>
          )}
        </div>

        {selectedPerson && (
          <div className="p-4 bg-muted rounded-lg flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {selectedPerson.fighter_id && (
                <AvatarImage src={getFighterPhotoUrl(selectedPerson.fighter_id)} />
              )}
              <AvatarFallback>
                {selectedPerson.name[0]}{selectedPerson.surname[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{selectedPerson.compiled_name}</p>
              {selectedPerson.event_name && (
                <p className="text-sm text-muted-foreground">{selectedPerson.event_name}</p>
              )}
              {selectedPerson.nationality && (
                <p className="text-sm text-muted-foreground">{selectedPerson.nationality}</p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Role *</Label>
          <Select
            value={watch('role_id')}
            onValueChange={(value) => setValue('role_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o role" />
            </SelectTrigger>
            <SelectContent>
              {roles.filter(r => r.is_base).map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name} ({role.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.role_id && (
            <p className="text-sm text-red-500">Role é obrigatório</p>
          )}
        </div>
      </div>

      {/* Necessidades Logísticas */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Necessidades Logísticas
        </h3>

        <div className="space-y-2">
          <Label>Aéreo</Label>
          <Select
            value={watch('needs_flight') || 'none'}
            onValueChange={(value: any) => setValue('needs_flight', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FLIGHT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="needs_visa"
            checked={needsVisa}
            onCheckedChange={(checked) => setValue('needs_visa', !!checked)}
          />
          <Label htmlFor="needs_visa" className="cursor-pointer">
            Precisa de Visto
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="needs_hotel"
            checked={needsHotel}
            onCheckedChange={(checked) => setValue('needs_hotel', !!checked)}
          />
          <Label htmlFor="needs_hotel" className="cursor-pointer">
            Precisa de Hotel
          </Label>
        </div>

        <div className="space-y-2">
          <Label>Transporte</Label>
          <Select
            value={watch('needs_transport') || 'none'}
            onValueChange={(value: any) => setValue('needs_transport', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSPORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : enrollment ? 'Atualizar' : 'Adicionar'}
        </Button>
      </div>
    </form>
  )
}
```

---

## TAREFA 6: Criar Componente EnrollmentsTable

Criar `src/components/tables/enrollments-table.tsx`:

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
  MoreHorizontal,
  Pencil,
  UserMinus,
  Plane,
  FileText,
  Building2,
  Car,
  Check,
  X,
} from 'lucide-react'
import type { EnrollmentWithDetails } from '@/lib/services/enrollments'
import { getFighterPhotoUrl } from '@/lib/utils'

interface EnrollmentsTableProps {
  enrollments: EnrollmentWithDetails[]
  onEdit: (enrollment: EnrollmentWithDetails) => void
  onCancel: (enrollment: EnrollmentWithDetails) => void
  canEdit?: boolean
}

const ROLE_COLORS: Record<string, string> = {
  F: 'bg-red-500',
  C: 'bg-blue-500',
  G: 'bg-purple-500',
  ST: 'bg-green-500',
}

export function EnrollmentsTable({
  enrollments,
  onEdit,
  onCancel,
  canEdit = true,
}: EnrollmentsTableProps) {
  const NeedIcon = ({ active }: { active: boolean }) =>
    active ? (
      <Check className="h-4 w-4 text-green-500" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground" />
    )

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">ID</TableHead>
          <TableHead className="w-12"></TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-center">
            <Plane className="h-4 w-4 mx-auto" />
          </TableHead>
          <TableHead className="text-center">
            <FileText className="h-4 w-4 mx-auto" />
          </TableHead>
          <TableHead className="text-center">
            <Building2 className="h-4 w-4 mx-auto" />
          </TableHead>
          <TableHead className="text-center">
            <Car className="h-4 w-4 mx-auto" />
          </TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {enrollments.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
              Nenhuma pessoa inscrita neste evento
            </TableCell>
          </TableRow>
        ) : (
          enrollments.map((enrollment) => (
            <TableRow key={enrollment.id}>
              <TableCell>
                <Badge variant="outline" className="font-mono">
                  {enrollment.event_code}
                </Badge>
              </TableCell>
              <TableCell>
                <Avatar className="h-8 w-8">
                  {enrollment.person?.fighter_id && (
                    <AvatarImage
                      src={getFighterPhotoUrl(enrollment.person.fighter_id)}
                      alt={enrollment.person?.compiled_name}
                    />
                  )}
                  <AvatarFallback className="text-xs">
                    {enrollment.person?.name[0]}
                    {enrollment.person?.surname[0]}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{enrollment.person?.compiled_name}</p>
                  {enrollment.person?.event_name && (
                    <p className="text-sm text-muted-foreground">
                      {enrollment.person.event_name}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={ROLE_COLORS[enrollment.role?.code || ''] || 'bg-gray-500'}>
                  {enrollment.role?.name}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <NeedIcon active={enrollment.needs_flight !== 'none'} />
              </TableCell>
              <TableCell className="text-center">
                <NeedIcon active={enrollment.needs_visa} />
              </TableCell>
              <TableCell className="text-center">
                <NeedIcon active={enrollment.needs_hotel} />
              </TableCell>
              <TableCell className="text-center">
                <NeedIcon active={enrollment.needs_transport !== 'none'} />
              </TableCell>
              <TableCell>
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(enrollment)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={() => onCancel(enrollment)}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Cancelar Inscrição
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
```

---

## TAREFA 7: Criar Página de Events

Criar `src/app/(dashboard)/events/page.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EventForm } from '@/components/forms/event-form'
import { Plus, Search, Calendar, MapPin, Users } from 'lucide-react'
import { toast } from 'sonner'
import { getEvents, createEvent, updateEvent, type EventFilters, type EventFormData } from '@/lib/services/events'
import { getEnrollmentStats } from '@/lib/services/enrollments'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate } from '@/lib/utils'
import type { Event, EventStatus } from '@/types/database'

const STATUS_COLORS: Record<EventStatus, string> = {
  planning: 'bg-blue-500',
  active: 'bg-green-500',
  completed: 'bg-gray-500',
  cancelled: 'bg-red-500',
}

const STATUS_LABELS: Record<EventStatus, string> = {
  planning: 'Planejamento',
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

export default function EventsPage() {
  const router = useRouter()
  const { canEdit } = usePermissions()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<EventFilters>({})
  const [stats, setStats] = useState<Record<string, any>>({})

  // Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getEvents(filters)
      setEvents(data)

      // Fetch stats for each event
      const statsPromises = data.map(async (event) => {
        const eventStats = await getEnrollmentStats(event.id)
        return { eventId: event.id, stats: eventStats }
      })
      const statsResults = await Promise.all(statsPromises)
      const statsMap: Record<string, any> = {}
      statsResults.forEach(({ eventId, stats }) => {
        statsMap[eventId] = stats
      })
      setStats(statsMap)
    } catch (error) {
      toast.error('Erro ao carregar eventos')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleNewEvent = () => {
    setEditingEvent(null)
    setIsDrawerOpen(true)
  }

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event)
    setIsDrawerOpen(true)
  }

  const handleSubmit = async (data: EventFormData) => {
    setSaving(true)
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, data)
        toast.success('Evento atualizado com sucesso')
      } else {
        await createEvent(data)
        toast.success('Evento criado com sucesso')
      }
      setIsDrawerOpen(false)
      fetchEvents()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar evento')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenEvent = (eventId: string) => {
    router.push(`/events/${eventId}`)
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Eventos"
        description="Gerencie os eventos de MMA"
        actions={
          canEdit('events') && (
            <Button onClick={handleNewEvent}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Evento
            </Button>
          )
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar eventos..."
                    className="pl-9"
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
              </div>

              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  setFilters(prev => ({
                    ...prev,
                    status: value === 'all' ? undefined : value as EventStatus,
                  }))
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="planning">Planejamento</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum evento encontrado
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Card
                key={event.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleOpenEvent(event.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{event.name}</CardTitle>
                      {event.code && (
                        <CardDescription>{event.code}</CardDescription>
                      )}
                    </div>
                    <Badge className={STATUS_COLORS[event.status]}>
                      {STATUS_LABELS[event.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(event.event_date)}</span>
                    {event.event_end_date && (
                      <span>- {formatDate(event.event_end_date)}</span>
                    )}
                  </div>

                  {(event.city || event.country) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {[event.city, event.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}

                  {stats[event.id] && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        {stats[event.id].total} pessoas
                        ({stats[event.id].fighters} F,
                        {stats[event.id].corners} C,
                        {stats[event.id].staff} ST,
                        {stats[event.id].guests} G)
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingEvent ? 'Editar Evento' : 'Novo Evento'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <EventForm
              event={editingEvent}
              onSubmit={handleSubmit}
              onCancel={() => setIsDrawerOpen(false)}
              loading={saving}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
```

---

## TAREFA 8: Criar Página de Detalhes do Evento

Criar `src/app/(dashboard)/events/[id]/page.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { EnrollmentsTable } from '@/components/tables/enrollments-table'
import { EnrollmentForm } from '@/components/forms/enrollment-form'
import { EventForm } from '@/components/forms/event-form'
import {
  Plus,
  Settings,
  ArrowLeft,
  Users,
  Plane,
  FileText,
  Building2,
  Car,
} from 'lucide-react'
import { toast } from 'sonner'
import { getEventById, updateEvent, type EventFormData } from '@/lib/services/events'
import {
  getEnrollmentsByEvent,
  createEnrollment,
  updateEnrollment,
  cancelEnrollment,
  getEnrollmentStats,
  type EnrollmentWithDetails,
} from '@/lib/services/enrollments'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate } from '@/lib/utils'
import type { Event } from '@/types/database'
import type { EnrollmentSchema } from '@/lib/validations/event'

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const { canEdit } = usePermissions()

  const [event, setEvent] = useState<Event | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Drawers
  const [isEventDrawerOpen, setIsEventDrawerOpen] = useState(false)
  const [isEnrollmentDrawerOpen, setIsEnrollmentDrawerOpen] = useState(false)
  const [editingEnrollment, setEditingEnrollment] = useState<EnrollmentWithDetails | null>(null)
  const [saving, setSaving] = useState(false)

  // Cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [enrollmentToCancel, setEnrollmentToCancel] = useState<EnrollmentWithDetails | null>(null)

  const fetchData = useCallback(async () => {
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
    } catch (error) {
      toast.error('Erro ao carregar evento')
      router.push('/events')
    } finally {
      setLoading(false)
    }
  }, [eventId, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleUpdateEvent = async (data: EventFormData) => {
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

  const handleNewEnrollment = () => {
    setEditingEnrollment(null)
    setIsEnrollmentDrawerOpen(true)
  }

  const handleEditEnrollment = (enrollment: EnrollmentWithDetails) => {
    setEditingEnrollment(enrollment)
    setIsEnrollmentDrawerOpen(true)
  }

  const handleCancelClick = (enrollment: EnrollmentWithDetails) => {
    setEnrollmentToCancel(enrollment)
    setCancelDialogOpen(true)
  }

  const handleCancelConfirm = async () => {
    if (!enrollmentToCancel) return

    try {
      await cancelEnrollment(enrollmentToCancel.id)
      toast.success('Inscrição cancelada')
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar inscrição')
    } finally {
      setCancelDialogOpen(false)
      setEnrollmentToCancel(null)
    }
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

  // Filter enrollments by role
  const fighters = enrollments.filter(e => e.role?.code === 'F')
  const corners = enrollments.filter(e => e.role?.code === 'C')
  const staff = enrollments.filter(e => e.role?.code === 'ST')
  const guests = enrollments.filter(e => e.role?.code === 'G')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!event) {
    return null
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title={event.name}
        description={`${formatDate(event.event_date)} • ${event.city || ''}, ${event.country || ''}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/events')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            {canEdit('events') && (
              <>
                <Button variant="outline" onClick={() => setIsEventDrawerOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </Button>
                <Button onClick={handleNewEnrollment}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Pessoa
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {stats.total}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Aéreo</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  {stats.needsFlight}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Visto</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {stats.needsVisa}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Hotel</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {stats.needsHotel}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Transporte</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  {stats.needsTransport}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Enrollments Tabs */}
        <Card>
          <Tabs defaultValue="all">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pessoas Inscritas</CardTitle>
                <TabsList>
                  <TabsTrigger value="all">
                    Todos ({enrollments.length})
                  </TabsTrigger>
                  <TabsTrigger value="fighters">
                    Fighters ({fighters.length})
                  </TabsTrigger>
                  <TabsTrigger value="corners">
                    Corners ({corners.length})
                  </TabsTrigger>
                  <TabsTrigger value="staff">
                    Staff ({staff.length})
                  </TabsTrigger>
                  <TabsTrigger value="guests">
                    Guests ({guests.length})
                  </TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <TabsContent value="all" className="m-0">
                <EnrollmentsTable
                  enrollments={enrollments}
                  onEdit={handleEditEnrollment}
                  onCancel={handleCancelClick}
                  canEdit={canEdit('events')}
                />
              </TabsContent>
              <TabsContent value="fighters" className="m-0">
                <EnrollmentsTable
                  enrollments={fighters}
                  onEdit={handleEditEnrollment}
                  onCancel={handleCancelClick}
                  canEdit={canEdit('events')}
                />
              </TabsContent>
              <TabsContent value="corners" className="m-0">
                <EnrollmentsTable
                  enrollments={corners}
                  onEdit={handleEditEnrollment}
                  onCancel={handleCancelClick}
                  canEdit={canEdit('events')}
                />
              </TabsContent>
              <TabsContent value="staff" className="m-0">
                <EnrollmentsTable
                  enrollments={staff}
                  onEdit={handleEditEnrollment}
                  onCancel={handleCancelClick}
                  canEdit={canEdit('events')}
                />
              </TabsContent>
              <TabsContent value="guests" className="m-0">
                <EnrollmentsTable
                  enrollments={guests}
                  onEdit={handleEditEnrollment}
                  onCancel={handleCancelClick}
                  canEdit={canEdit('events')}
                />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Event Settings Drawer */}
      <Sheet open={isEventDrawerOpen} onOpenChange={setIsEventDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Configurações do Evento</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <EventForm
              event={event}
              onSubmit={handleUpdateEvent}
              onCancel={() => setIsEventDrawerOpen(false)}
              loading={saving}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Enrollment Drawer */}
      <Sheet open={isEnrollmentDrawerOpen} onOpenChange={setIsEnrollmentDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingEnrollment ? 'Editar Inscrição' : 'Adicionar Pessoa'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <EnrollmentForm
              eventId={eventId}
              enrollment={editingEnrollment}
              onSubmit={handleSubmitEnrollment}
              onCancel={() => setIsEnrollmentDrawerOpen(false)}
              loading={saving}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Inscrição</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar a inscrição de{' '}
              {enrollmentToCancel?.person?.compiled_name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Não
            </Button>
            <Button variant="destructive" onClick={handleCancelConfirm}>
              Sim, Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

---

## VERIFICAÇÃO FINAL

Após executar todas as tarefas:

```bash
pnpm dev
```

Deve:
1. Acessar `/events` e ver listagem de eventos
2. Criar novo evento
3. Clicar no evento e ver página de detalhes
4. Adicionar pessoa ao evento (enrollment)
5. Ver Event ID gerado automaticamente (F.001, C.002, etc.)
6. Editar necessidades logísticas
7. Cancelar inscrição

---

## Critérios de Aceitação

- [ ] CRUD de eventos funciona
- [ ] Página de detalhes do evento funciona
- [ ] Enrollment de pessoas funciona
- [ ] Event ID gerado automaticamente (F.001, C.002, etc.)
- [ ] Filtro por role (Fighters, Corners, Staff, Guests)
- [ ] Necessidades logísticas (aéreo, visto, hotel, transporte)
- [ ] Cancelamento de inscrição funciona
- [ ] Stats de enrolled aparecem no card do evento

---

## Arquivos Criados/Modificados

```
src/
├── lib/
│   ├── services/
│   │   ├── events.ts (novo)
│   │   └── enrollments.ts (novo)
│   └── validations/
│       └── event.ts (novo)
├── components/
│   ├── forms/
│   │   ├── event-form.tsx (novo)
│   │   └── enrollment-form.tsx (novo)
│   └── tables/
│       └── enrollments-table.tsx (novo)
└── app/(dashboard)/events/
    ├── page.tsx (novo)
    └── [id]/
        └── page.tsx (novo)
```

---

## Próximo Sprint

**SPRINT_03**: Flights (CRUD de voos, vinculação com enrollment)
