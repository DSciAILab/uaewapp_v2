# 📋 Detalhe do Evento

> **Rota:** `/events/[eventId]`
> **Tipo:** Dashboard do evento específico

---

## O que é?

A página principal de cada evento. Funciona como um **mini-dashboard** que mostra o estado geral do evento e permite gerenciar o **Roster** (lista de participantes).

---

## Seções

### 1. Event Snapshot (Metrics Grid)
Grade com métricas de cada módulo — clicar em qualquer métrica navega para a página correspondente:
- People enrolled → [[03 - People]]
- Flights → [[04 - Flights]]
- Hotels → [[07 - Hotels]]
- Transport → [[08 - Transport]]
- Stats → [[09 - Stats]]

### 2. Module Health
Cards de status para cada módulo com indicadores visuais:
- 🟢 Good / 🟡 Warning / 🔴 Critical

### 3. Quick Actions
Atalhos para ações frequentes dentro do evento.

### 4. Upcoming Deadlines
Prazos importantes (vencimento de vistos, datas de exames, etc).

### 5. Roster Management
Tabela de **enrollments** com abas por papel:
| Aba | Papel | Código |
|-----|-------|--------|
| All | Todos | — |
| Fighters | Lutadores | `F` |
| Corners | Corners/Treinadores | `C` |
| Staff | Equipe operacional | `ST` |
| Guests | Convidados | `G` |

### Ações no Roster
- **Add Member** — inscrever uma pessoa (de [[03 - People]]) no evento
- **Edit Enrollment** — alterar papel, flags (needs_hotel, needs_transport, etc)
- **Cancel Enrollment** — desativar inscrição

### 6. Event Config
Drawer lateral para editar dados do evento (nome, data, cidade).

---

## Sistema de Enrollment

O enrollment define:
- `person_id` → pessoa cadastrada em [[03 - People]]
- `event_id` → evento
- `role` → papel (Fighter, Corner, Staff, Guest)
- `needs_hotel` → boolean (aparece em [[07 - Hotels]])
- `needs_transport` → `none`, `arrival`, `departure`, `both` (alimenta [[08 - Transport]])
- `status` → `active` / `cancelled`

---

## Real-time
Esta página usa **Supabase Realtime** para atualizar automaticamente quando outros usuários fazem alterações. O badge "Satellite Active" indica conexão ativa.

---

## Conexões
- **Alimentado por:** [[02 - Eventos]], [[03 - People]]
- **Leva para:** [[13 - War Room]], [[12 - Fight Card]], todas as sub-páginas
- **Realtime:** [[19 - Realtime]]
