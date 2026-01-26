import { createClient } from '@/lib/supabase/client'
import type { Person, PeopleFilters, PaginatedResponse, PersonFormData } from '@/types/database'
import { normalizeName } from '@/lib/utils'

function getClient() {
  return createClient();
}

export async function getPeople(filters: PeopleFilters = {}): Promise<PaginatedResponse<Person>> {
  const {
    search,
    nationality,
    hasPassport,
    page = 1,
    pageSize = 20,
  } = filters

  const supabase = getClient();
  let query = supabase
    .from('mma_people')
    .select('*', { count: 'exact' })

  // Filtro de busca
  if (search) {
    query = query.or(`compiled_name.ilike.%${search}%,event_name.ilike.%${search}%,passport_number.ilike.%${search}%`)
  }

  // Filtro de nacionalidade
  if (nationality) {
    query = query.eq('nationality', nationality)
  }

  // Filtro de passaporte
  if (hasPassport !== undefined) {
    if (hasPassport) {
      query = query.not('passport_number', 'is', null)
    } else {
      query = query.is('passport_number', null)
    }
  }

  // Ordenação
  query = query.order('compiled_name', { ascending: true })

  // Paginação
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) throw error

  return {
    data: data || [],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
}

export async function getPersonById(id: string): Promise<Person | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_people')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createPerson(formData: PersonFormData): Promise<Person> {
  const normalized = {
    ...formData,
    name: normalizeName(formData.name),
    surname: normalizeName(formData.surname),
    event_name: formData.event_name ? normalizeName(formData.event_name) : null,
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_people')
    .insert(normalized)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePerson(id: string, formData: Partial<PersonFormData>): Promise<Person> {
  const normalized: any = { ...formData }
  
  if (formData.name) normalized.name = normalizeName(formData.name)
  if (formData.surname) normalized.surname = normalizeName(formData.surname)
  if (formData.event_name) normalized.event_name = normalizeName(formData.event_name)

  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_people')
    .update(normalized)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePerson(id: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_people')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function bulkDeletePeople(ids: string[]): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase
    .from('mma_people')
    .delete()
    .in('id', ids)

  if (error) throw error
}

export async function getNationalities(): Promise<string[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_people')
    .select('nationality')
    .not('nationality', 'is', null)
    .order('nationality')

  if (error) throw error

  const unique = [...new Set(data?.map(d => d.nationality).filter(Boolean))]
  return unique as string[]
}

export async function importPeopleFromCSV(
  rows: PersonFormData[], 
  onProgress?: (current: number, total: number, message?: string) => void,
  checkDuplicates: boolean = true
): Promise<{ success: number; errors: string[]; duplicates: string[] }> {
  console.log('CSV Import: Iniciando processamento de', rows.length, 'linhas. Verificar duplicados:', checkDuplicates)
  const errors: string[] = []
  const duplicates: string[] = []
  let success = 0
  const total = rows.length

  const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0))

  try {
    const existingSet = new Set<string>()

    // 1. Fetch existing names (limit to 10k for safety, enough for most use cases)
    // Only if checkDuplicates is true
    if (checkDuplicates) {
      if (onProgress) onProgress(0, total, 'Verificando duplicados no banco...')
      console.log('CSV Import: Buscando registros existentes...')
      
      const supabase = getClient();
      const { data: existingData, error: fetchError } = await supabase
        .from('mma_people')
        .select('name, surname')
        .limit(10000)
      
      if (fetchError) {
        console.error('CSV Import: Erro ao buscar duplicados:', fetchError)
        throw fetchError
      }

      (existingData || []).forEach(p => {
        existingSet.add(`${normalizeName(p.name)}|${normalizeName(p.surname)}`)
      })
      console.log('CSV Import: Encontrados', existingSet.size, 'registros no banco')
    } else {
      console.log('CSV Import: Verificação de duplicados DESATIVADA pelo usuário')
    }

    // 2. Normalization
    if (onProgress) onProgress(0, total, 'Preparando registros...')
    
    const toInsert: any[] = []
    const localSeen = new Set<string>()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.name || !row.surname) {
        errors.push(`Linha ${i + 1}: Nome e sobrenome são obrigatórios`)
        continue
      }

      const key = `${normalizeName(row.name)}|${normalizeName(row.surname)}`
      
      if (existingSet.has(key) || localSeen.has(key)) {
        duplicates.push(`${row.name} ${row.surname} (Linha ${i + 1})`)
        continue
      }

      localSeen.add(key)
      
      const cleanRow: any = { ...row }
      const numFields = ['fighter_id', 'height', 'reach']
      numFields.forEach(f => {
        if (cleanRow[f]) {
          const val = Number(cleanRow[f])
          cleanRow[f] = isNaN(val) ? null : val
        }
      })

      // Ensure mandatory fields are present and strings are trimmed
      toInsert.push({
        ...cleanRow,
        name: normalizeName(row.name),
        surname: normalizeName(row.surname),
        event_name: row.event_name ? normalizeName(row.event_name) : null,
      })

      if (i % 500 === 0 && i > 0) {
        if (onProgress) onProgress(0, total, `Processando planilha (${i} de ${total})...`)
        await yieldToUI()
      }
    }

    console.log('CSV Import: Pronto para inserir', toInsert.length, 'novos registros')

    if (toInsert.length === 0) {
      return { success: 0, errors, duplicates }
    }

    // 3. Batch insert
    const BATCH_SIZE = 100
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE)
      const currentBatchTotal = Math.min(i + BATCH_SIZE, toInsert.length)
      
      if (onProgress) {
        const globalProgress = Math.floor((i / toInsert.length) * total)
        onProgress(
          globalProgress,
          total,
          `Enviando ao banco (${currentBatchTotal} de ${toInsert.length})`
        )
      }

      console.log(`CSV Import: Enviando lote ${Math.floor(i/BATCH_SIZE) + 1}...`)
      const supabase = getClient();
      const { error: insertError } = await supabase
        .from('mma_people')
        .insert(batch)

      if (insertError) {
        console.error('CSV Import: Erro no lote:', insertError)
        errors.push(`Erro no lote ${Math.floor(i / BATCH_SIZE) + 1}: ${insertError.message}`)
      } else {
        success += batch.length
      }
      
      await yieldToUI()
    }

  } catch (err: any) {
    console.error('CSV Import: Erro crítico:', err)
    errors.push(`Erro crítico: ${err.message || 'Falha desconhecida'}`)
  }

  console.log('CSV Import: Finalizado. Sucesso:', success, 'Erros:', errors.length)
  return { success, errors, duplicates }
}

export async function checkDuplicatePerson(name: string, surname: string, excludeId?: string): Promise<boolean> {
  const supabase = getClient();
  let query = supabase
    .from('mma_people')
    .select('id')
    .ilike('name', normalizeName(name))
    .ilike('surname', normalizeName(surname))

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data } = await query
  return (data?.length || 0) > 0
}
