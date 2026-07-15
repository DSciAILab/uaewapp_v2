# Medical Clearance Module — Design

**Data:** 2026-05-09
**Autor:** Fernando + Claude
**Status:** Draft (aguardando revisão do usuário)

## Objetivo

Adicionar um módulo dedicado para o time médico do UAEW marcar o status de cada atleta enrolled em um evento como `Pending`, `Cleared by Doctor` ou `Sent to Hospital`. Disponível na dashboard interna (admin/staff) e via link público (médico externo, sem login). Inclui card de resumo agrupado por corner e link de WhatsApp por atleta.

## Motivação

Hoje o app tem o módulo `staging` (`/events/[eventId]/staging`) que cobre check-ins físicos pré-evento (passaporte, uniforme, ônibus, credenciais de coach, etc.). O time médico é uma equipe separada com necessidade distinta: avaliar aptidão clínica para a luta. Misturar essa responsabilidade dentro do staging existente confunde os dois fluxos e dificulta evoluir cada um.

A solução é um módulo paralelo, espelhando a estrutura visual e arquitetural do staging mas com escopo enxuto: uma única decisão por atleta + resumo agregado.

## Escopo

### Dentro do escopo

- Tabela nova `mma_medical_clearance` no Supabase
- Migração SQL: criação da tabela + indexes + RLS policies
- Rota interna `/events/[eventId]/medical` (admin/staff logados)
- Rota pública `/public/medical/[eventId]` (sem login, mesmo padrão do `/public/staging`)
- Card de resumo (counters) por corner: RED / BLUE / TOTAL × Pending / Cleared / Hospital
- Tabela de atletas com colunas: foto, nome, corner, WhatsApp, status (dropdown)
- Dropdown com 3 valores: `Pending` (cinza), `Cleared by Doctor` (verde), `Sent to Hospital` (vermelho)
- Link WhatsApp por linha: ícone clicável → `https://wa.me/{phone}`. Esconde quando atleta não tem phone
- Filtros: search por nome, corner (ALL/RED/BLUE), status (default = "Pending only")
- Realtime via Supabase channel — mudanças aparecem ao vivo nas duas rotas
- Server Action para updates da rota pública (com service role key)
- Entrada "Medical" na sidebar do evento (mesmo padrão de "Staging", "Stats", etc.)

### Fora do escopo (YAGNI)

- ❌ Edição de campo `notes` (coluna existe na tabela, sem UI)
- ❌ Histórico de mudanças / auditoria detalhada
- ❌ Notificações (WhatsApp/email automáticos)
- ❌ Exportação PDF/CSV
- ❌ Role exclusivo "Medical" — qualquer admin/editor edita
- ❌ Bulk actions
- ❌ Anexar exames/imagens
- ❌ Integração com sistema de prontuário externo
- ❌ Trigger no banco para auto-criar registros — usamos upsert no serviço

## Decisões

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Persistência | Tabela nova `mma_medical_clearance` | Coluna em `mma_staging_checkins` (mistura responsabilidades), coluna em `mma_enrollments` (polui modelo de inscrição) |
| Auto-criação de rows | Upsert no client quando médico mexe | Trigger no DB (mais difícil debugar), batch insert ao criar enrollment (precisa migração de dados existentes) |
| Acesso | Interna + link público | Só interna (médico externo não tem login), só público (admin perde controle de role) |
| Permissões | Qualquer admin/editor | Role novo "Medical" — overhead sem ganho real para esse volume |
| Reuso de código | Copiar padrão do staging | Abstrair genérico (premature abstraction, módulos vão divergir) |
| Filtro default | "Pending only" | "All" — usuário pediu que atletas sumam após avaliados |
| Ícone WhatsApp | Esconde quando sem phone | Mostrar desabilitado (visualmente confuso, ocupa espaço) |
| Concorrência | Last write wins | Optimistic locking (overhead sem caso de uso real) |

## Arquitetura

### Rotas

| Rota | Auth | Camada |
|---|---|---|
| `/events/[eventId]/medical` | Login obrigatório, role admin/editor | Dashboard interna |
| `/public/medical/[eventId]` | Sem login | Pública, escrita via Server Action |

### Schema do banco

```sql
CREATE TABLE mma_medical_clearance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES mma_events(id) ON DELETE CASCADE,
  enrolled_id UUID NOT NULL REFERENCES mma_enrollments(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'cleared_by_doctor', 'sent_to_hospital')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (event_id, enrolled_id)
);

CREATE INDEX idx_medical_event ON mma_medical_clearance(event_id);
CREATE INDEX idx_medical_status ON mma_medical_clearance(status);
```

### RLS policies

Mesmo padrão usado em `mma_staging_checkins`:

```sql
ALTER TABLE mma_medical_clearance ENABLE ROW LEVEL SECURITY;

-- Anyone can read (necessary for the public route to work without login)
CREATE POLICY "medical_select_all" ON mma_medical_clearance
  FOR SELECT USING (true);

-- Authenticated users can write directly (admin dashboard)
CREATE POLICY "medical_write_authenticated" ON mma_medical_clearance
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public route writes go through Server Action with service role key, bypassing RLS
```

### Server Action para rota pública

`src/lib/actions/public-medical.ts` — espelha [public-staging.ts](../../../src/lib/actions/public-staging.ts):

```ts
'use server'
// Validate eventId, validate enrolledId belongs to event,
// upsert (event_id, enrolled_id) → status using service role client
export async function updateMedicalStatusPublic(
  eventId: string,
  enrolledId: string,
  status: MedicalStatus
): Promise<{ success: boolean; error?: string }>
```

### Componentes / arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/<ts>_create_mma_medical_clearance.sql` | Create | Schema + indexes + RLS |
| `src/types/medical.ts` | Create | Tipos `MedicalStatus`, `MedicalClearance`, `MedicalRow`, `MedicalSummary` |
| `src/lib/services/medical-service.ts` | Create | `getMedicalData`, `updateMedicalStatus`, `getMedicalSummary` |
| `src/lib/actions/public-medical.ts` | Create | Server Action `updateMedicalStatusPublic` |
| `src/components/medical/medical-summary-card.tsx` | Create | Card 3×3 (corner × status) |
| `src/components/medical/medical-status-cell.tsx` | Create | Dropdown shadcn/ui com 3 opções coloridas |
| `src/components/medical/medical-whatsapp-link.tsx` | Create | Ícone clicável → wa.me. Esconde quando phone null |
| `src/components/medical/medical-table.tsx` | Create | Tabela com filtros, busca, sort |
| `src/app/(dashboard)/events/[eventId]/medical/page.tsx` | Create | Tela interna |
| `src/app/public/medical/[eventId]/page.tsx` | Create | Tela pública |
| Sidebar do evento | Modify | Adicionar link "Medical" |

### Tipos

```ts
// src/types/medical.ts
export type MedicalStatus = 'pending' | 'cleared_by_doctor' | 'sent_to_hospital'

export interface MedicalClearance {
  id: string
  event_id: string
  enrolled_id: string
  status: MedicalStatus
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface MedicalRow {
  id: string | null            // null = registro ainda não persistido
  enrolled_id: string
  status: MedicalStatus        // 'pending' por padrão se id é null
  corner: 'RED' | 'BLUE' | null
  fight_order: number | null
  person: {
    id: string
    compiled_name: string
    nationality: string | null
    fighter_id: string | null
    phone: string | null       // ← origem do link WhatsApp
    photo_url: string | null
  }
  event_name: string | null
}

export interface MedicalSummary {
  red:   { pending: number; cleared: number; hospital: number }
  blue:  { pending: number; cleared: number; hospital: number }
  total: { pending: number; cleared: number; hospital: number }
}
```

### Serviço

```ts
// src/lib/services/medical-service.ts
export async function getMedicalData(eventId: string): Promise<MedicalRow[]>
// JOIN: mma_enrollments → mma_people → (LEFT JOIN) mma_medical_clearance
// + JOIN com mma_matches para corner e fight_order
// Atletas sem registro médico aparecem com id=null e status='pending'

export async function updateMedicalStatus(
  eventId: string,
  enrolledId: string,
  status: MedicalStatus
): Promise<void>
// upsert por (event_id, enrolled_id) — cria ou atualiza

export function computeMedicalSummary(rows: MedicalRow[]): MedicalSummary
// função pura, deriva counters do array de rows
// (chamada no client, evita 2ª round-trip)
```

### Realtime

Padrão idêntico ao staging. Em ambas as páginas (interna e pública):

```ts
const channel = supabase
  .channel(`medical-${eventId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'mma_medical_clearance',
    filter: `event_id=eq.${eventId}`
  }, () => {
    loadData() // reload local state
  })
  .subscribe()
```

### Layout (referência visual)

```
┌─ Header ──────────────────────────────────────────────────────┐
│  UAEW70 — Medical Clearance                                   │
│  [Copy Public Link] [Public Monitor] [Refresh]                │
└───────────────────────────────────────────────────────────────┘

┌─ Summary Card ────────────────────────────────────────────────┐
│                       RED      BLUE     TOTAL                 │
│   Pendentes            8        7         15                  │
│   Cleared by Doctor    4        5          9                  │
│   Sent to Hospital     0        1          1                  │
└───────────────────────────────────────────────────────────────┘

┌─ Filtros ─────────────────────────────────────────────────────┐
│  [🔍 Buscar...]  [Corner: All ▾]  [Show: Pending only ▾]      │
└───────────────────────────────────────────────────────────────┘

┌─ Tabela ──────────────────────────────────────────────────────┐
│ # | Foto | Atleta              | Corner | WA  | Status ▾      │
│ 1 | (img)| Aaron Luke Aby      | RED    | 💬  | Pending       │
│ 2 | (img)| Vladyslav Soroka    | BLUE   | 💬  | Cleared       │
│ 3 | (img)| Anna Safeeva        | RED    | —   | Pending       │
└───────────────────────────────────────────────────────────────┘
```

Versão pública: idêntica menos o Header da dashboard e os botões "Copy Public Link" / "Public Monitor".

### Cores do dropdown

Reusar utilities do tailwind já presentes no projeto (encontradas no `staging-status-cell.tsx`):
- `Pending` → fundo cinza/neutro, texto cinza escuro
- `Cleared by Doctor` → fundo verde claro, texto verde escuro
- `Sent to Hospital` → fundo vermelho claro, texto vermelho escuro

### Link WhatsApp

```tsx
// medical-whatsapp-link.tsx
{phone && (
  <a
    href={`https://wa.me/${phone.replace(/[^\d]/g, '')}`}
    target="_blank"
    rel="noopener noreferrer"
    title={`Abrir WhatsApp (${phone})`}
  >
    <MessageCircle className="h-4 w-4 text-green-600 hover:text-green-700" />
  </a>
)}
```

`phone.replace(/[^\d]/g, '')` remove `+`, espaços e qualquer não-dígito. Ex: `+44 7775 931359` → `447775931359`.

## Plano de validação

Manual, no browser (esse projeto não tem suíte de testes automatizada).

1. **Migração:** rodar `supabase db push` ou aplicar manualmente. Confirmar tabela criada com RLS habilitado
2. **Setup:** logado como admin, navegar até `/events/<id>/medical` em um evento com atletas enrolled
3. **Render inicial:** todos os atletas aparecem com `Pending`, summary card mostra contagem correta por corner
4. **Mudança de status:** trocar dropdown → atualização otimista → counters atualizam → atleta some da lista com filtro "Pending only" ativo
5. **Persistência:** F5 → estado mantido. Conferir no Supabase Studio que row foi criada em `mma_medical_clearance`
6. **WhatsApp:** atleta com phone → ícone aparece e abre `wa.me/<digits>` em nova aba. Atleta sem phone → célula vazia
7. **Versão pública:** clicar "Public Monitor" abre `/public/medical/<id>` em nova aba. Em janela anônima → URL acessível sem login
8. **Edição na pública:** mudar status na rota pública → dispara Server Action → row atualizada no banco
9. **Realtime:** abrir admin numa aba e público em outra. Mudar status numa → outra atualiza sozinha em <2s
10. **Permissões:** trocar role do usuário pra "viewer" → tela admin existe mas dropdowns desabilitados
11. **Sidebar:** confirmar que "Medical" aparece na nav lateral do evento, abaixo de "Staging"

## Riscos & considerações

- **Link público sem rate-limiting:** quem tiver a URL pode editar status. UUID do evento não é trivialmente adivinhável, mas é "security through obscurity". Mesma postura do `/public/staging` hoje. Aceitável para MVP. Mitigação futura: token assinado por evento.
- **Concorrência:** dois usuários editando o mesmo atleta simultaneamente → last write wins. Não há optimistic locking. Probabilidade real é baixíssima.
- **Realtime:** Supabase Realtime tem limite de canais por projeto. Cada usuário aberto em 2 telas = 2 canais. Para 10 usuários simultâneos, fica tranquilo dentro do free tier.
- **Atletas sem `phone`:** muitos registros têm `phone = null`. UI tem que tolerar isso graciosamente (decidido: célula vazia).
- **Migração existente:** atletas já enrolled antes da feature existir não têm row em `mma_medical_clearance`. Solução: o serviço retorna virtualmente como `pending`. Primeira interação cria a row via upsert.

## Variáveis de ambiente

Nenhuma nova. Reusa:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (já usado pela Server Action existente)
