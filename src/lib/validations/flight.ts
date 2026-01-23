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
