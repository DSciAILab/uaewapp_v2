# 📥 Importação CSV

> **Componentes:** `CSVImportDropdown`, `GenericCSVImport`
> **Disponível em:** 6 páginas

---

## O que é?

Sistema de importação em massa por arquivo CSV. Permite importar centenas de registros de uma vez, com mapeamento de colunas e preview antes de confirmar.

---

## Onde está disponível?

| Página | Identificação | Template |
|--------|---------------|----------|
| [[03 - People]] | Nome + Sobrenome | `people_import_template.csv` |
| [[04 - Flights]] | Passport Name | `flight_import_template.csv` |
| [[07 - Hotels]] | Passport Name | `hotel_import_template.csv` |
| [[09 - Stats]] | Passport Name | `stats_import_template.csv` |
| [[10 - Music]] | Fighter ID | `music_import_template.csv` |
| [[08 - Transport]] | Nome do Motorista | `drivers_import_template.csv` |

---

## Como funciona?

### 1. Botão Dropdown
Cada página tem um botão com ícone de CSV que abre 2 opções:
- **📥 Baixar Template** — baixa um CSV modelo com as colunas esperadas e uma linha de exemplo
- **📤 Importar CSV** — abre o fluxo de importação

### 2. Fluxo de Importação (4 Etapas)

#### Etapa 1: Upload
- Arrastar ou selecionar arquivo `.csv` ou `.txt`
- Aceita delimitadores: `,`, `;`, `\t`, `|` (detecta automaticamente)
- Remove BOM e caracteres nulos

#### Etapa 2: Mapear Colunas
- Lista das colunas do CSV à esquerda
- Dropdown para selecionar o campo correspondente à direita
- Mostra exemplo da primeira linha
- Campo obrigatório indicado (ex: Passport Name)

#### Etapa 3: Preview
- Mostra pré-visualização das primeiras 8 linhas
- Total de registros que serão processados
- Toggle de **Upsert** (Atualizar Existentes):
  - ✅ ON → se a pessoa já tem registro, atualiza com os novos dados
  - ❌ OFF → pula registros que já existem

#### Etapa 4: Resultado
- Cards com contadores:
  - 🟢 **Novos** — registros criados
  - 🔵 **Atualizados** — registros atualizados (upsert)
  - 🟡 **Não Encontrados** — passport name não bateu com ninguém
  - 🔴 **Erros** — falhas de gravação
- Lista detalhada de erros e não-encontrados

---

## Matching por Nome

Para páginas que usam Passport Name, o sistema:
1. Busca todos os enrollments **ativos** do evento
2. Normaliza nomes (lowercase, trim)
3. Compara contra `compiled_name` e `event_name` da pessoa
4. Se não encontrar → conta como "Não Encontrado"

---

## Dicas
- Use o **template** antes de importar para garantir formato correto
- O CSV pode usar `,` ou `;` como separador — o sistema auto-detecta
- Nomes devem ser **exatamente como estão no passaporte**
- Para atualizar dados existentes, deixe o toggle **Atualizar Existentes** ativado
