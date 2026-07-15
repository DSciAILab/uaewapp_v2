# 📦 Batches (Lotes)

> **Rota:** `/events/[eventId]/batches`
> **Tipo:** Página de evento

---

## O que é?

Organiza participantes em **lotes agendados** para atividades como pesagem, exames médicos, coleta de sangue, etc. Cada batch tem data, horário e lista de participantes.

---

## Tipos de Batch

Definidos em `BATCH_TYPE_LABELS`:
- **Weigh-in** — Pesagem oficial
- **Medical** — Exame médico
- **Blood Test** — Coleta de sangue
- **Photo Shoot** — Sessão de fotos
- **Custom** — Tipo personalizado

---

## O que pode fazer?

### Criar Batch
- Tipo, data agendada, horário, localização
- Status: `scheduled`, `in_progress`, `completed`

### Atribuir Participantes
- Selecionar quem participa de cada lote
- Check-in individual no dia

### Visualizações
- **Grid** — cards por batch
- **Timeline** — organização cronológica

### Estatísticas
| Métrica | Descrição |
|---------|-----------|
| Total Batches | Lotes criados |
| Total Participants | Pessoas atribuídas |
| Checked In | Pessoas que fizeram check-in |
| Completed | Lotes finalizados |

---

## Por que existe?

Porque atividades como pesagem e exame médico precisam ser organizadas em **grupos e horários** para evitar filas e caos. Sem lotes, fica impossível controlar quem já fez o quê.

---

## Conexões
- **Depende de:** [[06 - Detalhe do Evento]] (enrollments)
- **Relacionado com:** [[15 - Pre-Event]] (exames e clearance)
