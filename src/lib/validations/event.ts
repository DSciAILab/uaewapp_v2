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
  fight_card_csv_url: z.string().url('URL inválida').optional().nullable(),
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
  corner: z.string().optional().nullable(),
})

export type EnrollmentSchema = z.infer<typeof enrollmentSchema>
