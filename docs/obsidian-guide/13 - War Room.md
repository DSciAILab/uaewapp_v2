# 🔴 War Room (Centro de Comando)

> **Rota:** `/events/[eventId]/war-room`
> **Tipo:** Página de evento (real-time)

---

## O que é?

O War Room é o **centro de comando em tempo real** para o dia do evento. Interface escura estilo "mission control" com dados vivos, alertas e presença de equipe.

---

## Vistas

### 1. Tactical (Tática)
- **Live Status Board** — indicadores em tempo real (tickets, tasks, médico, divergências)
- **Countdown Timer** — contagem regressiva para o evento
- **Activity Feed** — log de atividades em tempo real (via [[19 - Realtime]])
- **Alerts Panel** — alertas críticos (tasks atrasadas, problemas médicos)
- **Team Presence** — quem da equipe está online agora

### 2. Logistics (Logística)
- Pipeline de logística — monitorando [[04 - Flights]] e [[07 - Hotels]]
- Total de movimentações
- Alocação de quartos %
- Lista de chegadas previstas

### 3. Safety (Segurança)
- Medical Alerts — alertas médicos
- Clearances — progresso de liberações (exames, sangue, documentos)
- Safety Grid — Blood Sync, Medical Review, Doc Vault

---

## Funcionalidades Especiais

### TV Mode
- Ativa **tela cheia** — ideal para monitorar em TV dedicada
- Auto-rotate entre as 3 vistas a cada 15 segundos

### Real-time
- Usa websockets do Supabase Realtime
- Badge de conexão ativa
- Presença de equipe (quem está na sala)

### Alertas Automáticos
O sistema gera alertas baseados nas métricas:
- Tasks atrasadas → alerta `critical`
- Clearances pendentes → alerta `warning`

---

## Por que existe?

No dia do evento, a equipe precisa de uma **visão unificada** de tudo que está acontecendo. O War Room concentra todas as informações críticas num único lugar, atualizando em tempo real.

---

## Conexões
- **Realtime:** [[19 - Realtime]]
- **Alimentado por:** [[14 - Tasks]], [[07 - Hotels]], [[15 - Pre-Event]], [[05 - Visas]]
- **Acessado de:** [[01 - Dashboard]], [[06 - Detalhe do Evento]]
