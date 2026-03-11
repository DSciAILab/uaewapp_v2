FASE 2: Hotels (Sprint 05 — Parte 1)
O que o schema real tem:

mma_hotels com: enrollment_id, suggested_checkin_date, suggested_checkin_time, suggested_checkout_date, suggested_checkout_time, reservation_number, checkin_date, checkin_time, checkout_date, checkout_time, has_divergence, divergence_type (TEXT array), divergence_approved, divergence_approved_by, divergence_approved_at, status (pending/reserved/confirmed/cancelled).

O que o serviço assume que existe (e não existe):

calculated_checkin, calculated_checkout, actual_checkin, actual_checkout, hotel_name, room_type, divergence_reason, approved_by, approved_at, event_id.

O que fazer:

Reescrever hotel-service.ts para usar os campos reais. O hotel não tem event_id directo, o evento vem via enrollment_id → mma_enrollments.event_id. A lógica de divergência usa suggested_* vs checkin_*/checkout_* em vez de calculated_* vs actual_*. O hotel-calculations.ts também precisa de ser ajustado.

Actualizar o tipo em src/types/hotel.ts para reflectir o schema real. Actualizar o formulário e a tabela para usar os campos correctos.

