# ⚔️ Fight Card

> **Rota:** `/events/[eventId]/fight-card`
> **Tipo:** Página de evento (visualização)

---

## O que é?

Exibe o **card de lutas oficial** do evento — a lista de combates com Red Corner vs Blue Corner, com fotos, nacionalidades e records.

---

## Como funciona?

### Fonte de Dados
O Fight Card é alimentado por um **Google Sheet publicado como CSV**. A URL do sheet é configurada no evento (`fight_card_csv_url`) ou usa uma URL padrão.

### Estrutura do CSV
| Coluna | Descrição |
|--------|-----------|
| Match Number | Número da luta |
| Event | Nome do evento |
| Corner | RED ou BLUE |
| Division | Categoria de peso |
| Name | Nome do lutador |
| Nickname | Apelido |
| Record | Recorde (ex: 15-3-0) |
| Nationality | Nacionalidade |
| Residency | Residência |

### Enriquecimento
O sistema cruza os nomes do CSV com os [[09 - Stats]] para:
- Encontrar a **foto** do lutador (via `fighter_id`)
- Adicionar `event_name` e `fighter_id` como informação extra

### Auto-refresh
A página atualiza automaticamente a cada **30 segundos**.

---

## O que pode fazer?

### Export PDF
Gera um PDF do fight card com fotos, nomes e records — útil para impressão e distribuição.

### Collection Template
Gera um PDF com template de coleta de uniformes baseado na lista de lutadores do fight card — serve para anotar tamanhos de camiseta, shorts, luvas.

---

## Por que existe?

É a visualização principal para o dia do evento e para a produção. Precisa estar sempre atualizado com o Google Sheet onde o matchmaker define as lutas.

---

## Conexões
- **Alimentado por:** Google Sheet externo (CSV)
- **Cruza com:** [[09 - Stats]] (fotos e dados)
- **Acessado de:** [[06 - Detalhe do Evento]] (botão "Fight Card")
