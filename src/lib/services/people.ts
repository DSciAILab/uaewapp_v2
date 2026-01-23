import { createClient } from '@/lib/supabase/client'
import type { Person, PeopleFilters, PaginatedResponse, PersonFormData } from '@/types/database'
import { normalizeName } from '@/lib/utils'

const supabase = createClient()

export async function getPeople(filters: PeopleFilters = {}): Promise<PaginatedResponse<Person>> {
  const {
    search,
    nationality,
    hasPassport,
    page = 1,
    pageSize = 20,
  } = filters

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
  const { error } = await supabase
    .from('mma_people')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getNationalities(): Promise<string[]> {
  const { data, error } = await supabase
    .from('mma_people')
    .select('nationality')
    .not('nationality', 'is', null)
    .order('nationality')

  if (error) throw error

  const unique = [...new Set(data?.map(d => d.nationality).filter(Boolean))]
  return unique as string[]
}

export async function importPeopleFromCSV(rows: PersonFormData[]): Promise<{ success: number; errors: string[] }> {
  const errors: string[] = []
  let success = 0

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i]
      
      // Validação mínima
      if (!row.name || !row.surname) {
        errors.push(`Linha ${i + 1}: Nome e sobrenome são obrigatórios`)
        continue
      }

      await createPerson(row)
      success++
    } catch (error: any) {
      errors.push(`Linha ${i + 1}: ${error.message}`)
    }
  }

  return { success, errors }
}

export async function checkDuplicatePerson(name: string, surname: string, excludeId?: string): Promise<boolean> {
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
