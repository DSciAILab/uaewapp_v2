# 🎯 Staging (Pré-Partida)

> **Rota:** `/events/[eventId]/staging`
> **Tipo:** Página de evento + página pública

---

## O que é?

Gerencia o **check pré-partida** — a verificação final que acontece no hotel antes dos atletas irem para o evento. Confirma se tudo está em ordem: credenciais, bus assignment, equipamento.

---

## O que pode fazer?

### Tabela de Staging
Tabela com todos os atletas e suas checagens:
- Nome do atleta
- Credencial do coach
- Atribuição de ônibus
- Checks físicos (equipamento, uniforme)
- Status geral

### Link Público
Componente especial: pode gerar um **link público** que mostra o status em tempo real:
- **Copy Link** — copia o link do monitor público
- **Public Monitor** — abre em nova aba o `/public/staging/[eventId]`

O monitor público permite que coordenadores no local vejam o status sem precisar de login.

---

## Por que existe?

No dia do evento, antes de sair do hotel, é essencial confirmar que:
1. Todo mundo tem credencial
2. Os ônibus estão organizados
3. Ninguém ficou para trás
4. Equipamento está presente

O monitor público é essencial para coordenadores de campo.

---

## Conexões
- **Depende de:** [[06 - Detalhe do Evento]] (atletas inscritos)
- **Relacionado com:** [[08 - Transport]] (bus assignments)
- **Página pública:** `/public/staging/[eventId]` (sem login)
