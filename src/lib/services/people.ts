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

  // Filtro de busca (suporta múltiplos termos separados por vírgula)
  if (search) {
    const terms = search.split(',').map(t => t.trim()).filter(t => t.length > 0)
    if (terms.length > 0) {
      const orConditions = terms.flatMap(term => [
        `compiled_name.ilike.%${term}%`,
        `event_name.ilike.%${term}%`,
        `passport_number.ilike.%${term}%`,
        `phone.ilike.%${term}%`,
        `fighter_id.ilike.%${term}%`
      ]).join(',')
      query = query.or(orConditions)
    }
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
    surname: formData.surname ? normalizeName(formData.surname) : null,
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
  if (formData.surname !== undefined) normalized.surname = formData.surname ? normalizeName(formData.surname) : null
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
  const BATCH_SIZE = 50;

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('mma_people')
      .delete()
      .in('id', batch);

    if (error) {
      console.error(`Erro ao deletar lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
      throw error;
    }
  }
}

export async function getNationalities(): Promise<string[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_people')
    .select('nationality')
    .not('nationality', 'is', null)
    .order('nationality')

  if (error) throw error

  const unique = [...new Set(data?.map((d: any) => d.nationality).filter(Boolean))]
  return unique as string[]
}

export interface ImportError {
  fullName: string;
  column: string; // Database field or generic label
  csvColumnTitle?: string; // The original CSV column header
  errorType: string;
  message: string;
}

export async function importPeopleFromCSV(
  rows: PersonFormData[], 
  onProgress?: (current: number, total: number, message?: string) => void,
  checkDuplicates: boolean = true,
  columnMapping?: Record<string, string> // maps dbField to csvColumn
): Promise<{ success: number; errors: ImportError[]; duplicates: string[] }> {
  console.log('CSV Import: Iniciando processamento de', rows.length, 'linhas. Verificar duplicados:', checkDuplicates);
  const errors: ImportError[] = [];
  const duplicates: string[] = []
  let success = 0
  const total = rows.length

  const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0))

  const getCsvTitle = (dbField: string) => columnMapping?.[dbField] || dbField;

  try {
    const supabase = getClient()
    const existingSet = new Set<string>()

    // 1. Fetch existing names
    if (checkDuplicates) {
      if (onProgress) onProgress(0, total, 'Verificando duplicados no banco...')
      
      const { data: existingData, error: fetchError } = await supabase
        .from('mma_people')
        .select('name, surname, dob')
        .limit(10000)
      
      if (fetchError) throw fetchError;

      const dataToProcess = existingData || [];
      dataToProcess.forEach((p: any) => {
        const namePart = normalizeName(p.name);
        const surnamePart = p.surname ? normalizeName(p.surname) : '';
        const dobPart = p.dob || '';
        const key = `${namePart}|${surnamePart}|${dobPart}`;
        existingSet.add(key);
      });
    }

    // 2. Normalization & Filtering
    if (onProgress) onProgress(0, total, 'Preparando registros...')
    
    const toInsert: any[] = []
    const localSeen = new Set<string>()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.name) {
        errors.push({
          fullName: 'Desconhecido',
          column: 'name',
          csvColumnTitle: getCsvTitle('name'),
          errorType: 'Validação',
          message: `Nome é obrigatório (Linha ${i + 1})`
        });
        continue;
      }

      const namePart = normalizeName(row.name);
      const surnamePart = row.surname ? normalizeName(row.surname) : '';
      const dobPart = row.dob || '';
      const key = `${namePart}|${surnamePart}|${dobPart}`;
      
      if (existingSet.has(key) || localSeen.has(key)) {
        duplicates.push(`${row.name}${row.surname ? ' ' + row.surname : ''}${row.dob ? ' (' + row.dob + ')' : ''} (Linha ${i + 1})`)
        continue
      }

      localSeen.add(key)
      
      // Clean up fields for insertion
      const cleanRow: any = {
        name: normalizeName(row.name),
        surname: row.surname ? normalizeName(row.surname) : null,
        event_name: row.event_name ? normalizeName(row.event_name) : null,
        fighter_id: row.fighter_id || null,
        gender: row.gender || null,
        phone: row.phone || null,
        dob: row.dob || null,
        nationality: row.nationality || null,
        passport_number: row.passport_number || null,
        passport_expiry: row.passport_expiry || null,
        passport_photo: row.passport_photo || null,
        document_folder: row.document_folder || null,
        height: row.height || null,
        reach: row.reach || null,
      }

      toInsert.push(cleanRow)

      if (i % 100 === 0 && onProgress) {
        onProgress(Math.floor((i / total) * 10), total, `Preparando registros (${i}/${total})...`)
        await yieldToUI()
      }
    }

    if (toInsert.length === 0) {
      return { success: 0, errors, duplicates }
    }

    // 3. Batch insert
    const BATCH_SIZE = 50 // Reduced batch size for better stability
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE)
      const currentBatchTotal = Math.min(i + BATCH_SIZE, toInsert.length)
      
      if (onProgress) {
        // Start from 10% and go to 100%
        const globalProgress = 10 + Math.floor((i / toInsert.length) * 90)
        onProgress(
          Math.min(globalProgress, 99),
          total,
          `Enviando ao banco (${currentBatchTotal} de ${toInsert.length})`
        )
      }

      const { error: insertError } = await supabase
        .from('mma_people')
        .insert(batch)

      if (insertError) {
        console.error('CSV Import: Erro no lote:', insertError);
        batch.forEach(item => {
          errors.push({
            fullName: `${item.name} ${item.surname || ''}`.trim(),
            column: 'Database',
            csvColumnTitle: 'N/A',
            errorType: 'Erro de Inserção',
            message: insertError.message
          });
        });
      } else {
        success += batch.length
      }
      
      await yieldToUI()
    }

  } catch (err: any) {
    console.error('CSV Import: Erro crítico:', err);
    errors.push({
      fullName: 'Geral',
      column: 'Sistema',
      csvColumnTitle: 'N/A',
      errorType: 'Crítico',
      message: err.message || 'Falha desconhecida'
    });
  }

  console.log('CSV Import: Finalizado. Sucesso:', success, 'Erros:', errors.length)
  return { success, errors, duplicates }
}

export async function checkDuplicatePerson(name: string, surname?: string | null, dob?: string | null, excludeId?: string): Promise<boolean> {
  const supabase = getClient();
  let query = supabase
    .from('mma_people')
    .select('id')
    .ilike('name', normalizeName(name))

  if (surname) {
    query = query.ilike('surname', normalizeName(surname))
  } else {
    query = query.is('surname', null)
  }

  if (dob) {
    query = query.eq('dob', dob)
  } else {
    query = query.is('dob', null)
  }

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data } = await query
  return (data?.length || 0) > 0
}
