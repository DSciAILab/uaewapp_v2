# 🏨 Hotels (Hospedagem)

> **Rota:** `/events/[eventId]/hotels`
> **Tipo:** Página de evento

---

## O que é?

Gerencia as reservas de hotel para os participantes do evento que precisam de hospedagem. Só mostra pessoas com `needs_hotel = true` no enrollment.

---

## O que pode fazer?

### New Reservation
Criar reserva manualmente para um participante:
- Check-in: data e hora
- Checkout: data e hora
- Número da reserva
- Status: `confirmed`, `pending`, `cancelled`
- Observações

### Stats Cards
| Card | Descrição |
|------|-----------|
| Total | Total de reservas |
| Confirmed | Reservas confirmadas |
| Pending | Aguardando confirmação |
| Divergences | Datas de hotel vs datas do evento |
| Pending Approval | Reservas aguardando aprovação |

### Filtros
- Por status de reserva
- Por pessoa

### Importação CSV
Via [[17 - Importação CSV]]:
- Identificação pelo **Passport Name**
- Campos importáveis: check-in/out (data e hora), número da reserva, status, notas
- Suporta **upsert** — atualiza reserva existente se já houver
- Só importa para pessoas com `needs_hotel = true` e enrollment ativo

---

## Detecção de Divergências

O sistema compara automaticamente:
- Data de check-in da reserva vs data do voo de chegada (de [[04 - Flights]])
- Data de checkout vs data do voo de partida

Se houver inconsistência → marca como **divergência** e aparece no [[01 - Dashboard]].

---

## Por que existe?

Porque gerenciar hospedagem para 50+ pessoas é complexo. É preciso garantir que todos têm reserva, que as datas batem com os voos, e que não há quartos faltando.

---

## Conexões
- **Depende de:** [[06 - Detalhe do Evento]] (enrollments com `needs_hotel`)
- **Cruzamento com:** [[04 - Flights]] (detecção de divergências)
- **Alimenta:** [[01 - Dashboard]] (KPIs de hotel)
- **Alimenta:** [[13 - War Room]] (divergências)
- **Template CSV:** [[17 - Importação CSV]]
