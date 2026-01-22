# MMA Event Management System - Documentação Técnica

## 1. Visão Geral

### 1.1 Descrição
Sistema de gestão de logística e operações para eventos de MMA. Centraliza o controle de pessoas (atletas, corners, staff, guests), logística (aéreo, visto, hotel, transporte) e operações (stats, música, blood test, pre-event check, batches).

### 1.2 Problema Resolvido
Substituir 16+ planilhas Google Sheets desconectadas por um sistema centralizado com:
- Sincronização em tempo real
- Dashboard de urgências
- Controle de permissões por área
- Auditoria completa de alterações

### 1.3 Público-Alvo
- Equipe de operações de eventos de MMA
- Colaboradores temporários por evento
- Gestores que precisam de visão consolidada

---

## 2. Arquitetura

### 2.1 Stack Tecnológica

```yaml
Frontend:
  Framework: Next.js 14+ (App Router)
  Linguagem: TypeScript
  Estilização: Tailwind CSS
  Componentes: shadcn/ui
  Formulários: React Hook Form + Zod
  Estado: Supabase Realtime + React Hooks

Backend:
  Database: PostgreSQL (Supabase)
  Auth: Supabase Auth (Email + Google OAuth)
  Realtime: Supabase Realtime (WebSocket)
  Storage: Google Drive (links)

Infraestrutura:
  Frontend: Vercel
  Database: Supabase Cloud
  Repositório: GitHub
```

### 2.2 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTES                              │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│   Desktop   │   Mobile    │  TV (Sala   │    Tablet        │
│   Browser   │   Browser   │  de Guerra) │    Browser       │
└──────┬──────┴──────┬──────┴──────┬──────┴───────┬──────────┘
       │             │             │              │
       └─────────────┴──────┬──────┴──────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      VERCEL (CDN)                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Next.js 14+ (App Router)                │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │   │
│  │  │  Pages   │ │   API    │ │     Middleware       │ │   │
│  │  │ (React)  │ │  Routes  │ │ (Auth + Redirect)    │ │   │
│  │  └──────────┘ └──────────┘ └──────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE CLOUD                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │  PostgreSQL │ │    Auth     │ │      Realtime       │   │
│  │  (Database) │ │  (Supabase) │ │    (WebSocket)      │   │
│  │             │ │             │ │                     │   │
│  │  27 tabelas │ │ Email/Senha │ │  Pub/Sub para       │   │
│  │  mma_*      │ │ Google OAuth│ │  sincronização      │   │
│  │             │ │             │ │                     │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   RLS (Row Level Security)          │   │
│  │         Controle de acesso por usuário/área         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    GOOGLE CLOUD                             │
│  ┌─────────────────────┐ ┌─────────────────────────────┐   │
│  │    Google Drive     │ │       Google OAuth          │   │
│  │  (Documentos/Fotos) │ │   (Login colaboradores)     │   │
│  └─────────────────────┘ └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Fluxo de Dados

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   FIGHTCARD  │────▶│   ENROLLED   │────▶│  LOGÍSTICA   │
│  (Atletas)   │     │  (Event ID)  │     │ Aéreo/Visto/ │
└──────────────┘     └──────────────┘     │ Hotel/Transp │
       │                    │             └──────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   CORNERS    │────▶│  OPERAÇÕES   │────▶│  DASHBOARD   │
│  (Vinculados)│     │ Stats/Música │     │  URGÊNCIAS   │
└──────────────┘     │ Blood/Pre-ev │     └──────────────┘
                     └──────────────┘
```

---

## 3. Modelo de Dados

### 3.1 Diagrama ER (Simplificado)

```
┌─────────────────┐       ┌─────────────────┐
│   mma_users     │       │   mma_events    │
│─────────────────│       │─────────────────│
│ id (PK)         │       │ id (PK)         │
│ email           │       │ name            │
│ name            │       │ event_date      │
│ user_type       │       │ city/country    │
│ is_active       │       │ status          │
│ expires_at      │       └────────┬────────┘
└────────┬────────┘                │
         │                         │
         │    ┌────────────────────┘
         │    │
         ▼    ▼
┌─────────────────────────────────────────┐
│            mma_enrollments              │
│─────────────────────────────────────────│
│ id (PK)                                 │
│ event_id (FK) ─────────────────────────▶│ mma_events
│ person_id (FK) ────────────────────────▶│ mma_people
│ role_id (FK) ──────────────────────────▶│ mma_roles
│ event_code (F.001, C.002...)            │
│ needs_flight / needs_visa / needs_hotel │
└────────┬────────────────────────────────┘
         │
         │ 1:1
         ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  mma_flights    │  │   mma_visas     │  │   mma_hotels    │
│─────────────────│  │─────────────────│  │─────────────────│
│ enrollment_id   │  │ enrollment_id   │  │ enrollment_id   │
│ arrival/depart  │  │ status          │  │ checkin/checkout│
│ ticket_link     │  │ document_link   │  │ divergences     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 3.2 Tabelas Principais

| Categoria | Tabelas | Descrição |
|-----------|---------|-----------|
| **Core** | mma_users, mma_user_invites, mma_permission_areas, mma_user_permissions, mma_roles | Usuários, permissões, roles |
| **People** | mma_people, mma_people_documents | Base de pessoas e documentos |
| **Eventos** | mma_events, mma_event_checklist_items, mma_enrollments, mma_enrollment_corners | Eventos e inscrições |
| **Logística** | mma_flights, mma_visas, mma_hotels, mma_transport_drivers, mma_transport_cars, mma_transport_passengers | Aéreo, visto, hotel, transporte |
| **Operações** | mma_athlete_stats, mma_athlete_music, mma_athlete_tasks, mma_pre_event_checks, mma_batches, mma_batch_passengers | Stats, tarefas, batches |
| **Mensagens** | mma_messages, mma_message_attachments, mma_message_reads | Sistema de mensagens (futuro) |
| **Auditoria** | app_private.mma_audit_logs | Log de alterações |

### 3.3 Convenções

- **Prefixo**: Todas as tabelas usam `mma_`
- **IDs**: UUID v4 gerados automaticamente
- **Timestamps**: `created_at` e `updated_at` em todas as tabelas
- **Soft Delete**: Não utilizado (delete físico com auditoria)
- **RLS**: Row Level Security habilitado em todas as tabelas

---

## 4. Autenticação e Autorização

### 4.1 Tipos de Usuário

| Tipo | Login | Expiração | Permissões |
|------|-------|-----------|------------|
| `admin` | Email/Senha | Nunca | Acesso total |
| `staff` | Email/Senha | Configurável | Por área |
| `temporary` | Google OAuth | Por evento | Por área |

### 4.2 Fluxo de Autenticação

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN / STAFF                            │
├─────────────────────────────────────────────────────────────┤
│  1. Acessa /login                                           │
│  2. Insere email e senha                                    │
│  3. Supabase Auth valida                                    │
│  4. Trigger cria/atualiza perfil em mma_users               │
│  5. Middleware verifica is_active e expires_at              │
│  6. Redireciona para /dashboard                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  COLABORADOR TEMPORÁRIO                     │
├─────────────────────────────────────────────────────────────┤
│  1. Admin cria convite (email + prazo + permissões)         │
│  2. Colaborador recebe link                                 │
│  3. Clica em "Entrar com Google"                            │
│  4. Sistema valida: email do Google == email do convite?    │
│  5. Se válido e não expirado: acesso liberado               │
│  6. Permissões aplicadas conforme convite                   │
│  7. Após prazo: acesso bloqueado automaticamente            │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Permissões por Área

```
┌────────────────┬────────────────────────────────────────────┐
│     Área       │              Descrição                     │
├────────────────┼────────────────────────────────────────────┤
│ people         │ People Database (cadastro de pessoas)      │
│ events         │ Eventos e Fightcard                        │
│ flights        │ Aéreo (passagens)                          │
│ visas          │ Vistos                                     │
│ hotels         │ Hotel (reservas)                           │
│ transport      │ Transporte (carros, drivers)               │
│ operations     │ Operações (stats, música, tasks)           │
│ pre_event      │ Pre-event check e batches                  │
│ admin          │ Configurações e usuários                   │
└────────────────┴────────────────────────────────────────────┘

Níveis: view (visualizar) | edit (visualizar + editar)
Admin: acesso total (sem registro em mma_user_permissions)
```

---

## 5. Funcionalidades

### 5.1 MVP Fase 1 - Fundação + Logística

| Módulo | Funcionalidades |
|--------|-----------------|
| **Auth** | Login email/senha, Google OAuth, convites, expiração |
| **People** | CRUD, importação CSV, normalização de nomes, foto via fighter_id |
| **Events** | CRUD, configuração de margens hotel, status |
| **Enrolled** | Inscrição com Event ID automático, necessidades logísticas |
| **Flights** | Chegada/partida/full, tickets anexos |
| **Visas** | Status workflow, documentos |
| **Hotels** | Reservas, divergências, aprovações |
| **Transport** | Agrupamento por voo, drivers, carros |
| **Dashboard** | Urgências, KPIs, progresso por área |

### 5.2 MVP Fase 2 - Operações

| Módulo | Funcionalidades |
|--------|-----------------|
| **Stats** | Dados permanentes e variáveis por evento |
| **Music** | 3 links YouTube por atleta |
| **Tasks** | Blood test, photoshoot, video shoot |
| **Pre-event** | Checklist configurável (fixo + extras) |
| **Batches** | Agrupamentos para transfer, boarding |
| **War Room** | Dashboard TV (logística + operações), rotação |

### 5.3 Futuro

| Módulo | Funcionalidades |
|--------|-----------------|
| **App Atleta** | Portal pessoal, agenda, mensagens |
| **Mensagens** | Broadcast, individual, anexos |
| **Dashboard 3** | Outra área (a definir) |

---

## 6. Integrações

### 6.1 Google Drive

```yaml
Uso: Armazenamento de documentos (passaportes, tickets, fotos)
Fluxo:
  - Links manuais: usuário cola link do Drive
  - Upload integrado: sistema faz upload e salva link
Estrutura:
  /MMA_System/
  ├── /People/{Nome}_{FighterID}/
  │   ├── passport.pdf
  │   └── visa.pdf
  └── /Tickets/{Evento}/
      └── {nome}_arrival.pdf
```

### 6.2 Google OAuth

```yaml
Uso: Login de colaboradores temporários
Configuração:
  - Google Cloud Console: criar credenciais OAuth
  - Supabase Dashboard: habilitar provider Google
  - Callback URL: configurar no Google e Supabase
```

### 6.3 Fighter Photo API

```yaml
Uso: Foto de perfil dos atletas
URL: https://appadmin.uaewarriors.com/imagecdn/FighterDP?fighterId={id}
Campo: mma_people.fighter_id
```

---

## 7. Real-time

### 7.1 Implementação

```typescript
// Hook para escutar mudanças
function useRealtimeEnrollments(eventId: string) {
  const [enrollments, setEnrollments] = useState([])
  
  useEffect(() => {
    const channel = supabase
      .channel(`enrollments:${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mma_enrollments',
        filter: `event_id=eq.${eventId}`
      }, (payload) => {
        // Atualiza estado local
        handleChange(payload)
      })
      .subscribe()
    
    return () => supabase.removeChannel(channel)
  }, [eventId])
  
  return enrollments
}
```

### 7.2 Tabelas com Real-time

- mma_enrollments
- mma_flights
- mma_visas
- mma_hotels
- mma_transport_cars
- mma_athlete_tasks
- mma_batches

---

## 8. Modo TV (Sala de Guerra)

### 8.1 Dashboards

```yaml
Dashboard Logística:
  URL: /tv/logistics
  Conteúdo:
    - Tabela: Enrolled x Aéreo x Visto x Hotel x Transporte
    - Status por cores (✅ 🟡 🔴)
    - Progresso por área

Dashboard Operações:
  URL: /tv/operations
  Conteúdo:
    - Tabela: Fighter x Stats x Música x Blood x Photo x Pre
    - Status por cores
    - Progresso por tarefa

Configurações:
  - Exibir um ou outro
  - Rotação automática (tempo configurável)
  - Auto-refresh via WebSocket
```

---

## 9. Auditoria

### 9.1 Estrutura

```sql
app_private.mma_audit_logs
├── id (UUID)
├── table_name (VARCHAR) -- ex: mma_enrollments
├── record_id (UUID) -- ID do registro alterado
├── action (VARCHAR) -- INSERT, UPDATE, DELETE
├── old_data (JSONB) -- Estado anterior
├── new_data (JSONB) -- Estado novo
├── changed_fields (TEXT[]) -- Campos alterados
├── user_id (UUID) -- Quem alterou
├── created_at (TIMESTAMPTZ)
```

### 9.2 Tabelas Auditadas

- mma_people
- mma_enrollments
- mma_flights
- mma_visas
- mma_hotels

---

## 10. Deploy

### 10.1 Vercel

```yaml
Repositório: GitHub
Branch: main
Build Command: pnpm build
Output Directory: .next
Variáveis de Ambiente:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - GOOGLE_CLIENT_ID
  - GOOGLE_CLIENT_SECRET
```

### 10.2 Supabase

```yaml
Projeto: Já configurado
Banco: 27 tabelas mma_* + 1 auditoria
Auth: Email/Senha + Google OAuth
RLS: Habilitado em todas as tabelas
Realtime: Habilitado
```

---

## 11. Referências

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

