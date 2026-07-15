# ✅ Tasks (Tarefas Operacionais)

> **Rota:** `/events/[eventId]/tasks`
> **Tipo:** Página de evento

---

## O que é?

Sistema de gerenciamento de tarefas operacionais do evento. Permite criar, atribuir e acompanhar tarefas com checklists, prioridades e deadlines.

---

## Abas

### Tasks
Listagem de tarefas do evento com:

#### Filtros
- Busca por texto
- Status: `pending`, `in_progress`, `completed`, `cancelled`
- Prioridade: `low`, `medium`, `high`, `urgent`
- Categoria: definida em `TASK_CATEGORY_LABELS`

#### Stats
| Card | Descrição |
|------|-----------|
| Total | Total de tarefas |
| Pending | Aguardando início |
| In Progress | Em andamento |
| Completed | Finalizadas |
| Overdue | Atrasadas (deadline passou) |

### Templates
Templates reutilizáveis para padronizar tarefas entre eventos:
- Cada template tem: nome, descrição, categoria, checklist items
- Duração estimada em minutos
- Status ativo/inativo

---

## O que pode fazer?

### Criar Task
- Título, descrição
- Categoria, prioridade
- Deadline
- Checklist items

### Criar Template
- Modelo reutilizável de tarefas
- Checklist com itens padronizados
- Duração estimada

---

## Por que existe?

Porque événements de MMA têm **dezenas de micro-tarefas** que precisam ser feitas em ordem e no prazo: preparar octógono, testar equipamento, organizar credenciais, etc. Tasks atrasadas aparecem como alertas no [[13 - War Room]].

---

## Conexões
- **Alimenta:** [[01 - Dashboard]] (tasks atrasadas = Critical Issues)
- **Alimenta:** [[13 - War Room]] (alertas de tasks overdue)
- **Depende de:** [[06 - Detalhe do Evento]]
