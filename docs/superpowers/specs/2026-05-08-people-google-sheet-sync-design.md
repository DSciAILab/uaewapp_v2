# People Google Sheet Sync — Design

**Data:** 2026-05-08
**Autor:** Fernando + Claude
**Status:** Draft (aguardando revisão do usuário)

## Objetivo

Permitir sincronizar a tabela `mma_people` (banco Supabase) a partir de uma planilha Google Sheets publicada como CSV, com **um clique de botão** na aba `/people`. A sincronização **só insere atletas novos** — registros existentes nunca são atualizados nem removidos.

## Motivação

Hoje a aba `/people` aceita importação manual de CSV via [`CSVImport`](../../../src/components/forms/csv-import.tsx) e [`importPeopleFromCSV`](../../../src/lib/services/people.ts#L185). O usuário precisa baixar o CSV do Sheet, abrir o dialog de importação e seguir um wizard. Como a fonte canônica é uma planilha pública, esse fluxo é trabalhoso para o caso comum: "tem N atletas novos no Sheet, quero subir pro banco".

## Escopo

### Dentro do escopo
- Botão "Sync Google Sheet" na aba `/people` (ao lado do `CSVImportDropdown` existente)
- Função `syncPeopleFromGoogleSheet()` em `src/lib/services/people.ts`
- Fetch do CSV via URL configurada em variável de ambiente
- Parse com PapaParse (já usado em [fight-card](../../../src/app/(dashboard)/events/[eventId]/fight-card/page.tsx#L18))
- Mapping fixo dos 13 headers do Sheet → campos do `mma_people`
- Conversão de data DD/MM/YYYY → YYYY-MM-DD
- Reuso de [`importPeopleFromCSV`](../../../src/lib/services/people.ts#L185) com `upsertMode = false` para inserir apenas novos
- Toast com resumo (novos / já existentes / erros)

### Fora do escopo (YAGNI)
- Atualização de registros existentes
- Deleção de atletas que sumiram do Sheet
- Histórico/log de syncs
- Preview antes de sincronizar
- Configuração de URL via UI
- Cron / sync automático
- Suporte a múltiplos Sheets simultâneos
- Modificar o fluxo de importação manual existente (CSVImport continua funcionando)

## Decisões

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Trigger | Botão manual | Auto-sync ao abrir página, cron, híbrido — overkill, sem urgência |
| Fonte da URL | Variável de ambiente `NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL` | Hard-code (engessa), UI configurável (overkill) |
| Política de update | Insert-only (ignora duplicados) | Upsert (não pedido), delete-and-recreate (perigoso) |
| Reuso de código | Reusar `importPeopleFromCSV` existente | Função separada (duplica dedup, batching, normalização) |
| Mapping | Hard-coded no service | UI de mapping (overkill, é sync, não import manual) |
| Formato de data | DD/MM/YYYY confirmado pelo usuário | Detectar formato, fallback para múltiplos formatos |

## Arquitetura

### Fluxo

1. Usuário clica **"Sync Google Sheet"** em [`/people`](../../../src/app/(dashboard)/people/page.tsx)
2. Frontend chama `syncPeopleFromGoogleSheet()` em [`src/lib/services/people.ts`](../../../src/lib/services/people.ts)
3. Service:
   - Lê `process.env.NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL`
   - Faz `fetch(url + "&t=" + Date.now())` (cache busting, mesmo padrão de [stats-service.ts:610](../../../src/lib/services/stats-service.ts#L610))
   - Parse com `Papa.parse(csvText, { header: true, skipEmptyLines: true })`
   - Valida que todos os 13 headers esperados estão presentes
   - Transforma cada linha em `PersonFormData`:
     - Trim em todos os strings
     - `gender.toLowerCase()`
     - Conversão de datas DD/MM/YYYY → YYYY-MM-DD
     - Strings vazias → `null`
   - Chama `importPeopleFromCSV(rows, undefined, true, mapping, false)` — `upsertMode=false` força modo insert-only
4. Toast verde com `success` (novos), `duplicates.length` (já existiam) e `errors.length`
5. `fetchPeople()` é chamado para atualizar a tabela na UI

### Componentes envolvidos

| Arquivo | Mudança |
|---|---|
| `.env.example` | Adicionar linha `NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL=` (vazio, com comentário) |
| `.env.local` | Adicionar a URL real (não commitar — já está no .gitignore) |
| [`src/lib/services/people.ts`](../../../src/lib/services/people.ts) | Nova função exportada `syncPeopleFromGoogleSheet()` |
| [`src/app/(dashboard)/people/page.tsx`](../../../src/app/(dashboard)/people/page.tsx) | Novo botão + estado `syncing` + handler |

### Mapping de colunas

| Coluna do Sheet | Campo `mma_people` | Transformação |
|---|---|---|
| `NAME` | `name` | trim + `normalizeName()` (já existe no serviço) |
| `SURNAME` | `surname` | trim + `normalizeName()`; vazio → null |
| `FULL NAME` | `compiled_name` | trim |
| `EVENT NAME` | `event_name` | trim + `normalizeName()` |
| `GENDER` | `gender` | trim + `toLowerCase()` |
| `PHONE` | `phone` | trim |
| `DOB` | `dob` | DD/MM/YYYY → YYYY-MM-DD; inválido → null |
| `NATIONALITY` | `nationality` | trim |
| `PASSPORT` | `passport_number` | trim |
| `EXPIRY DATE` | `passport_expiry` | DD/MM/YYYY → YYYY-MM-DD; inválido → null |
| `PASSPORT IMAGE` | `passport_photo` | trim (URL como string) |
| `DOCUMENT FOLDER` | `document_folder` | trim (URL como string) |
| `ID` | `fighter_id` | trim |

**Conversão de data:** função utilitária local

```ts
function parseDDMMYYYY(s: string | undefined): string | null {
  if (!s) return null
  const trimmed = s.trim()
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [, dd, mm, yyyy] = match
  const day = dd.padStart(2, '0')
  const month = mm.padStart(2, '0')
  // Validação leve: mês 1-12, dia 1-31
  if (parseInt(month) < 1 || parseInt(month) > 12) return null
  if (parseInt(day) < 1 || parseInt(day) > 31) return null
  return `${yyyy}-${month}-${day}`
}
```

### Detecção de duplicados

Reusada da função existente: chave `normalizeName(name) | normalizeName(surname) | dob`. Se uma linha do Sheet bate com um registro existente, é ignorada e contada em `duplicates`. Isso já é o comportamento padrão de `importPeopleFromCSV` quando `upsertMode = false` e `checkDuplicates = true`.

### Tratamento de erros

| Cenário | Comportamento |
|---|---|
| Env var ausente ou vazia | Botão fica desabilitado com tooltip "Configure NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL" |
| Fetch falha (rede, 404, Sheet privado) | Toast vermelho: "Não foi possível buscar a planilha. Verifique se está pública e a URL está correta." |
| Parse falha (CSV malformado) | Toast vermelho com mensagem do PapaParse |
| Header esperado ausente | Toast vermelho: "Coluna `X` não encontrada na planilha. Headers esperados: NAME, SURNAME, ..." |
| Linha sem `Name` | Pula linha, conta como erro no relatório (comportamento existente) |
| Data inválida | Campo vira `null`, linha continua (sem erro) |
| Duplicado (já existe no DB) | Pula silenciosamente, conta em `duplicates` |
| Sucesso | Toast verde: "N novos atletas sincronizados. M já existiam." Se houve erros: "... K linhas com erro." |

### Estado de loading

Botão troca de "Sync Google Sheet" → "Sincronizando..." com spinner, `disabled` durante a operação. Estado controlado em `useState<boolean>` na página. Sem barra de progresso detalhada — botão simples é suficiente.

## Plano de validação

Esse projeto não tem suíte de testes automatizada visível. Validação manual:

1. **Configurar env:** adicionar `NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL=...` em `.env.local`, restartar dev server
2. **Sync inicial com banco zerado:** rodar sync com banco sem registros → deve inserir todos os atletas do Sheet
3. **Sync repetido:** clicar imediatamente de novo → deve reportar "0 novos, N já existiam" (idempotente)
4. **Adicionar 1 atleta novo no Sheet** → sync → deve reportar "1 novo, N já existiam"
5. **Editar atleta existente no Sheet** (ex. mudar telefone) → sync → atleta no banco deve permanecer **intocado**
6. **Sheet inacessível** (URL errada no env) → toast de erro claro, página continua funcional
7. **Header diferente no Sheet** (renomear "NAME" pra "Nome") → erro indicando coluna ausente
8. **Conferir no Supabase Studio** que datas, telefones e URLs foram gravados corretamente
9. **Confirmar que o botão "Importar CSV" manual continua funcionando** (não regredir o fluxo existente)

## Riscos & considerações

- **CSV exposto publicamente:** a URL do Sheet é pública (`pub?...`). Não há credenciais. Se o Sheet for despublicado, sync para de funcionar — erro tratado.
- **Cache do Google:** Google pode cachear o CSV por alguns minutos. O cache busting com `&t=${Date.now()}` mitiga isso (mesmo padrão do fight-card).
- **Mudança de schema do Sheet:** se alguém renomear colunas no Sheet, sync quebra com erro claro indicando a coluna faltante. Não é silencioso.
- **Linhas inválidas:** linhas sem `NAME` viram erro no relatório, não bloqueiam o sync das demais.
- **Não destrutivo:** como é insert-only e usa dedup, não há risco de sobrescrever ou apagar dados manualmente editados no banco.

## Variável de ambiente

```bash
# .env.example
NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL=
```

```bash
# .env.local (não commitar)
NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/e/2PACX-1vS3MJDKFeeEDL3kFa5zVsPcyCy7eRTZ11siA4bmtBt_4HJotAkaDNJtsMgetv_rzFvO4rKsf9eHqOS-/pub?gid=1272847775&single=true&output=csv
```

`NEXT_PUBLIC_` é necessário porque o fetch acontece no cliente (a página `/people` é `'use client'`).
