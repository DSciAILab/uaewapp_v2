import { createClient } from '@/lib/supabase/client'
import type { Person, PeopleFilters, PaginatedResponse, PersonFormData } from '@/types/database'
import { normalizeName } from '@/lib/utils'
import Papa from 'papaparse'

function getClient() {
  return createClient();
}

/**
 * Convert DD/MM/YYYY to YYYY-MM-DD (Postgres date format).
 * Returns null for empty input or invalid format.
 */
function parseDDMMYYYY(s: string | undefined | null): string | null {
  if (!s) return null
  const trimmed = String(s).trim()
  if (!trimmed) return null
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [, dd, mm, yyyy] = match
  const day = parseInt(dd, 10)
  const month = parseInt(mm, 10)
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  return `${yyyy}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export async function getPeople(filters: PeopleFilters = {}): Promise<PaginatedResponse<Person>> {
  const {
    search,
    nationality,
    hasPassport,
    personIds,
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
        `appadmin_fighter_id.ilike.%${term}%`
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

  // Filtro por ids (ex.: enrolled no evento ativo)
  if (personIds) {
    query = query.in('id', personIds)
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
    data: (data || []) as Person[],
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
  return data as Person | null
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
  return data as Person
}

export async function updatePerson(id: string, formData: Partial<PersonFormData>): Promise<Person> {
  const allowedFields = [
    'name', 'surname', 'compiled_name', 'event_name', 'appadmin_fighter_id',
    'gender', 'phone', 'dob', 'nationality', 'passport_number',
    'passport_expiry', 'passport_photo', 'document_folder', 'height', 'reach'
  ];

  const normalized: any = {}
  
  allowedFields.forEach(field => {
    if (field in formData) {
      normalized[field] = (formData as any)[field];
    }
  });

  if (normalized.name) normalized.name = normalizeName(normalized.name)
  if (normalized.surname !== undefined) normalized.surname = normalized.surname ? normalizeName(normalized.surname) : null
  if (normalized.event_name) normalized.event_name = normalizeName(normalized.event_name)

  const supabase = getClient();
  const { data, error } = await supabase
    .from('mma_people')
    .update(normalized)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Person
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

  const unique = [...new Set(data?.map((d) => d.nationality).filter(Boolean))]
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
  columnMapping?: Record<string, string>,
  upsertMode: boolean = false
): Promise<{ success: number; updated: number; errors: ImportError[]; duplicates: string[] }> {
  console.log('CSV Import: Iniciando processamento de', rows.length, 'linhas. Duplicados:', checkDuplicates, 'Upsert:', upsertMode);
  const errors: ImportError[] = [];
  const duplicates: string[] = []
  let success = 0
  let updated = 0
  const total = rows.length

  const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0))

  const getCsvTitle = (dbField: string) => columnMapping?.[dbField] || dbField;

  const COMPARE_FIELDS = [
    'event_name', 'appadmin_fighter_id', 'gender', 'phone', 'nationality',
    'passport_number', 'passport_expiry', 'passport_photo', 'document_folder',
    'height', 'reach'
  ] as const;

  try {
    const supabase = getClient()
    // Map: dedup key → existing record (with id + all fields)
    const existingMap = new Map<string, any>()

    // 1. Fetch existing records (paginated — PostgREST caps each response at 1000 rows)
    if (checkDuplicates || upsertMode) {
      if (onProgress) onProgress(0, total, upsertMode ? 'Buscando registros existentes para comparação...' : 'Verificando duplicados no banco...')

      const PAGE_SIZE = 1000
      let from = 0
      while (true) {
        const { data: page, error: fetchError } = await supabase
          .from('mma_people')
          .select('id, name, surname, dob, event_name, appadmin_fighter_id, gender, phone, nationality, passport_number, passport_expiry, passport_photo, document_folder, height, reach')
          .order('created_at', { ascending: true })
          .range(from, from + PAGE_SIZE - 1)

        if (fetchError) throw fetchError
        if (!page || page.length === 0) break

        page.forEach((p) => {
          const namePart = normalizeName(p.name)
          const surnamePart = p.surname ? normalizeName(p.surname) : ''
          const dobPart = p.dob || ''
          const key = `${namePart}|${surnamePart}|${dobPart}`
          existingMap.set(key, p)
        })

        if (page.length < PAGE_SIZE) break
        from += PAGE_SIZE
      }
    }

    // 2. Normalization, Filtering & Upsert detection
    if (onProgress) onProgress(0, total, 'Preparando registros...')
    
    const toInsert: any[] = []
    const toUpdate: { id: string; changes: Record<string, any>; fullName: string }[] = []
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
      const fullName = `${row.name}${row.surname ? ' ' + row.surname : ''}${row.dob ? ' (' + row.dob + ')' : ''}`;

      if (localSeen.has(key)) {
        duplicates.push(`${fullName} (Linha ${i + 1}) — duplicado no próprio CSV`)
        continue
      }

      const existingRecord = existingMap.get(key)

      if (existingRecord) {
        if (upsertMode) {
          // Compare fields and collect differences
          const cleanRow: any = {
            event_name: row.event_name ? normalizeName(row.event_name) : null,
            appadmin_fighter_id: row.appadmin_fighter_id || null,
            gender: row.gender || null,
            phone: row.phone || null,
            nationality: row.nationality || null,
            passport_number: row.passport_number || null,
            passport_expiry: row.passport_expiry || null,
            passport_photo: row.passport_photo || null,
            document_folder: row.document_folder || null,
            height: row.height || null,
            reach: row.reach || null,
          }

          const changes: Record<string, any> = {}
          for (const field of COMPARE_FIELDS) {
            const csvValue = cleanRow[field]
            const dbValue = existingRecord[field]
            // Only update if CSV has a non-null value AND it differs from DB
            if (csvValue !== null && csvValue !== undefined && String(csvValue) !== String(dbValue ?? '')) {
              changes[field] = csvValue
            }
          }

          if (Object.keys(changes).length > 0) {
            toUpdate.push({ id: existingRecord.id, changes, fullName: `${fullName} (Linha ${i + 1})` })
          } else {
            duplicates.push(`${fullName} (Linha ${i + 1}) — sem alterações`)
          }
        } else {
          duplicates.push(`${fullName} (Linha ${i + 1})`)
        }
        localSeen.add(key)
        continue
      }

      localSeen.add(key)
      
      const cleanRow: any = {
        name: normalizeName(row.name),
        surname: row.surname ? normalizeName(row.surname) : null,
        event_name: row.event_name ? normalizeName(row.event_name) : null,
        appadmin_fighter_id: row.appadmin_fighter_id || null,
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

    const totalWork = toInsert.length + toUpdate.length
    if (totalWork === 0) {
      return { success: 0, updated: 0, errors, duplicates }
    }

    let processedCount = 0

    // 3. Batch updates (upsert)
    if (toUpdate.length > 0) {
      for (let i = 0; i < toUpdate.length; i++) {
        const { id, changes, fullName } = toUpdate[i]
        
        if (onProgress) {
          const pct = 10 + Math.floor((processedCount / totalWork) * 90)
          onProgress(Math.min(pct, 99), total, `Atualizando existentes (${i + 1} de ${toUpdate.length})`)
        }

        const { error: updateError } = await supabase
          .from('mma_people')
          .update(changes)
          .eq('id', id)

        if (updateError) {
          errors.push({
            fullName,
            column: 'Database',
            csvColumnTitle: 'N/A',
            errorType: 'Erro de Atualização',
            message: updateError.message
          })
        } else {
          updated++
        }
        
        processedCount++
        if (i % 10 === 0) await yieldToUI()
      }
    }

    // 4. Batch inserts (new records)
    const BATCH_SIZE = 50
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE)
      
      if (onProgress) {
        const pct = 10 + Math.floor((processedCount / totalWork) * 90)
        onProgress(
          Math.min(pct, 99),
          total,
          `Inserindo novos (${Math.min(i + BATCH_SIZE, toInsert.length)} de ${toInsert.length})`
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
      
      processedCount += batch.length
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

  console.log('CSV Import: Finalizado. Novos:', success, 'Atualizados:', updated, 'Erros:', errors.length)
  return { success, updated, errors, duplicates }
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

const SHEET_HEADERS = [
  'NAME',
  'SURNAME',
  'FULL NAME',
  'EVENT NAME',
  'GENDER',
  'PHONE',
  'DOB',
  'NATIONALITY',
  'PASSPORT',
  'EXPIRY DATE',
  'PASSPORT IMAGE',
  'DOCUMENT FOLDER',
  'ID',
] as const

/**
 * Map a parsed Google Sheet row (string→string) to PersonFormData.
 * Empty strings become null. Dates are converted DD/MM/YYYY → YYYY-MM-DD.
 * FULL NAME is intentionally ignored: compiled_name is a STORED generated
 * column in the DB (computed from name).
 */
function mapSheetRow(row: Record<string, string>): PersonFormData {
  const get = (key: string) => {
    const v = row[key]
    return v === undefined || v === null ? '' : String(v).trim()
  }
  const orNull = (v: string) => (v === '' ? null : v)

  return {
    name: get('NAME'),
    surname: orNull(get('SURNAME')),
    event_name: orNull(get('EVENT NAME')),
    appadmin_fighter_id: orNull(get('ID')),
    gender: orNull(get('GENDER').toLowerCase()),
    phone: orNull(get('PHONE')),
    dob: parseDDMMYYYY(get('DOB')),
    nationality: orNull(get('NATIONALITY')),
    passport_number: orNull(get('PASSPORT')),
    passport_expiry: parseDDMMYYYY(get('EXPIRY DATE')),
    passport_photo: orNull(get('PASSPORT IMAGE')),
    document_folder: orNull(get('DOCUMENT FOLDER')),
  }
}

/**
 * Sync new athletes from the public Google Sheet CSV into mma_people.
 * Insert-only: existing records (matched by name|surname|dob) are skipped,
 * never updated. URL is configured via NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL.
 *
 * Returns the same shape as importPeopleFromCSV.
 */
export async function syncPeopleFromGoogleSheet(): Promise<{
  success: number
  updated: number
  errors: ImportError[]
  duplicates: string[]
}> {
  const url = process.env.NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL não configurada no .env.local')
  }

  // Cache busting (same pattern used in fight-card)
  const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`
  const response = await fetch(fetchUrl)
  if (!response.ok) {
    throw new Error(`Não foi possível buscar a planilha (HTTP ${response.status}). Verifique se está pública e a URL está correta.`)
  }
  const csvText = await response.text()

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  if (parsed.errors && parsed.errors.length > 0) {
    const first = parsed.errors[0]
    throw new Error(`Erro ao processar CSV: ${first.message} (linha ${first.row ?? '?'})`)
  }

  const headers = parsed.meta.fields ?? []
  const missing = SHEET_HEADERS.filter((h) => !headers.includes(h))
  if (missing.length > 0) {
    throw new Error(`Coluna(s) ausente(s) na planilha: ${missing.join(', ')}. Headers esperados: ${SHEET_HEADERS.join(', ')}`)
  }

  const rows: PersonFormData[] = (parsed.data || [])
    .filter((raw) => {
      // Drop the alternate header row some sheets ship as row 2 (NAME, SURNAME, ...)
      const n = (raw['NAME'] ?? '').trim().toUpperCase()
      const s = (raw['SURNAME'] ?? '').trim().toUpperCase()
      return !(n === 'NAME' && s === 'SURNAME')
    })
    .map(mapSheetRow)
    .filter((r) => r.name && r.name.trim().length > 0)

  // Reuse the existing importer with upsertMode=false → insert-only behavior.
  // columnMapping helps make error messages reference the original Sheet headers.
  const columnMapping: Record<string, string> = {
    name: 'NAME',
    surname: 'SURNAME',
    event_name: 'EVENT NAME',
    appadmin_fighter_id: 'ID',
    gender: 'GENDER',
    phone: 'PHONE',
    dob: 'DOB',
    nationality: 'NATIONALITY',
    passport_number: 'PASSPORT',
    passport_expiry: 'EXPIRY DATE',
    passport_photo: 'PASSPORT IMAGE',
    document_folder: 'DOCUMENT FOLDER',
  }

  return await importPeopleFromCSV(rows, undefined, true, columnMapping, false)
}
