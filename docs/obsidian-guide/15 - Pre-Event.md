# 🩺 Pre-Event (Pré-Evento)

> **Rota:** `/events/[eventId]/pre-event`
> **Tipo:** Página de evento

---

## O que é?

Gerencia todos os **requisitos pré-evento** para que um lutador possa competir: exames de sangue, exames médicos, documentos obrigatórios. Sem clearance completa, o lutador **não pode lutar**.

---

## Abas

### Overview
Cards de clearance por pessoa mostrando:
- ✅ Cleared — tudo OK
- ⚠️ Partial — parcialmente completo
- ⏳ Pending — aguardando
- ❌ Denied — negado

### Logistics & Readiness
Tabela mostrando **status logístico completo** de cada participante:
- Voo (de [[04 - Flights]])
- Hotel (de [[07 - Hotels]])
- Transporte (de [[08 - Transport]])
- Clearance médica

### Blood Tests (Exames de Sangue)
- Registrar coleta de sangue
- Status: pendente, coletado, resultado ok, resultado negativo
- Data da coleta

### Medical Exams (Exames Médicos)
- Registrar exame médico
- Status: pendente, aprovado, reprovado
- Médico responsável

### Documents (Documentos)
- Listar documentos obrigatórios
- Rastrear envio: pendente, enviado, aprovado
- Tipo: passaporte, visto, contrato, etc

---

## Summary Stats
| Métrica | Descrição |
|---------|-----------|
| Total Enrolled | Total de inscritos |
| Cleared | Totalmente liberados |
| Partial | Parcialmente prontos |
| Pending | Aguardando |
| Denied | Negados |
| Blood Tests Pending | Exames de sangue pendentes |
| Medical Exams Pending | Exames médicos pendentes |
| Documents Pending | Documentos pendentes |

---

## Por que existe?

Comissão atlética exige que **todos os exames estejam em dia** para que o lutador possa competir. Se um exame de sangue der negativo, o lutador é **retirado do card**. Este sistema garante que nada passe despercebido.

---

## Conexões
- **Depende de:** [[06 - Detalhe do Evento]], [[04 - Flights]], [[07 - Hotels]], [[08 - Transport]]
- **Alimenta:** [[01 - Dashboard]] (clearance KPIs)
- **Alimenta:** [[13 - War Room]] (alertas de médico/sangue)
- **Relacionado com:** [[11 - Batches]] (organização de coletas)
