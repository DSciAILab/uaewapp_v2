import { z } from 'zod'

const visaStatusSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
])

export const visaSchema = z.object({
  enrollment_id: z.string().uuid(),
  passport_name: z.string().max(200).optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  departure_airport: z.string().max(10).optional().nullable(),
  document_link: z.string().url().optional().nullable().or(z.literal('')),
  status: visaStatusSchema.optional(),
  is_done: z.boolean().optional(),
  notes: z.string().optional().nullable(),
})

export type VisaSchema = z.infer<typeof visaSchema>
