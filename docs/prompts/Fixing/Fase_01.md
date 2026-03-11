FASE 1: Correcções Transversais (afectam tudo dos Sprints 05-08)
Sem estas correcções, nenhum módulo dos Sprints 05-08 funciona.

1.1 — Criar hook useAuth

Ficheiro: src/hooks/use-auth.ts

Na prática é um alias para useUser. Todos os componentes dos Sprints 05-08 importam useAuth() e esperam um objecto com user.id. Basta criar o ficheiro que re-exporta useUser com o nome certo, ou fazer find-and-replace em todos os ficheiros para mudar useAuth para useUser.

1.2 — Corrigir import de event-service

Todos os ficheiros que importam de @/lib/services/event-service precisam mudar para @/lib/services/events. Isto afecta as páginas de hotels e war-room.

1.3 — Corrigir nome da tabela: mma_enrolled → mma_enrollments

Em todos os serviços dos Sprints 05-08, substituir .from('mma_enrolled') por .from('mma_enrollments'). Isto é um find-and-replace directo.

1.4 — Corrigir full_name → compiled_name

Em todas as queries Supabase que seleccionam full_name da tabela mma_people, mudar para compiled_name. Isto afecta praticamente todos os serviços dos Sprints 05-08.

1.5 — Corrigir acesso ao role

O campo role não está em mma_people. Está em mma_enrollments.role_id → mma_roles.name. As queries precisam de ser ajustadas para fazer o join correcto em vez de assumir que role é campo da pessoa.