'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, Hospital, History as HistoryIcon, MessageSquareText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MedicalLogEntry, MedicalStatus } from '@/types/medical'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  athleteName: string
  fetchHistory: () => Promise<MedicalLogEntry[]>
}

const STATUS_META: Record<MedicalStatus, { label: string; icon: typeof Clock; tone: string }> = {
  pending: { label: 'Pending', icon: Clock, tone: 'text-muted-foreground' },
  cleared_by_doctor: { label: 'Cleared by Doctor', icon: CheckCircle2, tone: 'text-emerald-600 dark:text-emerald-400' },
  sent_to_hospital: { label: 'Sent to Hospital', icon: Hospital, tone: 'text-red-600 dark:text-red-400' },
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MedicalHistoryDrawer({ open, onOpenChange, athleteName, fetchHistory }: Props) {
  const [entries, setEntries] = useState<MedicalLogEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetchHistory()
      .then((data) => {
        if (!cancelled) setEntries(data)
      })
      .catch((err) => {
        console.error('[MedicalHistoryDrawer]', err)
        if (!cancelled) setEntries([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, fetchHistory])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-muted-foreground" />
            Status History
          </SheetTitle>
          <SheetDescription>{athleteName}</SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading && (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading history…</div>
          )}

          {!loading && entries.length === 0 && (
            <div className="rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No status changes recorded yet.
            </div>
          )}

          {!loading && entries.length > 0 && (
            <ol className="relative border-l-2 border-border ml-2 space-y-5">
              {entries.map((entry) => {
                // Notes rows (field='notes') have no status; render old -> new.
                if (entry.field === 'notes' || !entry.new_status) {
                  const shorten = (v: string | null) =>
                    !v ? '—' : v.length > 60 ? v.slice(0, 57) + '…' : v
                  return (
                    <li key={entry.id} className="ml-6 relative">
                      <span className="absolute -left-[34px] top-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-muted-foreground/40 bg-background">
                        <MessageSquareText className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-muted-foreground">Notes</span>
                          <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground max-w-[220px] truncate">
                            {shorten(entry.old_value)} → {shorten(entry.new_value)}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatDateTime(entry.changed_at)}
                        </span>
                      </div>
                    </li>
                  )
                }

                const meta = STATUS_META[entry.new_status]
                const Icon = meta.icon
                return (
                  <li key={entry.id} className="ml-6 relative">
                    {/* Timeline dot */}
                    <span
                      className={cn(
                        'absolute -left-[34px] top-0 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-background',
                        entry.new_status === 'cleared_by_doctor'
                          ? 'border-emerald-500 dark:border-emerald-400'
                          : entry.new_status === 'sent_to_hospital'
                          ? 'border-red-500 dark:border-red-400'
                          : 'border-muted-foreground/40'
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5', meta.tone)} />
                    </span>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('font-bold text-sm', meta.tone)}>{meta.label}</span>
                        {entry.old_status && (
                          <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                            from {STATUS_META[entry.old_status].label}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatDateTime(entry.changed_at)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
