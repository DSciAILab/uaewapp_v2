'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { MedicalSummary } from '@/types/medical'
import { cn } from '@/lib/utils'

interface Props {
  summary: MedicalSummary
}

const ROW_LABELS: Array<{ key: 'pending' | 'cleared' | 'hospital'; label: string; tone: string }> = [
  { key: 'pending', label: 'Pending', tone: 'text-muted-foreground' },
  { key: 'cleared', label: 'Cleared by Doctor', tone: 'text-green-700 dark:text-green-400' },
  { key: 'hospital', label: 'Sent to Hospital', tone: 'text-red-700 dark:text-red-400' },
]

export function MedicalSummaryCard({ summary }: Props) {
  return (
    <Card>
      <CardContent className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left pb-2 font-medium"></th>
              <th className="text-center pb-2 font-medium text-red-600 dark:text-red-400">Red</th>
              <th className="text-center pb-2 font-medium text-blue-600 dark:text-blue-400">Blue</th>
              <th className="text-center pb-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {ROW_LABELS.map((row) => (
              <tr key={row.key} className="border-t">
                <td className={cn('py-2 font-medium', row.tone)}>{row.label}</td>
                <td className="py-2 text-center font-bold">{summary.red[row.key]}</td>
                <td className="py-2 text-center font-bold">{summary.blue[row.key]}</td>
                <td className="py-2 text-center font-bold">{summary.total[row.key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
