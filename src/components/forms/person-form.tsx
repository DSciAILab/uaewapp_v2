'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { personSchema, type PersonSchema } from '@/lib/validations/person'
import type { Person } from '@/types/database'
import { getFighterPhotoUrl } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { User, UserRound, HelpCircle } from 'lucide-react'

interface PersonFormProps {
  person?: Person | null
  onSubmit: (data: PersonSchema) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const GENDERS = ['Male', 'Female', 'Other']

const NATIONALITIES = [
  'BRAZIL', 'USA', 'RUSSIA', 'UNITED KINGDOM', 'AUSTRALIA',
  'CANADA', 'MEXICO', 'JAPAN', 'SOUTH KOREA', 'CHINA',
  'FRANCE', 'GERMANY', 'ITALY', 'SPAIN', 'PORTUGAL',
  'ARGENTINA', 'COLOMBIA', 'PERU', 'CHILE', 'ECUADOR',
  'UAE', 'SAUDI ARABIA', 'EGYPT', 'SOUTH AFRICA', 'NIGERIA',
  'INDIA', 'PAKISTAN', 'PHILIPPINES', 'THAILAND', 'INDONESIA',
  'POLAND', 'UKRAINE', 'NETHERLANDS', 'BELGIUM', 'SWEDEN',
  'NORWAY', 'DENMARK', 'FINLAND', 'IRELAND', 'SCOTLAND',
  'NEW ZEALAND', 'KAZAKHSTAN', 'UZBEKISTAN', 'GEORGIA', 'ARMENIA',
]

export function PersonForm({ person, onSubmit, onCancel, loading }: PersonFormProps) {
  const form = useForm<PersonSchema>({
    resolver: zodResolver(personSchema) as any,
    defaultValues: {
      name: person?.name || '',
      surname: person?.surname || '',
      event_name: person?.event_name || '',
      fighter_id: person?.fighter_id || undefined,
      gender: person?.gender || '',
      phone: person?.phone || '',
      dob: person?.dob || '',
      nationality: person?.nationality || '',
      passport_number: person?.passport_number || '',
      passport_expiry: person?.passport_expiry || '',
      passport_photo: person?.passport_photo || '',
      document_folder: person?.document_folder || '',
      height: person?.height || undefined,
      reach: person?.reach || undefined,
    },
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form
  const fighterId = watch('fighter_id')
  const name = watch('name')
  const surname = watch('surname')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {(fighterId !== null && fighterId !== undefined && fighterId !== '') && (
        <div className="flex justify-center">
          <Avatar className="h-24 w-24">
            <AvatarImage src={getFighterPhotoUrl(fighterId)} alt={`${name} ${surname || ''}`} />
            <AvatarFallback>{name?.[0]}{(surname || '')[0]}</AvatarFallback>
          </Avatar>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Identificação</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" {...register('name')} placeholder="João" />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="surname">Sobrenome</Label>
            <Input id="surname" {...register('surname')} placeholder="Silva" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="event_name">Nome de Guerra</Label>
            <Input id="event_name" {...register('event_name')} placeholder="João 'Pitbull' Silva" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fighter_id">Fighter ID</Label>
            <Input id="fighter_id" {...register('fighter_id')} placeholder="595 ou PS1234" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gender">Gênero</Label>
            <ToggleGroup 
              type="single" 
              variant="segmented" 
              value={watch('gender') || ''} 
              onValueChange={(value) => value && setValue('gender', value)}
            >
              <ToggleGroupItem value="Male" className="text-xs gap-2">
                <User className="h-3.5 w-3.5" /> Masculino
              </ToggleGroupItem>
              <ToggleGroupItem value="Female" className="text-xs gap-2">
                <UserRound className="h-3.5 w-3.5" /> Feminino
              </ToggleGroupItem>
              <ToggleGroupItem value="Other" className="text-xs gap-2">
                <HelpCircle className="h-3.5 w-3.5" /> Outro
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" {...register('phone')} placeholder="+55 11 99999-9999" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Documentos</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dob">Data de Nascimento</Label>
            <Input id="dob" type="date" {...register('dob')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nacionalidade</Label>
            <Select value={watch('nationality') || ''} onValueChange={(value) => setValue('nationality', value)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {NATIONALITIES.sort().map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="passport_number">Nº Passaporte</Label>
            <Input id="passport_number" {...register('passport_number')} placeholder="AB123456" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passport_expiry">Validade Passaporte</Label>
            <Input id="passport_expiry" type="date" {...register('passport_expiry')} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="passport_photo">Link Foto Passaporte</Label>
          <Input id="passport_photo" {...register('passport_photo')} placeholder="https://drive.google.com/..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="document_folder">Pasta de Documentos</Label>
          <Input id="document_folder" {...register('document_folder')} placeholder="https://drive.google.com/..." />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Stats Permanentes</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="height">Altura (m)</Label>
            <Input id="height" type="number" step="0.01" {...register('height')} placeholder="1.85" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reach">Envergadura (cm)</Label>
            <Input id="reach" type="number" {...register('reach')} placeholder="190" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : person ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
