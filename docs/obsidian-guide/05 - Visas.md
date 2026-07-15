# 🛂 Visas (Vistos)

> **Rota:** `/visas`
> **Tipo:** Página global com filtro por evento

---

## O que é?

Controla o status dos vistos de todos os participantes que precisam de visto para entrar nos Emirados Árabes. Cada visto está vinculado a um enrollment.

---

## O que pode fazer?

### Registrar Visto
Campos:
- Pessoa (via enrollment do evento)
- Status (numérico com labels configuráveis)
- Marcar como concluído (`is_done`)

### Dashboard de Status
Cards com contadores:
- Total de vistos
- Pendentes / Em processo / Aprovados / Negados
- Filtros por status e nacionalidade

### Busca e Filtros
- Por nome da pessoa
- Por status do visto
- Por nacionalidade
- Por evento

---

## Status do Visto

O sistema usa constantes de status com labels configuráveis em `VISA_STATUS_LABELS`. Exemplos típicos:
- Pending, In Process, Approved, Denied, Cancelled

---

## Por que existe?

Porque muitos lutadores e staff são internacionais e precisam de visa de entrada. O processo é burocrático e precisa de tracking — vistos negados ou atrasados impactam diretamente o [[12 - Fight Card]] e a logística.

---

## Conexões
- **Depende de:** [[03 - People]] (enrollment no evento)
- **Impacta:** [[01 - Dashboard]] (KPIs de vistos)
- **Impacta:** [[13 - War Room]] (alertas de vistos pendentes)
