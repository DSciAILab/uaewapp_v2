# 👥 People (Pessoas)

> **Rota:** `/people`
> **Tipo:** Cadastro global (não depende de evento)

---

## O que é?

O cadastro central de **todas as pessoas** que interagem com o sistema: lutadores, corners, staff, convidados, e qualquer outro papel. Pessoas são **globais** — existem independentemente de eventos.

---

## O que pode fazer?

### Cadastrar Pessoa
Campos principais:
- **Nome e Sobrenome** (obrigatórios)
- **Data de Nascimento**, **Gênero**, **Nacionalidade**
- **Telefone**
- **Passport Name** — nome como no passaporte (usado para identificação em [[17 - Importação CSV]])
- **Passport Number** e **Expiry** — dados do passaporte
- **Fighter ID** — identificador único para lutadores (ex: `F001`)

### Busca e Filtros
- Busca por nome
- Filtro por nacionalidade
- Paginação

### Importação CSV
Via botão dropdown [[17 - Importação CSV]]:
- **Baixar Template** — CSV modelo com colunas esperadas
- **Importar CSV** — upload com mapeamento de colunas e upsert

### Ações em Lote
- Selecionar múltiplas pessoas
- Enrollment em lote (inscrever em evento)

### Quick Enroll
- Ao selecionar pessoas, pode inscrevê-las diretamente num evento sem sair da página

---

## Relação com Eventos

Uma pessoa **participa** de um evento através de um **Enrollment** (inscrição). O enrollment define:
- Em qual evento está
- Qual seu **papel** (Fighter, Corner, Staff, Guest)
- Se precisa de hotel, transporte, visto
- Status (active, cancelled)

Veja mais em [[06 - Detalhe do Evento]].

---

## Por que existe?

Porque a mesma pessoa pode participar de **múltiplos eventos** ao longo do tempo. Ter um cadastro central evita duplicação e permite rastrear histórico.

---

## Conexões
- **Alimenta:** [[06 - Detalhe do Evento]] (via enrollment)
- **Template CSV:** [[17 - Importação CSV]]
- **Dados usados em:** [[04 - Flights]], [[07 - Hotels]], [[09 - Stats]], [[05 - Visas]]
