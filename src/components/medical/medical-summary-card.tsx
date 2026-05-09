'use client'

import type { MedicalSummary } from '@/types/medical'
import { cn } from '@/lib/utils'

interface Props {
  summary: MedicalSummary
}

type Bucket = { key: 'pending' | 'cleared' | 'hospital'; label: string; tone: string }

const BUCKETS: Bucket[] = [
  { key: 'pending', label: 'Pending', tone: 'text-muted-foreground' },
  { key: 'cleared', label: 'Cleared', tone: 'text-emerald-700 dark:text-emerald-400' },
  { key: 'hospital', label: 'Hospital', tone: 'text-red-700 dark:text-red-400' },
]

interface PanelProps {
  title: string
  totals: { pending: number; cleared: number; hospital: number }
  variant: 'red' | 'blue' | 'total'
}

function CornerPanel({ title, totals, variant }: PanelProps) {
  const styles = {
    red: {
      container:
        'bg-red-50/70 border-red-200 dark:bg-red-950/20 dark:border-red-900/40',
      title: 'text-red-700 dark:text-red-400',
    },
    blue: {
      container:
        'bg-blue-50/70 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40',
      title: 'text-blue-700 dark:text-blue-400',
    },
    total: {
      container: 'bg-card border-border',
      title: 'text-foreground',
    },
  }[variant]

  const total = totals.pending + totals.cleared + totals.hospital

  return (
    <div
      className={cn(
        'rounded-lg border p-4 flex flex-col gap-3 transition-colors',
        styles.container
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-xs font-bold uppercase tracking-wider', styles.title)}>
          {title}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {total} total
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {BUCKETS.map((b) => (
          <div
            key={b.key}
            className="flex flex-col items-center justify-center rounded-md bg-background/60 dark:bg-background/30 px-2 py-2 border border-border/50"
          >
            <span className={cn('text-2xl font-bold leading-none tabular-nums', b.tone)}>
              {totals[b.key]}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1.5 font-medium">
              {b.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MedicalSummaryCard({ summary }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <CornerPanel title="Red Corner" totals={summary.red} variant="red" />
      <CornerPanel title="Blue Corner" totals={summary.blue} variant="blue" />
      <CornerPanel title="Total" totals={summary.total} variant="total" />
    </div>
  )
}
