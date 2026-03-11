# ==============================
# SESSION STATE — 2026-03-11 06:30
# ==============================
# PROJECTO: MMA Event Management System (uaewapp_v2)
# PROJECT BRIEF: N/A — sessão avulsa, mas candidato a projecto
# CONTEXT DOCUMENT: N/A — ainda não criado
# OBJECTIVO DA SESSÃO: Auditoria completa do sistema, verificação
#   de coerência entre código, tipos, serviços e schema SQL.
#
# ESTADO DO SISTEMA:
#   - Build passa limpo (pnpm build — zero erros)
#   - Stack: Next.js 16.1.4, Supabase, TypeScript, Tailwind, shadcn/ui
#   - Banco: 41 tabelas (14 adicionadas além do script original de 27)
#   - Repo: github.com/DSciAILab/uaewapp_v2 (privado)
#   - RPC get_event_dashboard_metrics existe e é usada pelo dashboard
#
# DECISÕES TOMADAS:
#   - Corrigir transport-service (total_capacity: 0) em vez de
#     remover o campo da página
#   - Reescrever lógica de flight grouping na transport page para
#     usar enrollment_id em vez de flight_id inexistente
#   - Substituir capacity por vehicle_type na logistics-table
#     (campo não existe no EventCar)
#
# FICHEIROS MODIFICADOS:
#   - src/lib/services/transport-service.ts: adicionado total_capacity: 0
#   - src/app/(dashboard)/transport/page.tsx: reescrita lógica de grupos
#   - src/components/pre-event/logistics-table.tsx: 3 correcções de tipo
#
# PROBLEMAS EM ABERTO:
#   - Tabelas duplicadas no banco (mma_athlete_stats vs mma_fighter_stats,
#     mma_athlete_music vs mma_entrance_music, mma_transport_* vs mma_drivers/
#     mma_event_cars/mma_car_passengers). Tabelas "antigas" do script original
#     estão órfãs, código usa as novas. Limpar eventualmente.
#   - Middleware warning: Next.js 16 deprecou "middleware" a favor de "proxy".
#     Funcional mas gerará warning até migração.
#   - Testes de runtime não foram feitos. Build compila mas queries ao
#     Supabase não foram testadas em browser.
#   - 00_DATABASE_FOUNDATION.sql está desactualizado (27 tabelas vs 41 reais).
#     Deveria ser regenerado a partir do banco actual.
#
# LIÇÕES:
#   - Os sprints originais (colados pelo user) estavam desactualizados.
#     O código real já tinha sido corrigido para usar tabelas e campos
#     correctos. A auditoria baseada só nos sprints gerou falsos positivos.
#   - Verificar sempre o código real (grep/cat) antes de diagnosticar.
#     O find + schema SQL são as únicas fontes de verdade.
#   - O banco foi expandido fora do script SQL original. O script não
#     é fonte de verdade, o banco real é.
#
# PRÓXIMOS PASSOS:
#   - Testar cada módulo em runtime (pnpm dev + browser)
#   - Criar Project Brief e Context Document para este projecto
#   - Limpar tabelas órfãs do banco (mma_athlete_stats, mma_athlete_music, etc.)
#   - Regenerar 00_DATABASE_FOUNDATION.sql a partir do banco actual
#   - Migrar middleware para proxy (Next.js 16)
#
# NOTAS:
#   - Repo GitHub: DSciAILab/uaewapp_v2 (tornar privado se ainda público)
#   - User usa Antigravity como editor de código
#   - User prefere scripts de terminal para aplicar alterações
#
# ==============================
# SUGESTÕES DE ACTUALIZAÇÃO AO PROMPT ZERO:
#   Nenhuma.
# ==============================
#
# ARTEFACTOS:
#   - Query para listar tabelas do banco:
#     SELECT table_name FROM information_schema.tables
#     WHERE table_schema = 'public' AND table_name LIKE 'mma_%'
#     ORDER BY table_name;
#
#   - Query para ver colunas de tabelas específicas:
#     SELECT table_name, column_name, data_type, is_nullable
#     FROM information_schema.columns
#     WHERE table_schema = 'public' AND table_name IN ('tabela1','tabela2')
#     ORDER BY table_name, ordinal_position;
#
#   - Query para listar RPCs:
#     SELECT routine_name FROM information_schema.routines
#     WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
#     AND routine_name LIKE 'get_%';
#
# ==============================