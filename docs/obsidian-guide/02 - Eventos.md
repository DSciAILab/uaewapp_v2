# 📅 Eventos

> **Rota:** `/events`
> **Tipo:** Listagem global

---

## O que é?

A página de eventos lista todos os eventos cadastrados no sistema (passados, ativos e futuros). Cada evento é uma "instância" completa de um show de MMA da UAE Warriors.

---

## O que pode fazer?

### Criar Evento
- Nome, data, cidade, local
- Status: `active`, `draft`, `completed`
- URL do Google Sheet para Fight Card (campo `fight_card_csv_url`)

### Ativar Evento
- Apenas **um evento pode estar ativo** por vez
- O evento ativo é o que aparece no [[01 - Dashboard]]

### Acessar Evento
- Ao clicar num evento, vai para o [[06 - Detalhe do Evento]]

---

## Estrutura de um Evento

Cada evento criado abre acesso a todas as sub-páginas:

| Sub-página | Função |
|-----------|--------|
| [[06 - Detalhe do Evento]] | Roster + Dashboard do evento |
| [[07 - Hotels]] | Hospedagem |
| [[08 - Transport]] | Transporte |
| [[09 - Stats]] | Estatísticas de lutadores |
| [[10 - Music]] | Músicas de entrada |
| [[11 - Batches]] | Lotes organizacionais |
| [[12 - Fight Card]] | Card de lutas |
| [[13 - War Room]] | Centro de comando |
| [[14 - Tasks]] | Tarefas operacionais |
| [[15 - Pre-Event]] | Exames e documentos |
| [[16 - Staging]] | Check pré-partida |

---

## Por que existe?

Porque a UAE Warriors realiza **múltiplos eventos ao ano**, e cada um tem logísticas completamente diferentes. Isolar cada evento garante que dados não se misturem e permite histórico completo.

---

## Conexões
- **Alimenta:** [[01 - Dashboard]] (evento ativo)
- **Leva para:** [[06 - Detalhe do Evento]]
