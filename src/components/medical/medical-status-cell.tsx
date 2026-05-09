'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MedicalStatus } from '@/types/medical'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<MedicalStatus, string> = {
  pending: 'Pending',
  cleared_by_doctor: 'Cleared by Doctor',
  sent_to_hospital: 'Sent to Hospital',
}

const STATUS_CLASSES: Record<MedicalStatus, string> = {
  pending: 'bg-muted text-muted-foreground border-muted',
  cleared_by_doctor:
    'bg-green-50 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900',
  sent_to_hospital:
    'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900',
}

interface Props {
  value: MedicalStatus
  onChange: (next: MedicalStatus) => void
  disabled?: boolean
}

export function MedicalStatusCell({ value, onChange, disabled }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as MedicalStatus)} disabled={disabled}>
      <SelectTrigger className={cn('h-8 min-w-[180px] text-xs font-medium', STATUS_CLASSES[value])}>
        <SelectValue placeholder="Pending" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pending">{STATUS_LABELS.pending}</SelectItem>
        <SelectItem value="cleared_by_doctor">{STATUS_LABELS.cleared_by_doctor}</SelectItem>
        <SelectItem value="sent_to_hospital">{STATUS_LABELS.sent_to_hospital}</SelectItem>
      </SelectContent>
    </Select>
  )
}

export { STATUS_LABELS as MEDICAL_STATUS_LABELS }
