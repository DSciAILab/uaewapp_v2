# 📡 Realtime (Tempo Real)

> **Provider:** `RealtimeProvider`
> **Hook:** `useRealtime()`, `useRealtimeContext()`
> **Tecnologia:** Supabase Realtime (WebSockets)

---

## O que é?

Sistema de comunicação em tempo real usando WebSockets do Supabase. Permite que alterações feitas por um usuário sejam **refletidas imediatamente** para todos os outros que estão na mesma página.

---

## Onde é usado?

| Página | Funcionalidade |
|--------|---------------|
| [[06 - Detalhe do Evento]] | Atualização automática de métricas e roster |
| [[13 - War Room]] | Activity feed, live status, team presence |

---

## Como funciona?

### RealtimeProvider
Componente que envolve a página e gerencia a conexão:
- Conecta ao canal do evento
- Gerencia presença de usuários
- Distribui updates para componentes filhos

### useRealtime()
Hook que escuta alterações:
- `isConnected` — status da conexão
- `updates` — lista de atualizações recentes
- `onUpdate` — callback quando há nova alteração

### useRealtimeContext()
Context compartilhado:
- `activeUsers` — lista de usuários ativos na página
- `broadcastPresence(location)` — anuncia presença em uma seção

---

## Indicadores Visuais

### Badge "Satellite Active"
- Badge verde com ponto pulsante
- Aparece no header do [[06 - Detalhe do Evento]]
- Indica que a conexão websocket está ativa

### Team Presence
- No [[13 - War Room]], mostra quem da equipe está online
- Lista de avatares com nomes

---

## Por que existe?

Durante o evento, múltiplas pessoas usam o sistema simultaneamente. Sem realtime, alguém poderia ver dados desatualizados e tomar decisões erradas. O realtime garante que **todos veem o mesmo estado**.

---

## Conexões
- **Usado em:** [[06 - Detalhe do Evento]], [[13 - War Room]]
- **Tecnologia:** Supabase Realtime WebSockets
