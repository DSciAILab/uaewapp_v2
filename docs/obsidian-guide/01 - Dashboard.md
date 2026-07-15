# 🏠 Dashboard (Command Center)

> **Rota:** `/dashboard`
> **Tipo:** Página Server-Side (renderizada no servidor)

---

## O que é?

O Dashboard é o **centro de comando** do app. Ele mostra uma visão geral do evento ativo, com KPIs em tempo real e acesso rápido aos módulos mais importantes.

---

## O que mostra?

### 1. Header do Evento Ativo
- Nome do evento, data e cidade
- Botão de acesso direto ao [[13 - War Room]]

### 2. KPI Cards (3 Indicadores)
| Card | Cor | O que mede |
|------|-----|------------|
| **Critical Issues** | 🔴 Vermelho | Tickets pendentes + vistos negados + clearance negada + tasks atrasadas |
| **Pending Actions** | 🟡 Amarelo | Divergências hotel + vistos pendentes + clearance pendente |
| **Confirmed** | 🟢 Verde | Hotéis confirmados + vistos aprovados + clearance completa |

### 3. Metrics Grid
Grade detalhada com métricas de cada módulo: [[03 - People]], [[04 - Flights]], [[07 - Hotels]], [[09 - Stats]], [[14 - Tasks]], [[05 - Visas]].

### 4. Module Progress
Barra de progresso para cada módulo, mostrando % de conclusão.

### 5. Upcoming Deadlines
Lista de prazos importantes do evento.

---

## Por que existe?

Para que o gestor veja **de relance** onde estão os problemas e o que precisa de atenção imediata, sem precisar navegar entre várias páginas. É o ponto de partida do dia.

---

## Conexões
- **Depende de:** evento ativo em [[02 - Eventos]]
- **Leva para:** [[13 - War Room]], [[02 - Eventos]], qualquer módulo ao clicar nos metrics
