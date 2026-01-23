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
import type { FlightType } from '@/types/database'

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
      status: (flight?.status as 'pending' | 'booked' | 'confirmed' | 'cancelled') || 'pending',
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
