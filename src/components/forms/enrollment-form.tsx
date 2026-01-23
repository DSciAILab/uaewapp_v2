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

export function EnrollmentForm({ eventId, enrollment, onSubmit, onCancel, loading }: EnrollmentFormProps) {
  const [people, setPeople] = useState<Person[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)

  const form = useForm<EnrollmentSchema>({
    resolver: zodResolver(enrollmentSchema) as any,
    defaultValues: {
      event_id: eventId,
      person_id: enrollment?.person_id || '',
      role_id: enrollment?.role_id || '',
      needs_flight: (enrollment?.needs_flight as any) || 'none',
      needs_visa: enrollment?.needs_visa || false,
      needs_hotel: enrollment?.needs_hotel || false,
      needs_transport: (enrollment?.needs_transport as any) || 'none',
    },
  })

  const { handleSubmit, watch, setValue } = form

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
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Pessoa</h3>
        <div className="space-y-2">
          <Label>Selecionar Pessoa *</Label>
          <Select value={personId} onValueChange={handlePersonChange} disabled={!!enrollment}>
            <SelectTrigger><SelectValue placeholder="Selecione uma pessoa" /></SelectTrigger>
            <SelectContent>
              {people.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      {person.fighter_id && <AvatarImage src={getFighterPhotoUrl(person.fighter_id)} />}
                      <AvatarFallback className="text-xs">{person.name[0]}{person.surname[0]}</AvatarFallback>
                    </Avatar>
                    <span>{person.compiled_name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPerson?.fighter_id && (
          <div className="flex justify-center p-4 bg-muted rounded-lg">
            <Avatar className="h-20 w-20">
              <AvatarImage src={getFighterPhotoUrl(selectedPerson.fighter_id)} />
              <AvatarFallback>{selectedPerson.name[0]}{selectedPerson.surname[0]}</AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Função</h3>
        <div className="space-y-2">
          <Label>Selecionar Função *</Label>
          <Select value={watch('role_id')} onValueChange={(v) => setValue('role_id', v)} disabled={!!enrollment}>
            <SelectTrigger><SelectValue placeholder="Selecione uma função" /></SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-primary/10 px-1.5 py-0.5 rounded">{role.code}</span>
                    <span>{role.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Necessidades</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Aéreo</Label>
            <Select value={watch('needs_flight') || 'none'} onValueChange={(v: any) => setValue('needs_flight', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FLIGHT_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="needs_visa" checked={needsVisa} onCheckedChange={(v) => setValue('needs_visa', v as boolean)} />
              <Label htmlFor="needs_visa">Precisa de Visto</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="needs_hotel" checked={needsHotel} onCheckedChange={(v) => setValue('needs_hotel', v as boolean)} />
              <Label htmlFor="needs_hotel">Precisa de Hotel</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Transporte Terrestre</Label>
            <Select value={watch('needs_transport') || 'none'} onValueChange={(v: any) => setValue('needs_transport', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRANSPORT_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading || !personId}>
          {loading ? 'Salvando...' : enrollment ? 'Atualizar' : 'Adicionar'}
        </Button>
      </div>
    </form>
  )
}
