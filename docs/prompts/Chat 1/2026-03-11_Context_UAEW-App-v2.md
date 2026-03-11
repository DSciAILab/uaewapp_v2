# ==============================
# CONTEXT DOCUMENT — UAEW App v2
# Criado: 2026-03-11 | Última revisão: 2026-03-11
# ==============================
#
# FACTOS DO SISTEMA:
#   - Banco tem 41 tabelas, não 27. O script SQL original
#     (00_DATABASE_FOUNDATION.sql) só cobre 27. As 14
#     adicionais foram criadas directamente no Supabase.
#   - Tabelas duplicadas existem (código usa as novas):
#     mma_athlete_stats (órfã) → mma_fighter_stats (activa)
#     mma_athlete_music (órfã) → mma_entrance_music (activa)
#     mma_transport_drivers (activa) + mma_drivers (órfã)
#     mma_transport_cars (activa) + mma_event_cars (órfã)
#     mma_transport_passengers (activa) + mma_car_passengers (órfã)
#     mma_batch_passengers (original) + mma_batch_participants (nova)
#   - mma_hotels tem campos de ambos os schemas (original +
#     expandido). Campos como calculated_checkin, actual_checkin,
#     hotel_name coexistem com suggested_checkin_date, checkin_date.
#     O serviço usa o schema original (suggested/checkin).
#   - Dashboard usa RPC get_event_dashboard_metrics para
#     métricas agregadas (latência ~40ms vs ~800ms).
#   - Existem 4 RPCs: get_email_from_username,
#     get_event_dashboard_metrics, get_unique_hashtags_for_user,
#     get_user_events_with_counts.
#   - use-auth.ts é um alias simples para use-user.ts.
#     Criado para compatibilidade com componentes dos Sprints 05-08.
#   - mma_people usa compiled_name (GENERATED column).
#     Nunca usar full_name em queries.
#   - Role não é campo de mma_people. Vem via
#     mma_enrollments.role_id → mma_roles.name.
#
# PADRÕES ADOPTADOS:
#   - Serviços usam getClient() = createClient() no topo.
#   - Queries de join usam compiled_name (não full_name).
#   - Role é sempre obtido via join mma_roles(name).
#   - @ts-nocheck usado em serviços complexos com muitos any.
#   - Formulários: Sprints 00-04 usam register/setValue,
#     Sprints 05-08 usam <Form>/<FormField> do shadcn.
#   - Alterações ao código feitas via scripts de terminal
#     (cat > ficheiro << 'EOF' ou sed -i '').
#
# LIÇÕES APRENDIDAS:
#   - Os sprints documentados estão desactualizados. O código
#     real divergiu significativamente. Nunca confiar apenas
#     nos sprints, verificar sempre com grep/cat/find.
#   - O 00_DATABASE_FOUNDATION.sql não é fonte de verdade.
#     O banco real é. Sempre verificar com query ao
#     information_schema.
#   - CarPassenger (mma_transport_passengers) só tem car_id
#     e enrollment_id. Não tem flight_id, transport_type,
#     pickup_location, etc.
#   - EventCar não tem capacity. Usar vehicle_type se
#     precisar mostrar info do veículo.
#   - CarPassengerFormData só tem enrollment_id. Não tem
#     transport_type nem notes.
#
# DEPENDÊNCIAS E INTEGRAÇÕES:
#   - Supabase Auth (email/password + Google OAuth)
#   - Supabase Realtime (channels para war-room e dashboard)
#   - Fighter photos: appadmin.uaewarriors.com/imagecdn/FighterDP
#   - Fight card CSV: Google Sheets (URL pública, pub?output=csv)
#   - SWR para cache do dashboard (dedupingInterval: 10s)
#   - next-themes para dark/light mode
#
# ==============================