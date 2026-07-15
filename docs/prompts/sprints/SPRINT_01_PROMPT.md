# SPRINT 01 - People Database

## Contexto

O projeto base foi configurado no Sprint 00. Agora vamos criar o módulo de People Database, que é a base mãe de todas as pessoas do sistema (atletas, corners, staff, guests).

## Dependências

- Sprint 00 concluído
- Banco de dados configurado com tabela `mma_people`

## Objetivo do Sprint

Criar CRUD completo de pessoas com:
- Listagem com busca e filtros
- Cadastro/edição via Drawer
- Importação de CSV
- Normalização automática de nomes
- Visualização de foto via fighter_id

---

## TAREFA 1: Criar Tipos Adicionais

Atualizar `src/types/database.ts`, adicionar ao final:

```typescript
// Filtros e paginação
export interface PeopleFilters {
  search?: string
  nationality?: string
  hasPassport?: boolean
  page?: number
  pageSize?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

// Form types
export interface PersonFormData {
  name: string
  surname: string
  event_name?: string
  fighter_id?: number
  gender?: string
  phone?: string
  dob?: string
  nationality?: string
  passport_number?: string
  passport_expiry?: string
  passport_photo?: string
  document_folder?: string
  height?: number
  reach?: number
}

// CSV Import
export interface CSVMapping {
  csvColumn: string
  dbField: keyof PersonFormData | 'skip'
}

export interface CSVPreviewRow {
  [key: string]: string
}
```

---

## TAREFA 2: Criar Serviço de People

Criar `src/lib/services/people.ts`:

```typescript
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
```

---

## TAREFA 3: Criar Schema de Validação

Criar `src/lib/validations/person.ts`:

```typescript
import { z } from 'zod'

export const personSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  surname: z.string().min(1, 'Sobrenome é obrigatório').max(100),
  event_name: z.string().max(200).optional().nullable(),
  fighter_id: z.coerce.number().optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  dob: z.string().optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  passport_number: z.string().max(50).optional().nullable(),
  passport_expiry: z.string().optional().nullable(),
  passport_photo: z.string().url().optional().nullable().or(z.literal('')),
  document_folder: z.string().url().optional().nullable().or(z.literal('')),
  height: z.coerce.number().min(0).max(3).optional().nullable(),
  reach: z.coerce.number().min(0).max(300).optional().nullable(),
})

export type PersonSchema = z.infer<typeof personSchema>
```

---

## TAREFA 4: Criar Componente PersonForm

Criar `src/components/forms/person-form.tsx`:

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { personSchema, type PersonSchema } from '@/lib/validations/person'
import type { Person } from '@/types/database'
import { getFighterPhotoUrl } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface PersonFormProps {
  person?: Person | null
  onSubmit: (data: PersonSchema) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const GENDERS = ['Male', 'Female', 'Other']

const NATIONALITIES = [
  'BRAZIL', 'USA', 'RUSSIA', 'UNITED KINGDOM', 'AUSTRALIA',
  'CANADA', 'MEXICO', 'JAPAN', 'SOUTH KOREA', 'CHINA',
  'FRANCE', 'GERMANY', 'ITALY', 'SPAIN', 'PORTUGAL',
  'ARGENTINA', 'COLOMBIA', 'PERU', 'CHILE', 'ECUADOR',
  'UAE', 'SAUDI ARABIA', 'EGYPT', 'SOUTH AFRICA', 'NIGERIA',
  'INDIA', 'PAKISTAN', 'PHILIPPINES', 'THAILAND', 'INDONESIA',
  'POLAND', 'UKRAINE', 'NETHERLANDS', 'BELGIUM', 'SWEDEN',
  'NORWAY', 'DENMARK', 'FINLAND', 'IRELAND', 'SCOTLAND',
  'NEW ZEALAND', 'KAZAKHSTAN', 'UZBEKISTAN', 'GEORGIA', 'ARMENIA',
]

export function PersonForm({ person, onSubmit, onCancel, loading }: PersonFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PersonSchema>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      name: person?.name || '',
      surname: person?.surname || '',
      event_name: person?.event_name || '',
      fighter_id: person?.fighter_id || undefined,
      gender: person?.gender || '',
      phone: person?.phone || '',
      dob: person?.dob || '',
      nationality: person?.nationality || '',
      passport_number: person?.passport_number || '',
      passport_expiry: person?.passport_expiry || '',
      passport_photo: person?.passport_photo || '',
      document_folder: person?.document_folder || '',
      height: person?.height || undefined,
      reach: person?.reach || undefined,
    },
  })

  const fighterId = watch('fighter_id')
  const name = watch('name')
  const surname = watch('surname')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Foto do Fighter */}
      {fighterId && (
        <div className="flex justify-center">
          <Avatar className="h-24 w-24">
            <AvatarImage src={getFighterPhotoUrl(fighterId)} alt={`${name} ${surname}`} />
            <AvatarFallback>{name?.[0]}{surname?.[0]}</AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Identificação */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Identificação
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="João"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="surname">Sobrenome *</Label>
            <Input
              id="surname"
              {...register('surname')}
              placeholder="Silva"
            />
            {errors.surname && (
              <p className="text-sm text-red-500">{errors.surname.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="event_name">Nome de Guerra</Label>
            <Input
              id="event_name"
              {...register('event_name')}
              placeholder="João 'Pitbull' Silva"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fighter_id">Fighter ID</Label>
            <Input
              id="fighter_id"
              type="number"
              {...register('fighter_id')}
              placeholder="595"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gender">Gênero</Label>
            <Select
              value={watch('gender') || ''}
              onValueChange={(value) => setValue('gender', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="+55 11 99999-9999"
            />
          </div>
        </div>
      </div>

      {/* Documentos */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Documentos
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dob">Data de Nascimento</Label>
            <Input
              id="dob"
              type="date"
              {...register('dob')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nationality">Nacionalidade</Label>
            <Select
              value={watch('nationality') || ''}
              onValueChange={(value) => setValue('nationality', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {NATIONALITIES.sort().map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="passport_number">Nº Passaporte</Label>
            <Input
              id="passport_number"
              {...register('passport_number')}
              placeholder="AB123456"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passport_expiry">Validade Passaporte</Label>
            <Input
              id="passport_expiry"
              type="date"
              {...register('passport_expiry')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="passport_photo">Link Foto Passaporte (Google Drive)</Label>
          <Input
            id="passport_photo"
            {...register('passport_photo')}
            placeholder="https://drive.google.com/..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="document_folder">Pasta de Documentos (Google Drive)</Label>
          <Input
            id="document_folder"
            {...register('document_folder')}
            placeholder="https://drive.google.com/..."
          />
        </div>
      </div>

      {/* Stats Permanentes */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Stats Permanentes
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="height">Altura (m)</Label>
            <Input
              id="height"
              type="number"
              step="0.01"
              {...register('height')}
              placeholder="1.85"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reach">Envergadura (cm)</Label>
            <Input
              id="reach"
              type="number"
              {...register('reach')}
              placeholder="190"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : person ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
```

---

## TAREFA 5: Criar Componente PeopleTable

Criar `src/components/tables/people-table.tsx`:

```typescript
'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, ExternalLink } from 'lucide-react'
import type { Person } from '@/types/database'
import { getFighterPhotoUrl, formatDate } from '@/lib/utils'

interface PeopleTableProps {
  people: Person[]
  onEdit: (person: Person) => void
  onDelete: (person: Person) => void
  canEdit?: boolean
  canDelete?: boolean
}

export function PeopleTable({
  people,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = false,
}: PeopleTableProps) {
  const isPassportExpired = (expiry?: string) => {
    if (!expiry) return false
    return new Date(expiry) < new Date()
  }

  const isPassportExpiringSoon = (expiry?: string) => {
    if (!expiry) return false
    const sixMonths = new Date()
    sixMonths.setMonth(sixMonths.getMonth() + 6)
    return new Date(expiry) < sixMonths && new Date(expiry) >= new Date()
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12"></TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Nome de Guerra</TableHead>
          <TableHead>Nacionalidade</TableHead>
          <TableHead>Passaporte</TableHead>
          <TableHead>Validade</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {people.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              Nenhuma pessoa encontrada
            </TableCell>
          </TableRow>
        ) : (
          people.map((person) => (
            <TableRow key={person.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell>
                <Avatar className="h-8 w-8">
                  {person.fighter_id ? (
                    <AvatarImage 
                      src={getFighterPhotoUrl(person.fighter_id)} 
                      alt={person.compiled_name} 
                    />
                  ) : null}
                  <AvatarFallback className="text-xs">
                    {person.name[0]}{person.surname[0]}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">{person.compiled_name}</TableCell>
              <TableCell className="text-muted-foreground">
                {person.event_name || '-'}
              </TableCell>
              <TableCell>
                {person.nationality ? (
                  <Badge variant="secondary">{person.nationality}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {person.passport_number || (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {person.passport_expiry ? (
                  <Badge
                    variant={
                      isPassportExpired(person.passport_expiry)
                        ? 'destructive'
                        : isPassportExpiringSoon(person.passport_expiry)
                        ? 'warning'
                        : 'secondary'
                    }
                  >
                    {formatDate(person.passport_expiry)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <DropdownMenuItem onClick={() => onEdit(person)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {person.document_folder && (
                      <DropdownMenuItem asChild>
                        <a href={person.document_folder} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Documentos
                        </a>
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={() => onDelete(person)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
```

---

## TAREFA 6: Criar Componente de Importação CSV

Criar `src/components/forms/csv-import.tsx`:

```typescript
'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { CSVMapping, CSVPreviewRow, PersonFormData } from '@/types/database'

interface CSVImportProps {
  onImport: (data: PersonFormData[]) => Promise<{ success: number; errors: string[] }>
  onCancel: () => void
}

const DB_FIELDS: { value: keyof PersonFormData | 'skip'; label: string }[] = [
  { value: 'skip', label: '-- Ignorar --' },
  { value: 'name', label: 'Nome' },
  { value: 'surname', label: 'Sobrenome' },
  { value: 'event_name', label: 'Nome de Guerra' },
  { value: 'fighter_id', label: 'Fighter ID' },
  { value: 'gender', label: 'Gênero' },
  { value: 'phone', label: 'Telefone' },
  { value: 'dob', label: 'Data de Nascimento' },
  { value: 'nationality', label: 'Nacionalidade' },
  { value: 'passport_number', label: 'Nº Passaporte' },
  { value: 'passport_expiry', label: 'Validade Passaporte' },
  { value: 'passport_photo', label: 'Link Foto Passaporte' },
  { value: 'document_folder', label: 'Pasta de Documentos' },
  { value: 'height', label: 'Altura' },
  { value: 'reach', label: 'Envergadura' },
]

export function CSVImport({ onImport, onCancel }: CSVImportProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'result'>('upload')
  const [csvData, setCsvData] = useState<CSVPreviewRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<CSVMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null)

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        alert('O arquivo deve ter pelo menos um cabeçalho e uma linha de dados')
        return
      }

      const headerLine = lines[0]
      const csvHeaders = headerLine.split(',').map(h => h.trim().replace(/"/g, ''))
      setHeaders(csvHeaders)

      // Parse data rows
      const rows: CSVPreviewRow[] = []
      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
        const row: CSVPreviewRow = {}
        csvHeaders.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        rows.push(row)
      }
      setCsvData(rows)

      // Initialize mappings with auto-detection
      const initialMappings: CSVMapping[] = csvHeaders.map(header => {
        const lowerHeader = header.toLowerCase()
        let dbField: keyof PersonFormData | 'skip' = 'skip'

        if (lowerHeader.includes('name') && !lowerHeader.includes('surname') && !lowerHeader.includes('event')) {
          dbField = 'name'
        } else if (lowerHeader.includes('surname') || lowerHeader.includes('last')) {
          dbField = 'surname'
        } else if (lowerHeader.includes('event') || lowerHeader.includes('guerra') || lowerHeader.includes('compiled')) {
          dbField = 'event_name'
        } else if (lowerHeader.includes('fighter') && lowerHeader.includes('id')) {
          dbField = 'fighter_id'
        } else if (lowerHeader.includes('gender') || lowerHeader.includes('sex')) {
          dbField = 'gender'
        } else if (lowerHeader.includes('phone') || lowerHeader.includes('tel')) {
          dbField = 'phone'
        } else if (lowerHeader.includes('dob') || lowerHeader.includes('birth') || lowerHeader.includes('nascimento')) {
          dbField = 'dob'
        } else if (lowerHeader.includes('national') || lowerHeader.includes('country') || lowerHeader.includes('pais')) {
          dbField = 'nationality'
        } else if (lowerHeader.includes('passport') && lowerHeader.includes('number')) {
          dbField = 'passport_number'
        } else if (lowerHeader.includes('passport') && lowerHeader.includes('expir')) {
          dbField = 'passport_expiry'
        } else if (lowerHeader.includes('height') || lowerHeader.includes('altura')) {
          dbField = 'height'
        } else if (lowerHeader.includes('reach') || lowerHeader.includes('envergadura')) {
          dbField = 'reach'
        }

        return { csvColumn: header, dbField }
      })
      setMappings(initialMappings)
      setStep('mapping')
    }
    reader.readAsText(file)
  }, [])

  const handleMappingChange = (csvColumn: string, dbField: keyof PersonFormData | 'skip') => {
    setMappings(prev =>
      prev.map(m => (m.csvColumn === csvColumn ? { ...m, dbField } : m))
    )
  }

  const handleImport = async () => {
    setLoading(true)
    
    try {
      // Convert CSV data to PersonFormData
      const people: PersonFormData[] = csvData.map(row => {
        const person: any = {}
        mappings.forEach(mapping => {
          if (mapping.dbField !== 'skip') {
            let value = row[mapping.csvColumn]
            
            // Type conversions
            if (mapping.dbField === 'fighter_id' && value) {
              value = parseInt(value, 10) || undefined
            } else if (mapping.dbField === 'height' && value) {
              value = parseFloat(value) || undefined
            } else if (mapping.dbField === 'reach' && value) {
              value = parseFloat(value) || undefined
            }
            
            person[mapping.dbField] = value || undefined
          }
        })
        return person as PersonFormData
      })

      const importResult = await onImport(people)
      setResult(importResult)
      setStep('result')
    } catch (error) {
      console.error('Import error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <Label htmlFor="csv-file" className="cursor-pointer">
              <span className="text-primary font-medium">Clique para selecionar</span>
              <span className="text-muted-foreground"> ou arraste o arquivo CSV</span>
            </Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>O arquivo CSV deve ter:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Primeira linha com os nomes das colunas</li>
              <li>Pelo menos as colunas de Nome e Sobrenome</li>
              <li>Formato UTF-8</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {step === 'mapping' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mapeamento de Colunas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mappings.map((mapping) => (
                  <div key={mapping.csvColumn} className="flex items-center gap-4">
                    <span className="w-48 text-sm font-medium truncate">
                      {mapping.csvColumn}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <Select
                      value={mapping.dbField}
                      onValueChange={(value) =>
                        handleMappingChange(mapping.csvColumn, value as keyof PersonFormData | 'skip')
                      }
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DB_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview (primeiras 5 linhas)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHead key={header} className="whitespace-nowrap">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.map((row, i) => (
                      <TableRow key={i}>
                        {headers.map((header) => (
                          <TableCell key={header} className="whitespace-nowrap">
                            {row[header] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setStep('upload')}>
              Voltar
            </Button>
            <Button onClick={handleImport} disabled={loading}>
              {loading ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                {result.errors.length === 0 ? (
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                ) : (
                  <AlertCircle className="h-12 w-12 text-yellow-500" />
                )}
                <div>
                  <p className="text-lg font-medium">
                    {result.success} pessoa(s) importada(s) com sucesso
                  </p>
                  {result.errors.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {result.errors.length} erro(s) encontrado(s)
                    </p>
                  )}
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-500/10 rounded-lg">
                  <p className="font-medium text-red-500 mb-2">Erros:</p>
                  <ul className="text-sm space-y-1">
                    {result.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={onCancel}>Fechar</Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## TAREFA 7: Criar Página de People

Criar `src/app/(dashboard)/people/page.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { PeopleTable } from '@/components/tables/people-table'
import { PersonForm } from '@/components/forms/person-form'
import { CSVImport } from '@/components/forms/csv-import'
import { Plus, Upload, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  getPeople,
  createPerson,
  updatePerson,
  deletePerson,
  getNationalities,
  importPeopleFromCSV,
} from '@/lib/services/people'
import { usePermissions } from '@/hooks/use-permissions'
import type { Person, PeopleFilters, PersonFormData } from '@/types/database'
import type { PersonSchema } from '@/lib/validations/person'

export default function PeoplePage() {
  const { canEdit, isAdmin } = usePermissions()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<PeopleFilters>({ page: 1, pageSize: 20 })
  const [totalPages, setTotalPages] = useState(1)
  const [nationalities, setNationalities] = useState<string[]>([])

  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [saving, setSaving] = useState(false)

  // CSV Import
  const [isImportOpen, setIsImportOpen] = useState(false)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null)

  const fetchPeople = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getPeople(filters)
      setPeople(result.data)
      setTotalPages(result.totalPages)
    } catch (error) {
      toast.error('Erro ao carregar pessoas')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchNationalities = useCallback(async () => {
    try {
      const result = await getNationalities()
      setNationalities(result)
    } catch (error) {
      console.error('Error fetching nationalities:', error)
    }
  }, [])

  useEffect(() => {
    fetchPeople()
  }, [fetchPeople])

  useEffect(() => {
    fetchNationalities()
  }, [fetchNationalities])

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }))
  }

  const handleNationalityFilter = (nationality: string) => {
    setFilters(prev => ({
      ...prev,
      nationality: nationality === 'all' ? undefined : nationality,
      page: 1,
    }))
  }

  const handleNewPerson = () => {
    setEditingPerson(null)
    setIsDrawerOpen(true)
  }

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person)
    setIsDrawerOpen(true)
  }

  const handleDeleteClick = (person: Person) => {
    setPersonToDelete(person)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!personToDelete) return

    try {
      await deletePerson(personToDelete.id)
      toast.success('Pessoa excluída com sucesso')
      fetchPeople()
    } catch (error) {
      toast.error('Erro ao excluir pessoa')
    } finally {
      setDeleteDialogOpen(false)
      setPersonToDelete(null)
    }
  }

  const handleSubmit = async (data: PersonSchema) => {
    setSaving(true)
    try {
      if (editingPerson) {
        await updatePerson(editingPerson.id, data as PersonFormData)
        toast.success('Pessoa atualizada com sucesso')
      } else {
        await createPerson(data as PersonFormData)
        toast.success('Pessoa criada com sucesso')
      }
      setIsDrawerOpen(false)
      fetchPeople()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar pessoa')
    } finally {
      setSaving(false)
    }
  }

  const handleImport = async (data: PersonFormData[]) => {
    const result = await importPeopleFromCSV(data)
    if (result.success > 0) {
      fetchPeople()
    }
    return result
  }

  const clearFilters = () => {
    setFilters({ page: 1, pageSize: 20 })
  }

  const hasFilters = filters.search || filters.nationality

  return (
    <div className="flex flex-col h-full">
      <Header
        title="People Database"
        description="Base de dados de todas as pessoas"
        actions={
          canEdit('people') && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Importar CSV
              </Button>
              <Button onClick={handleNewPerson}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Pessoa
              </Button>
            </div>
          )
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, passaporte..."
                    className="pl-9"
                    value={filters.search || ''}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
              </div>

              <Select
                value={filters.nationality || 'all'}
                onValueChange={handleNationalityFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Nacionalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {nationalities.map((nat) => (
                    <SelectItem key={nat} value={nat}>
                      {nat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button variant="ghost" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <PeopleTable
              people={people}
              onEdit={handleEditPerson}
              onDelete={handleDeleteClick}
              canEdit={canEdit('people')}
              canDelete={isAdmin}
            />
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page === 1}
              onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
            >
              Anterior
            </Button>
            <span className="py-2 px-4 text-sm">
              Página {filters.page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page === totalPages}
              onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>

      {/* Drawer: New/Edit Person */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingPerson ? 'Editar Pessoa' : 'Nova Pessoa'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <PersonForm
              person={editingPerson}
              onSubmit={handleSubmit}
              onCancel={() => setIsDrawerOpen(false)}
              loading={saving}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog: CSV Import */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar CSV</DialogTitle>
          </DialogHeader>
          <CSVImport
            onImport={handleImport}
            onCancel={() => setIsImportOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir {personToDelete?.compiled_name}?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

---

## TAREFA 8: Adicionar Badge Variant Warning

Atualizar `src/components/ui/badge.tsx`, adicionar variant warning:

```typescript
// Dentro de badgeVariants, adicionar:
warning: "border-transparent bg-yellow-500 text-white hover:bg-yellow-500/80",
```

O arquivo completo deve ficar assim (adapte ao seu):

```typescript
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        warning:
          "border-transparent bg-yellow-500 text-white hover:bg-yellow-500/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

---

## VERIFICAÇÃO FINAL

Após executar todas as tarefas:

```bash
pnpm dev
```

Deve:
1. Acessar `/people`
2. Ver listagem vazia (ainda sem dados)
3. Clicar em "Nova Pessoa" e ver drawer com formulário
4. Clicar em "Importar CSV" e ver modal de importação
5. Busca e filtros devem funcionar

---

## Critérios de Aceitação

- [ ] Listagem de pessoas funciona
- [ ] Cadastro de nova pessoa funciona
- [ ] Edição de pessoa funciona
- [ ] Exclusão de pessoa funciona (apenas admin)
- [ ] Busca por nome/passaporte funciona
- [ ] Filtro por nacionalidade funciona
- [ ] Importação de CSV funciona
- [ ] Normalização de nomes (primeira letra maiúscula)
- [ ] Foto do fighter aparece quando tem fighter_id
- [ ] Badge de passaporte expirado/expirando funciona

---

## Arquivos Criados/Modificados

```
src/
├── types/database.ts (atualizado)
├── lib/
│   ├── services/people.ts (novo)
│   └── validations/person.ts (novo)
├── components/
│   ├── forms/
│   │   ├── person-form.tsx (novo)
│   │   └── csv-import.tsx (novo)
│   ├── tables/
│   │   └── people-table.tsx (novo)
│   └── ui/badge.tsx (atualizado)
└── app/(dashboard)/people/page.tsx (novo)
```

---

## Próximo Sprint

**SPRINT_02**: Events + Enrolled (CRUD de eventos, fightcard, enrollment de pessoas)
