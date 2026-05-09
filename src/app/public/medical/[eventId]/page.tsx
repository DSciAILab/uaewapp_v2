'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getPublicMedicalData, getPublicMedicalHistory } from '@/lib/actions/public-medical'
import { computeMedicalSummary } from '@/lib/services/medical-service'
import { MedicalSummaryCard } from '@/components/medical/medical-summary-card'
import { MedicalTable } from '@/components/medical/medical-table'
import type { MedicalRow } from '@/types/medical'

interface Props {
  params: Promise<{ eventId: string }>
}

export default function PublicMedicalPage({ params }: Props) {
  const { eventId } = use(params)
  const [rows, setRows] = useState<MedicalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const summary = useMemo(() => computeMedicalSummary(rows), [rows])
  const eventName = rows[0]?.event_name ?? ''

  const loadData = useCallback(async () => {
    try {
      const result = await getPublicMedicalData(eventId)
      setRows(result)
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime — read-only mirror of the internal page
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`medical-public-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mma_medical_clearance', filter: `event_id=eq.${eventId}` },
        () => loadData()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, loadData])

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h1 className="text-xl font-bold">
              {eventName ? `${eventName} — Medical Clearance` : 'Medical Clearance'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 font-medium">
                <Eye className="h-3 w-3" />
                Read-only monitor
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        <MedicalSummaryCard summary={summary} />

        {loading && rows.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">No athletes found for this event.</div>
        ) : (
          <MedicalTable
            rows={rows}
            fetchHistory={(enrolledId) => getPublicMedicalHistory(eventId, enrolledId)}
            readOnly
          />
        )}
      </div>
    </div>
  )
}
