# 🚗 Transport (Transporte)

> **Rota:** `/events/[eventId]/transport`
> **Tipo:** Página de evento

---

## O que é?

Gerencia a logística de transporte do evento: **carros**, **motoristas** e **passageiros**. Organiza quem vai em qual carro, para arrival e departure.

---

## Conceitos Principais

### Drivers (Motoristas)
- Cadastro **global** — motoristas não pertencem a um evento específico
- Campos: nome, telefone, ativo (sim/não), notas
- Podem ser reutilizados entre eventos

### Cars (Carros do Evento)
- Vinculados a um evento específico
- Tipo: `arrival` ou `departure`
- Podem ter motorista atribuído
- Podem ter número de voo, data, horário, aeroporto
- Campos de rota: de → para
- Status: `scheduled`, `in_transit`, `completed`
- Numeração automática (auto-incremento)

### Passengers (Passageiros)
- Vinculados a um carro específico
- Cada passageiro é um enrollment do evento

---

## O que pode fazer?

### Gestão de Carros
- Criar carro com tipo (arrival/departure)
- Atribuir motorista
- Vincular a número de voo
- Definir rota e horário

### Gestão de Passageiros
- Arrastar/atribuir participantes aos carros
- Ver quem **não está atribuído** a nenhum carro

### Flight Grouping View
Visualização que agrupa participantes por **número de voo** (vem de [[04 - Flights]]):
- Mostra quem chega no mesmo voo
- Facilita criar carros para o grupo inteiro
- Indica quem já está atribuído

### Importação CSV de Motoristas
Via [[17 - Importação CSV]]:
- Importar lista de motoristas de uma vez
- Campos: Nome, Telefone, Ativo, Notas
- Suporta **upsert** por nome

### Stats
| Métrica | Descrição |
|---------|-----------|
| Total Cars | Carros criados para o evento |
| Assigned Cars | Carros com passageiros |
| Total Drivers | Motoristas cadastrados |
| Active Drivers | Motoristas ativos |

---

## Por que existe?

Porque coordenar o transporte aeroporto↔hotel para dezenas de pessoas que chegam em voos diferentes é caótico sem um sistema. O agrupamento por voo é essencial para otimizar carros.

---

## Conexões
- **Depende de:** [[04 - Flights]] (agrupamento por voo)
- **Depende de:** [[06 - Detalhe do Evento]] (enrollments com `needs_transport`)
- **Alimenta:** [[15 - Pre-Event]] (aba Logistics)
- **Template CSV:** [[17 - Importação CSV]]
