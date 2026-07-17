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
import { XCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Combobox } from '@/components/ui/combobox'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { enrollmentSchema, type EnrollmentSchema } from '@/lib/validations/event'
import { getAvailablePeopleForEvent, getRoles } from '@/lib/services/enrollments'
import { getFighterPhotoUrl } from '@/lib/utils'
import type { Person, Role, Enrollment } from '@/types/database'
import { Plane, PlaneLanding, PlaneTakeoff, Car, Bus, Users, ShieldCheck, UserCircle, Briefcase } from 'lucide-react'

interface EnrollmentFormProps {
  eventId: string
  enrollment?: Enrollment | null
  onSubmit: (data: EnrollmentSchema) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const FLIGHT_OPTIONS = [
  { value: 'none', label: 'Not needed', icon: XCircle },
  { value: 'arrival_only', label: 'Arrival', icon: PlaneLanding },
  { value: 'departure_only', label: 'Departure', icon: PlaneTakeoff },
  { value: 'full', label: 'Round Trip', icon: Plane },
]

const TRANSPORT_OPTIONS = [
  { value: 'none', label: 'Not needed', icon: XCircle },
  { value: 'arrival', label: 'Arrival', icon: Car },
  { value: 'departure', label: 'Departure', icon: Car },
  { value: 'both', label: 'Both', icon: Bus },
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
      corner: (enrollment as any)?.corner || null,
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
        
        // If editing, find the selected person
        if (enrollment?.person_id) {
          const person = peopleData.find(p => p.id === enrollment.person_id)
          if (person) setSelectedPerson(person)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [eventId, enrollment])

  const handlePersonChange = (personId: string) => {
    setValue('person_id', personId)
    const person = people.find(p => p.id === personId)
    setSelectedPerson(person || null)
  }

  const personId = watch('person_id')
  const needsVisa = watch('needs_visa')
  const needsHotel = watch('needs_hotel')

  if (loadingData) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>
  }

  const personOptions = people.map((person) => ({
    value: person.id,
    label: person.compiled_name || `${person.name} ${person.surname}`,
    render: (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          {person.appadmin_fighter_id && <AvatarImage src={getFighterPhotoUrl(person.appadmin_fighter_id)} />}
          <AvatarFallback className="text-xs">
            {person.name?.[0]?.toUpperCase()}
            {person.surname ? person.surname[0].toUpperCase() : ''}
          </AvatarFallback>
        </Avatar>
        <span>{person.compiled_name || `${person.name} ${person.surname}`}</span>
      </div>
    ),
  }))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Person</h3>
        <div className="space-y-2">
          <Label>Select Person *</Label>
          <Combobox
            options={personOptions}
            value={personId}
            onValueChange={handlePersonChange}
            placeholder="Select a person"
            searchPlaceholder="Search person..."
            emptyText="No person found."
            disabled={!!enrollment}
          />
        </div>

        {selectedPerson?.appadmin_fighter_id && (
          <div className="flex justify-center p-4 bg-muted rounded-lg">
            <Avatar className="h-20 w-20">
              <AvatarImage src={getFighterPhotoUrl(selectedPerson.appadmin_fighter_id)} />
              <AvatarFallback>
                {selectedPerson.name?.[0]?.toUpperCase()}
                {selectedPerson.surname ? selectedPerson.surname[0].toUpperCase() : ''}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Role</h3>
        <div className="space-y-2">
          <ToggleGroup 
            type="single" 
            variant="segmented" 
            className="flex-wrap"
            value={watch('role_id')} 
            onValueChange={(v) => v && setValue('role_id', v)}
            disabled={!!enrollment}
          >
            {roles.map((role) => (
              <ToggleGroupItem key={role.id} value={role.id} className="text-[10px] sm:text-xs">
                <div className="flex flex-col items-center gap-1">
                  <span className="font-bold">{role.code}</span>
                  <span className="opacity-70 whitespace-nowrap">{role.name}</span>
                </div>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {roles.find(r => r.id === watch('role_id'))?.code === 'F' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Fight</h3>
          <div className="space-y-2">
            <Label className="text-xs">Corner</Label>
            <ToggleGroup 
              type="single" 
              variant="segmented" 
              value={watch('corner') || 'none'} 
              onValueChange={(v) => setValue('corner', v === 'none' ? null : v)}
            >
              <ToggleGroupItem value="none" className="text-xs">None</ToggleGroupItem>
              <ToggleGroupItem value="Red" className="text-xs text-red-600 font-bold border-red-100 data-[state=on]:bg-red-50">RED</ToggleGroupItem>
              <ToggleGroupItem value="Blue" className="text-xs text-blue-600 font-bold border-blue-100 data-[state=on]:bg-blue-50">BLUE</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Requirements</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Flight Logistics</Label>
            <ToggleGroup 
              type="single" 
              variant="segmented" 
              value={watch('needs_flight') || 'none'} 
              onValueChange={(v) => v && setValue('needs_flight', v as any)}
            >
              {FLIGHT_OPTIONS.map((opt) => (
                <ToggleGroupItem key={opt.value} value={opt.value} className="text-xs">
                  <div className="flex items-center gap-2">
                    <opt.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{opt.label}</span>
                  </div>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="needs_visa" checked={needsVisa} onCheckedChange={(v) => setValue('needs_visa', v as boolean)} />
              <Label htmlFor="needs_visa">Needs Visa</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="needs_hotel" checked={needsHotel} onCheckedChange={(v) => setValue('needs_hotel', v as boolean)} />
              <Label htmlFor="needs_hotel">Needs Hotel</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Ground Transport</Label>
            <ToggleGroup 
              type="single" 
              variant="segmented" 
              value={watch('needs_transport') || 'none'} 
              onValueChange={(v) => v && setValue('needs_transport', v as any)}
            >
              {TRANSPORT_OPTIONS.map((opt) => (
                <ToggleGroupItem key={opt.value} value={opt.value} className="text-xs">
                  <div className="flex items-center gap-2">
                    <opt.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{opt.label}</span>
                  </div>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading || !personId}>
          {loading ? 'Saving...' : enrollment ? 'Update' : 'Add'}
        </Button>
      </div>
    </form>
  )
}
