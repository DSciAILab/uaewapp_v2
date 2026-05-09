'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  getPublicMedicalData,
  updateMedicalStatusPublic,
  updateMedicalNotesPublic,
  getPublicMedicalHistory,
} from '@/lib/actions/public-medical'
import { computeMedicalSummary } from '@/lib/services/medical-service'
import { MedicalSummaryCard } from '@/components/medical/medical-summary-card'
import { MedicalTable } from '@/components/medical/medical-table'
import type { MedicalRow, MedicalStatus } from '@/types/medical'

interface Props {
  params: Promise<{ eventId: string }>
}

export default function PublicMedicalPage({ params }: Props) {
  const { eventId } = use(params)
  const [rows, setRows] = useState<MedicalRow[]>([])
  const [loading, setLoading] = useState(true)

  const summary = useMemo(() => computeMedicalSummary(rows), [rows])
  const eventName = rows[0]?.event_name ?? ''

  const loadData = useCallback(async () => {
    try {
      const result = await getPublicMedicalData(eventId)
      setRows(result)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime — same channel as the internal page
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

  const handleChangeStatus = async (enrolledId: string, status: MedicalStatus) => {
    setRows((prev) => prev.map((r) => (r.enrolled_id === enrolledId ? { ...r, status } : r)))
    const result = await updateMedicalStatusPublic(eventId, enrolledId, status)
    if (!result.success) {
      toast.error(result.error || 'Failed to save status')
      loadData()
    }
  }

  const handleChangeNotes = async (enrolledId: string, notes: string | null) => {
    setRows((prev) => prev.map((r) => (r.enrolled_id === enrolledId ? { ...r, notes } : r)))
    const result = await updateMedicalNotesPublic(eventId, enrolledId, notes)
    if (!result.success) {
      toast.error(result.error || 'Failed to save notes')
      loadData()
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <h1 className="text-xl font-bold">
          {eventName ? `${eventName} — Medical Clearance` : 'Medical Clearance'}
        </h1>

        <MedicalSummaryCard summary={summary} />

        {loading && rows.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">No athletes found for this event.</div>
        ) : (
          <MedicalTable
            rows={rows}
            onChangeStatus={handleChangeStatus}
            onChangeNotes={handleChangeNotes}
            fetchHistory={(enrolledId) => getPublicMedicalHistory(eventId, enrolledId)}
          />
        )}
      </div>
    </div>
  )
}
