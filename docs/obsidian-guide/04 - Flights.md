# ✈️ Flights (Voos)

> **Rota:** `/flights`
> **Tipo:** Página global com filtro por evento

---

## O que é?

Gerencia todos os voos dos participantes do evento — chegada e partida. Cada registro de voo está vinculado a um **enrollment** (pessoa inscrita no evento).

---

## O que pode fazer?

### Cadastrar Voo
Tipos de voo:
- **Full** — ida e volta (arrival + departure)
- **Arrival Only** — apenas chegada
- **Departure Only** — apenas partida

Campos por trecho:
- Número do voo, data, horário
- Aeroporto
- Número da reserva
- Link do ticket

### Visualização
- **Modo Table** — lista com todos os voos
- **Modo Cards** — cartões visuais por pessoa
- Filtros por evento, status e busca por nome

### Importação CSV
Via [[17 - Importação CSV]]:
- Identificação pelo **Passport Name** da pessoa
- Campos: número do voo, datas, horários, aeroporto
- Suporta **upsert** (atualizar voo existente)

### Status dos Voos
- `pending` — voo cadastrado mas sem confirmação
- `confirmed` — voo confirmado
- Estatísticas no topo: total, confirmados, pendentes

---

## Como funciona o matching?

Quando importa CSV, o sistema:
1. Busca todos os enrollments ativos do evento selecionado
2. Compara o **Passport Name** do CSV com `compiled_name` e `event_name` da pessoa
3. Match case-insensitive
4. Se encontrar, cria ou atualiza o voo

---

## Por que existe?

Porque a organização precisa coordenar dezenas de voos simultâneos — saber quem chega quando é essencial para organizar o [[08 - Transport]] e o [[07 - Hotels]].

---

## Conexões
- **Depende de:** [[03 - People]] (enrollment no evento)
- **Alimenta:** [[08 - Transport]] (agrupamento por voo)
- **Alimenta:** [[15 - Pre-Event]] (aba Logistics)
- **Template CSV:** [[17 - Importação CSV]]
