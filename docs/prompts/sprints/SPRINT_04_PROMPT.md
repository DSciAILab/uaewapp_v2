# SPRINT 04 - Visas (Vistos)

## Contexto

Os Sprints 00, 01, 02 e 03 estão concluídos. Temos autenticação, People Database, Events, Enrollments e Flights funcionando. Agora vamos criar o módulo de Visas para gerenciar vistos dos enrolled.

## Dependências

- Sprints 00-03 concluídos
- Tabela `mma_visas` no banco
- Enrollments com `needs_visa = true`

## Objetivo do Sprint

- CRUD de vistos vinculados ao enrollment
- Workflow de status (1-6): Not Required → Required → Applied → Approved → Rejected → Resident
- Upload de documentos (link Google Drive)
- Listagem com filtros por status e nacionalidade
- Indicadores visuais por status

---

## TAREFA 1: Criar Serviço de Visas

Criar `src/lib/services/visas.ts`:

```typescript
import { createClient } from '@/lib/supabase/client'
import type { Visa, VisaStatus, Enrollment } from '@/types/database'

const supabase = createClient()

export interface VisaWithEnrollment extends Visa {
  enrollment: Enrollment & {
    person: {
      id: string
      compiled_name: string
      event_name: string | null
      fighter_id: number | null
      nationality: string | null
      passport_number: string | null
      passport_expiry: string | null
    }
    role: {
      id: string
      name: string
      code: string
    }
    event_code: string
  }
}

export interface VisaFilters {
  eventId?: string
  status?: VisaStatus
  isDone?: boolean
  nationality?: string
  search?: string
}

export async function getVisasByEvent(eventId: string, filters: VisaFilters = {}): Promise<VisaWithEnrollment[]> {
  let query = supabase
    .from('mma_visas')
    .select(`
      *,
      enrollment:mma_enrollments!inner(
        id,
        event_id,
        event_code,
        person:mma_people(
          id,
          compiled_name,
          event_name,
          fighter_id,
          nationality,
          passport_number,
          passport_expiry
        ),
        role:mma_roles(
          id,
          name,
          code
        )
      )
    `)
    .eq('enrollment.event_id', eventId)

  if (filters.status !== undefined) {
    query = query.eq('status', filters.status)
  }

  if (filters.isDone !== undefined) {
    query = query.eq('is_done', filters.isDone)
  }

  if (filters.nationality) {
    query = query.eq('nationality', filters.nationality)
  }

  if (filters.search) {
    query = query.or(`
      passport_name.ilike.%${filters.search}%,
      enrollment.person.compiled_name.ilike.%${filters.search}%,
      enrollment.event_code.ilike.%${filters.search}%
    `)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) throw error
  return (data || []) as VisaWithEnrollment[]
}

export async function getVisaByEnrollment(enrollmentId: string): Promise<Visa | null> {
  const { data, error } = await supabase
    .from('mma_visas')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getVisaById(id: string): Promise<VisaWithEnrollment | null> {
  const { data, error } = await supabase
    .from('mma_visas')
    .select(`
      *,
      enrollment:mma_enrollments(
        id,
        event_id,
        event_code,
        person:mma_people(
          id,
          compiled_name,
          event_name,
          fighter_id,
          nationality,
          passport_number,
          passport_expiry
        ),
        role:mma_roles(
          id,
          name,
          code
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as VisaWithEnrollment
}

export interface VisaFormData {
  enrollment_id: string
  passport_name?: string
  nationality?: string
  departure_airport?: string
  document_link?: string
  status?: VisaStatus
  is_done?: boolean
  notes?: string
}

export async function createVisa(formData: VisaFormData): Promise<Visa> {
  const { data, error } = await supabase
    .from('mma_visas')
    .insert({
      ...formData,
      status: formData.status || 2, // Required by default
      is_done: formData.is_done || false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateVisa(id: string, formData: Partial<VisaFormData>): Promise<Visa> {
  // Se status for Approved (4) ou Not Required (1), marcar como done
  const updateData = { ...formData }
  if (formData.status === 4 || formData.status === 1) {
    updateData.is_done = true
  }

  const { data, error } = await supabase
    .from('mma_visas')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteVisa(id: string): Promise<void> {
  const { error } = await supabase
    .from('mma_visas')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getEnrollmentsNeedingVisa(eventId: string): Promise<any[]> {
  // Get enrollments that need visa but don't have one yet
  const { data: enrollments, error: enrollError } = await supabase
    .from('mma_enrollments')
    .select(`
      id,
      event_code,
      needs_visa,
      person:mma_people(
        id,
        compiled_name,
        event_name,
        fighter_id,
        nationality,
        passport_number,
        passport_expiry
      ),
      role:mma_roles(
        id,
        name,
        code
      )
    `)
    .eq('event_id', eventId)
    .eq('status', 'active')
    .eq('needs_visa', true)

  if (enrollError) throw enrollError

  // Get existing visas for this event
  const { data: visas, error: visaError } = await supabase
    .from('mma_visas')
    .select('enrollment_id')
    .in('enrollment_id', enrollments?.map(e => e.id) || [])

  if (visaError) throw visaError

  const existingVisaEnrollmentIds = new Set(visas?.map(v => v.enrollment_id) || [])

  // Filter enrollments without visas
  return (enrollments || []).filter(e => !existingVisaEnrollmentIds.has(e.id))
}

export async function getVisaStats(eventId: string) {
  const { data, error } = await supabase
    .from('mma_visas')
    .select(`
      id,
      status,
      is_done,
      enrollment:mma_enrollments!inner(event_id)
    `)
    .eq('enrollment.event_id', eventId)

  if (error) throw error

  const visas = data || []
  
  return {
    total: visas.length,
    notRequired: visas.filter(v => v.status === 1).length,
    required: visas.filter(v => v.status === 2).length,
    applied: visas.filter(v => v.status === 3).length,
    approved: visas.filter(v => v.status === 4).length,
    rejected: visas.filter(v => v.status === 5).length,
    resident: visas.filter(v => v.status === 6).length,
    done: visas.filter(v => v.is_done).length,
    pending: visas.filter(v => !v.is_done).length,
  }
}

export async function getNationalitiesInEvent(eventId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('mma_visas')
    .select(`
      nationality,
      enrollment:mma_enrollments!inner(event_id)
    `)
    .eq('enrollment.event_id', eventId)
    .not('nationality', 'is', null)

  if (error) throw error

  const nationalities = [...new Set(data?.map(v => v.nationality).filter(Boolean))]
  return nationalities.sort() as string[]
}
```

---

## TAREFA 2: Criar Schema de Validação

Criar `src/lib/validations/visa.ts`:

```typescript
import { z } from 'zod'

export const visaSchema = z.object({
  enrollment_id: z.string().uuid(),
  passport_name: z.string().max(200).optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  departure_airport: z.string().max(10).optional().nullable(),
  document_link: z.string().url().optional().nullable().or(z.literal('')),
  status: z.coerce.number().min(1).max(6).optional(),
  is_done: z.boolean().optional(),
  notes: z.string().optional().nullable(),
})

export type VisaSchema = z.infer<typeof visaSchema>
```

---

## TAREFA 3: Criar Componente VisaForm

Criar `src/components/forms/visa-form.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { AlertCircle } from 'lucide-react'
import { visaSchema, type VisaSchema } from '@/lib/validations/visa'
import { getEnrollmentsNeedingVisa, type VisaWithEnrollment } from '@/lib/services/visas'
import { getFighterPhotoUrl, formatDate } from '@/lib/utils'
import { VISA_STATUS_LABELS, VISA_STATUS_COLORS } from '@/lib/constants'

interface VisaFormProps {
  eventId: string
  visa?: VisaWithEnrollment | null
  onSubmit: (data: VisaSchema) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const STATUS_OPTIONS = [
  { value: 1, label: 'Not Required', color: 'bg-gray-500' },
  { value: 2, label: 'Required', color: 'bg-red-500' },
  { value: 3, label: 'Applied', color: 'bg-yellow-500' },
  { value: 4, label: 'Approved', color: 'bg-green-500' },
  { value: 5, label: 'Rejected', color: 'bg-red-700' },
  { value: 6, label: 'Resident', color: 'bg-blue-500' },
]

export function VisaForm({
  eventId,
  visa,
  onSubmit,
  onCancel,
  loading,
}: VisaFormProps) {
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loadingEnrollments, setLoadingEnrollments] = useState(!visa)
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VisaSchema>({
    resolver: zodResolver(visaSchema),
    defaultValues: {
      enrollment_id: visa?.enrollment_id || '',
      passport_name: visa?.passport_name || '',
      nationality: visa?.nationality || '',
      departure_airport: visa?.departure_airport || '',
      document_link: visa?.document_link || '',
      status: visa?.status || 2,
      is_done: visa?.is_done || false,
      notes: visa?.notes || '',
    },
  })

  useEffect(() => {
    if (visa) {
      setSelectedEnrollment(visa.enrollment)
      // Pre-fill from person data if not set
      if (!visa.passport_name && visa.enrollment?.person?.compiled_name) {
        setValue('passport_name', visa.enrollment.person.compiled_name)
      }
      if (!visa.nationality && visa.enrollment?.person?.nationality) {
        setValue('nationality', visa.enrollment.person.nationality)
      }
      return
    }

    async function loadEnrollments() {
      try {
        const data = await getEnrollmentsNeedingVisa(eventId)
        setEnrollments(data)
      } catch (error) {
        console.error('Error loading enrollments:', error)
      } finally {
        setLoadingEnrollments(false)
      }
    }
    loadEnrollments()
  }, [eventId, visa, setValue])

  const handleEnrollmentChange = (enrollmentId: string) => {
    setValue('enrollment_id', enrollmentId)
    const enrollment = enrollments.find(e => e.id === enrollmentId)
    setSelectedEnrollment(enrollment)
    
    // Pre-fill from person data
    if (enrollment?.person) {
      setValue('passport_name', enrollment.person.compiled_name || '')
      setValue('nationality', enrollment.person.nationality || '')
    }
  }

  const status = watch('status')
  const isDone = watch('is_done')

  // Check passport expiry
  const passportExpiry = selectedEnrollment?.person?.passport_expiry
  const isPassportExpired = passportExpiry && new Date(passportExpiry) < new Date()
  const isPassportExpiringSoon = passportExpiry && !isPassportExpired && 
    new Date(passportExpiry) < new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Pessoa */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Pessoa
        </h3>

        {visa ? (
          // Modo edição
          <div className="p-4 bg-muted rounded-lg flex items-center gap-4">
            <Avatar className="h-12 w-12">
              {visa.enrollment.person?.fighter_id && (
                <AvatarImage src={getFighterPhotoUrl(visa.enrollment.person.fighter_id)} />
              )}
              <AvatarFallback>
                {visa.enrollment.person?.compiled_name?.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{visa.enrollment.person?.compiled_name}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{visa.enrollment.event_code}</Badge>
                <Badge variant="secondary">{visa.enrollment.role?.name}</Badge>
              </div>
            </div>
          </div>
        ) : (
          // Modo criação
          <>
            {loadingEnrollments ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : enrollments.length === 0 ? (
              <p className="text-muted-foreground">
                Todas as pessoas que precisam de visto já têm registro.
              </p>
            ) : (
              <Select
                value={watch('enrollment_id')}
                onValueChange={handleEnrollmentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma pessoa" />
                </SelectTrigger>
                <SelectContent>
                  {enrollments.map((enrollment) => (
                    <SelectItem key={enrollment.id} value={enrollment.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {enrollment.event_code}
                        </Badge>
                        <span>{enrollment.person?.compiled_name}</span>
                        <span className="text-muted-foreground">
                          ({enrollment.person?.nationality})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        )}

        {selectedEnrollment && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                {selectedEnrollment.person?.fighter_id && (
                  <AvatarImage src={getFighterPhotoUrl(selectedEnrollment.person.fighter_id)} />
                )}
                <AvatarFallback>
                  {selectedEnrollment.person?.compiled_name?.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedEnrollment.person?.compiled_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedEnrollment.person?.nationality}
                </p>
              </div>
            </div>

            {/* Passport Info */}
            <div className="text-sm space-y-1 pt-2 border-t">
              <p>
                <span className="text-muted-foreground">Passaporte:</span>{' '}
                {selectedEnrollment.person?.passport_number || 'Não informado'}
              </p>
              <p className="flex items-center gap-2">
                <span className="text-muted-foreground">Validade:</span>{' '}
                {selectedEnrollment.person?.passport_expiry ? (
                  <>
                    {formatDate(selectedEnrollment.person.passport_expiry)}
                    {isPassportExpired && (
                      <Badge variant="destructive" className="text-xs">Expirado</Badge>
                    )}
                    {isPassportExpiringSoon && (
                      <Badge variant="warning" className="text-xs">Expira em breve</Badge>
                    )}
                  </>
                ) : (
                  'Não informado'
                )}
              </p>
            </div>

            {/* Warnings */}
            {(isPassportExpired || isPassportExpiringSoon) && (
              <div className="flex items-center gap-2 text-yellow-600 bg-yellow-500/10 p-2 rounded">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  {isPassportExpired 
                    ? 'Passaporte expirado! Verifique antes de solicitar visto.'
                    : 'Passaporte expira em menos de 6 meses.'}
                </span>
              </div>
            )}
          </div>
        )}

        {errors.enrollment_id && (
          <p className="text-sm text-red-500">Selecione uma pessoa</p>
        )}
      </div>

      {/* Dados do Visto */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Dados do Visto
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="passport_name">Nome no Passaporte</Label>
            <Input
              id="passport_name"
              {...register('passport_name')}
              placeholder="Nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nationality">Nacionalidade</Label>
            <Input
              id="nationality"
              {...register('nationality')}
              placeholder="BRAZIL"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="departure_airport">Aeroporto de Partida</Label>
          <Input
            id="departure_airport"
            {...register('departure_airport')}
            placeholder="GRU"
            maxLength={10}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="document_link">Link do Documento (Google Drive)</Label>
          <Input
            id="document_link"
            {...register('document_link')}
            placeholder="https://drive.google.com/..."
          />
        </div>
      </div>

      {/* Status */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Status
        </h3>

        <div className="space-y-2">
          <Label>Status do Visto</Label>
          <Select
            value={String(status)}
            onValueChange={(value) => setValue('status', Number(value) as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${opt.color}`} />
                    <span>{opt.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_done"
            checked={isDone}
            onCheckedChange={(checked) => setValue('is_done', !!checked)}
          />
          <Label htmlFor="is_done" className="cursor-pointer">
            Marcar como concluído
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder="Informações adicionais..."
            rows={3}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : visa ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  )
}
```

---

## TAREFA 4: Criar Componente VisasTable

Criar `src/components/tables/visas-table.tsx`:

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
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'
import type { VisaWithEnrollment } from '@/lib/services/visas'
import { getFighterPhotoUrl } from '@/lib/utils'
import { VISA_STATUS_LABELS, VISA_STATUS_COLORS } from '@/lib/constants'

interface VisasTableProps {
  visas: VisaWithEnrollment[]
  onEdit: (visa: VisaWithEnrollment) => void
  onDelete: (visa: VisaWithEnrollment) => void
  onToggleDone: (visa: VisaWithEnrollment) => void
  canEdit?: boolean
  canDelete?: boolean
}

export function VisasTable({
  visas,
  onEdit,
  onDelete,
  onToggleDone,
  canEdit = true,
  canDelete = false,
}: VisasTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">Done</TableHead>
          <TableHead className="w-20">ID</TableHead>
          <TableHead>Pessoa</TableHead>
          <TableHead>Nacionalidade</TableHead>
          <TableHead>Aeroporto</TableHead>
          <TableHead>Documento</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visas.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
              Nenhum visto cadastrado
            </TableCell>
          </TableRow>
        ) : (
          visas.map((visa) => (
            <TableRow key={visa.id} className={visa.is_done ? 'opacity-60' : ''}>
              <TableCell>
                <Checkbox
                  checked={visa.is_done}
                  onCheckedChange={() => onToggleDone(visa)}
                  disabled={!canEdit}
                />
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono">
                  {visa.enrollment?.event_code}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {visa.enrollment?.person?.fighter_id && (
                      <AvatarImage
                        src={getFighterPhotoUrl(visa.enrollment.person.fighter_id)}
                      />
                    )}
                    <AvatarFallback className="text-xs">
                      {visa.enrollment?.person?.compiled_name?.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {visa.passport_name || visa.enrollment?.person?.compiled_name}
                    </p>
                    {visa.enrollment?.person?.passport_number && (
                      <p className="text-sm text-muted-foreground">
                        {visa.enrollment.person.passport_number}
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {visa.nationality || visa.enrollment?.person?.nationality || '-'}
                </Badge>
              </TableCell>
              <TableCell>
                {visa.departure_airport || '-'}
              </TableCell>
              <TableCell>
                {visa.document_link ? (
                  <a
                    href={visa.document_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver
                  </a>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={VISA_STATUS_COLORS[visa.status]}>
                  {VISA_STATUS_LABELS[visa.status]}
                </Badge>
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
                      <>
                        <DropdownMenuItem onClick={() => onEdit(visa)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleDone(visa)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {visa.is_done ? 'Marcar pendente' : 'Marcar concluído'}
                        </DropdownMenuItem>
                      </>
                    )}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-500"
                          onClick={() => onDelete(visa)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </>
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

## TAREFA 5: Criar Página de Visas

Criar `src/app/(dashboard)/visas/page.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VisasTable } from '@/components/tables/visas-table'
import { VisaForm } from '@/components/forms/visa-form'
import {
  Plus,
  Search,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getVisasByEvent,
  createVisa,
  updateVisa,
  deleteVisa,
  getVisaStats,
  getNationalitiesInEvent,
  type VisaWithEnrollment,
  type VisaFilters,
} from '@/lib/services/visas'
import { getActiveEvents } from '@/lib/services/events'
import { usePermissions } from '@/hooks/use-permissions'
import { VISA_STATUS_LABELS } from '@/lib/constants'
import type { Event, VisaStatus } from '@/types/database'
import type { VisaSchema } from '@/lib/validations/visa'

export default function VisasPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventIdParam = searchParams.get('event')
  
  const { canEdit, isAdmin } = usePermissions()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>(eventIdParam || '')
  const [visas, setVisas] = useState<VisaWithEnrollment[]>([])
  const [stats, setStats] = useState<any>(null)
  const [nationalities, setNationalities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<VisaFilters>({})

  // Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingVisa, setEditingVisa] = useState<VisaWithEnrollment | null>(null)
  const [saving, setSaving] = useState(false)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [visaToDelete, setVisaToDelete] = useState<VisaWithEnrollment | null>(null)

  // Load events
  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await getActiveEvents()
        setEvents(data)
        if (data.length > 0 && !selectedEventId) {
          setSelectedEventId(data[0].id)
        }
      } catch (error) {
        toast.error('Erro ao carregar eventos')
      }
    }
    loadEvents()
  }, [])

  // Load visas
  const fetchVisas = useCallback(async () => {
    if (!selectedEventId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [visasData, statsData, nationalitiesData] = await Promise.all([
        getVisasByEvent(selectedEventId, filters),
        getVisaStats(selectedEventId),
        getNationalitiesInEvent(selectedEventId),
      ])
      setVisas(visasData)
      setStats(statsData)
      setNationalities(nationalitiesData)
    } catch (error) {
      toast.error('Erro ao carregar vistos')
    } finally {
      setLoading(false)
    }
  }, [selectedEventId, filters])

  useEffect(() => {
    fetchVisas()
  }, [fetchVisas])

  // Update URL
  useEffect(() => {
    if (selectedEventId) {
      router.push(`/visas?event=${selectedEventId}`, { scroll: false })
    }
  }, [selectedEventId, router])

  const handleNewVisa = () => {
    setEditingVisa(null)
    setIsDrawerOpen(true)
  }

  const handleEditVisa = (visa: VisaWithEnrollment) => {
    setEditingVisa(visa)
    setIsDrawerOpen(true)
  }

  const handleDeleteClick = (visa: VisaWithEnrollment) => {
    setVisaToDelete(visa)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!visaToDelete) return

    try {
      await deleteVisa(visaToDelete.id)
      toast.success('Visto excluído com sucesso')
      fetchVisas()
    } catch (error) {
      toast.error('Erro ao excluir visto')
    } finally {
      setDeleteDialogOpen(false)
      setVisaToDelete(null)
    }
  }

  const handleToggleDone = async (visa: VisaWithEnrollment) => {
    try {
      await updateVisa(visa.id, { is_done: !visa.is_done })
      toast.success(visa.is_done ? 'Marcado como pendente' : 'Marcado como concluído')
      fetchVisas()
    } catch (error) {
      toast.error('Erro ao atualizar visto')
    }
  }

  const handleSubmit = async (data: VisaSchema) => {
    setSaving(true)
    try {
      if (editingVisa) {
        await updateVisa(editingVisa.id, data)
        toast.success('Visto atualizado com sucesso')
      } else {
        await createVisa(data)
        toast.success('Visto criado com sucesso')
      }
      setIsDrawerOpen(false)
      fetchVisas()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar visto')
    } finally {
      setSaving(false)
    }
  }

  const selectedEvent = events.find(e => e.id === selectedEventId)

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Vistos"
        description={selectedEvent ? `Vistos para ${selectedEvent.name}` : 'Selecione um evento'}
        actions={
          canEdit('visas') && selectedEventId && (
            <Button onClick={handleNewVisa}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Visto
            </Button>
          )
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <Select
                value={selectedEventId}
                onValueChange={setSelectedEventId}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Selecione um evento" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome..."
                    className="pl-9"
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
              </div>

              <Select
                value={filters.status !== undefined ? String(filters.status) : 'all'}
                onValueChange={(value) =>
                  setFilters(prev => ({
                    ...prev,
                    status: value === 'all' ? undefined : Number(value) as VisaStatus,
                  }))
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(VISA_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {nationalities.length > 0 && (
                <Select
                  value={filters.nationality || 'all'}
                  onValueChange={(value) =>
                    setFilters(prev => ({
                      ...prev,
                      nationality: value === 'all' ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger className="w-[150px]">
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
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {stats && selectedEventId && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{stats.total}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold">{stats.pending}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Applied
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold">{stats.applied}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Approved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">{stats.approved}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rejected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold">{stats.rejected}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Table */}
        {selectedEventId ? (
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Carregando...
                </div>
              ) : (
                <VisasTable
                  visas={visas}
                  onEdit={handleEditVisa}
                  onDelete={handleDeleteClick}
                  onToggleDone={handleToggleDone}
                  canEdit={canEdit('visas')}
                  canDelete={isAdmin}
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Selecione um evento para ver os vistos
            </CardContent>
          </Card>
        )}
      </div>

      {/* Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingVisa ? 'Editar Visto' : 'Novo Visto'}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {selectedEventId && (
              <VisaForm
                eventId={selectedEventId}
                visa={editingVisa}
                onSubmit={handleSubmit}
                onCancel={() => setIsDrawerOpen(false)}
                loading={saving}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o visto de{' '}
              {visaToDelete?.enrollment?.person?.compiled_name}?
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

## VERIFICAÇÃO FINAL

Após executar todas as tarefas:

```bash
pnpm dev
```

Deve:
1. Acessar `/visas`
2. Selecionar um evento
3. Ver listagem de vistos
4. Clicar em "Novo Visto"
5. Selecionar pessoa que precisa de visto
6. Ver dados pré-preenchidos (nome, nacionalidade)
7. Ver alerta se passaporte expirado
8. Alterar status (1-6)
9. Marcar como concluído
10. Ver stats por status

---

## Critérios de Aceitação

- [ ] Seletor de evento funciona
- [ ] Listagem de vistos por evento funciona
- [ ] Criar visto funciona
- [ ] Editar visto funciona
- [ ] Excluir visto funciona (admin)
- [ ] Status workflow funciona (1-6)
- [ ] Badge de cores por status
- [ ] Checkbox "Done" funciona
- [ ] Filtro por status funciona
- [ ] Filtro por nacionalidade funciona
- [ ] Busca funciona
- [ ] Alerta de passaporte expirado aparece
- [ ] Stats por status aparecem

---

## Arquivos Criados/Modificados

```
src/
├── lib/
│   ├── services/
│   │   └── visas.ts (novo)
│   └── validations/
│       └── visa.ts (novo)
├── components/
│   ├── forms/
│   │   └── visa-form.tsx (novo)
│   └── tables/
│       └── visas-table.tsx (novo)
└── app/(dashboard)/visas/
    └── page.tsx (novo)
```

---

## Próximo Sprint

**SPRINT_05**: Hotels + Transport (reservas, divergências, carros, drivers)
