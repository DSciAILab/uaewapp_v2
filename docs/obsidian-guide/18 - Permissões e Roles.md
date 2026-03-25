# 🔐 Permissões e Roles

> **Hook:** `usePermissions()`
> **Tipo:** Sistema transversal

---

## O que é?

Sistema de controle de acesso baseado em papéis (RBAC). Define quem pode ver, editar e deletar dados em cada módulo.

---

## Papéis (Roles)

### Admin
- Acesso total a tudo
- Pode deletar registros
- Pode gerenciar usuários

### Editor
- Pode criar e editar registros
- Não pode deletar
- Acesso a módulos específicos conforme configuração

### Viewer
- Apenas leitura
- Pode navegar entre todas as páginas
- Não pode criar, editar ou deletar

---

## Módulos Protegidos

O hook `usePermissions()` fornece:
- `canEdit(module)` — verifica se pode editar um módulo específico
- `isAdmin` — verifica se é admin

Módulos verificados:
- `events` — eventos e enrollments
- `flights` — voos
- `hotels` — hospedagem
- `transport` — transporte
- `visas` — vistos
- `stats` — estatísticas
- `music` — músicas
- `tasks` — tarefas

---

## Como afeta a UI?

Botões de criar, editar e importar são **ocultados** se o usuário não tem permissão:
- Em [[03 - People]]: botão "Nova Pessoa" e "Importar CSV" só aparecem se `canEditPeople`
- Em [[04 - Flights]]: botão "Importar CSV" só aparece se `canEdit('flights')`
- Em [[05 - Visas]]: botão "Novo Visto" só aparece se `canEdit('visas')`, deletar só se `isAdmin`

---

## Conexões
- **Utilizado em:** todas as páginas que têm ações de criação/edição
- **Afeta visibilidade de:** [[17 - Importação CSV]] (botão de importar)
