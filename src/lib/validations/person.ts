import { z } from 'zod'

export const personSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  surname: z.string().min(1, 'Sobrenome é obrigatório').max(100),
  event_name: z.string().max(200).optional().nullable(),
  fighter_id: z.coerce.number().optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  dob: z.string().optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  passport_number: z.string().max(50).optional().nullable(),
  passport_expiry: z.string().optional().nullable(),
  passport_photo: z.string().url().optional().nullable().or(z.literal('')),
  document_folder: z.string().url().optional().nullable().or(z.literal('')),
  height: z.coerce.number().min(0).max(3).optional().nullable(),
  reach: z.coerce.number().min(0).max(300).optional().nullable(),
})

export type PersonSchema = z.infer<typeof personSchema>
