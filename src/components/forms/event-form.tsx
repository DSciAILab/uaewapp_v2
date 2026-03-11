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
  const form = useForm<EventSchema>({
    resolver: zodResolver(eventSchema) as any,
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
      fight_card_csv_url: event?.fight_card_csv_url || '',
      notes: event?.notes || '',
    },
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informações Básicas</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Evento *</Label>
            <Input id="name" {...register('name')} placeholder="UFC 300" />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Código</Label>
            <Input id="code" {...register('code')} placeholder="UAEW65" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="event_date">Data Início *</Label>
            <Input id="event_date" type="date" {...register('event_date')} />
            {errors.event_date && <p className="text-sm text-red-500">{errors.event_date.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="event_end_date">Data Fim</Label>
            <Input id="event_end_date" type="date" {...register('event_end_date')} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={watch('status') || 'planning'} onValueChange={(value: any) => setValue('status', value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Local</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" {...register('city')} placeholder="Abu Dhabi" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">País</Label>
            <Select value={watch('country') || ''} onValueChange={(value) => setValue('country', value)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="venue">Local/Arena</Label>
            <Input id="venue" {...register('venue')} placeholder="Etihad Arena" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="main_airport">Aeroporto Principal</Label>
            <Input id="main_airport" {...register('main_airport')} placeholder="AUH" maxLength={10} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Configurações de Hotel</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="checkin_margin_hours">Margem Check-in (horas)</Label>
            <Input id="checkin_margin_hours" type="number" min={0} max={24} {...register('checkin_margin_hours')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkout_margin_hours">Margem Check-out (horas)</Label>
            <Input id="checkout_margin_hours" type="number" min={0} max={24} {...register('checkout_margin_hours')} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Integrações</h3>
        <div className="space-y-2">
          <Label htmlFor="fight_card_csv_url">Google Sheets CSV URL (Fight Card)</Label>
          <Input id="fight_card_csv_url" type="url" {...register('fight_card_csv_url')} placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv" />
          {errors.fight_card_csv_url && <p className="text-sm text-red-500">{errors.fight_card_csv_url.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" {...register('notes')} placeholder="Informações adicionais..." rows={3} />
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : event ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
