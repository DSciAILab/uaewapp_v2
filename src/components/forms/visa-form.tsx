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
import type { VisaStatus } from '@/types/database'

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
      if (!visa.document_link && (visa.enrollment?.person as any)?.document_folder) {
        setValue('document_link', (visa.enrollment.person as any).document_folder)
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
      // Auto-fill docs link if available
      if (enrollment.person.document_folder) {
        setValue('document_link', enrollment.person.document_folder)
      }
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
              {visa.enrollment.person?.appadmin_fighter_id && (
                <AvatarImage src={getFighterPhotoUrl(visa.enrollment.person.appadmin_fighter_id)} />
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

        {selectedEnrollment && !visa && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                {selectedEnrollment.person?.appadmin_fighter_id && (
                  <AvatarImage src={getFighterPhotoUrl(selectedEnrollment.person.appadmin_fighter_id)} />
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
                      <Badge className="text-xs bg-yellow-500">Expira em breve</Badge>
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
            onValueChange={(value) => setValue('status', Number(value) as VisaStatus)}
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