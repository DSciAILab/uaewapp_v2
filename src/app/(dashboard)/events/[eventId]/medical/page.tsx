'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Copy, Download, ExternalLink, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { createClient } from '@/lib/supabase/client'
import {
  getMedicalData,
  updateMedicalStatus,
  updateMedicalNotes,
  getMedicalHistory,
  computeMedicalSummary,
} from '@/lib/services/medical-service'
import { MedicalSummaryCard } from '@/components/medical/medical-summary-card'
import { MedicalTable } from '@/components/medical/medical-table'
import { usePermissions } from '@/hooks/use-permissions'
import type { MedicalLogEntry, MedicalRow, MedicalStatus } from '@/types/medical'

const STATUS_LABEL: Record<MedicalStatus, string> = {
  pending: 'Pending',
  cleared_by_doctor: 'Cleared by Doctor',
  sent_to_hospital: 'Sent to Hospital',
}

export default function MedicalPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const [rows, setRows] = useState<MedicalRow[]>([])
  const [eventName, setEventName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const { canEdit, isAdmin, loading: permissionsLoading } = usePermissions()
  const canEditMedical = isAdmin || canEdit('pre_event')

  const summary = useMemo(() => computeMedicalSummary(rows), [rows])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getMedicalData(eventId)
      setRows(result)
      if (result.length > 0 && result[0].event_name) setEventName(result[0].event_name)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load medical data')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime sync — reload on any change to this event's clearances
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`medical-${eventId}`)
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
    // Optimistic update
    setRows((prev) => prev.map((r) => (r.enrolled_id === enrolledId ? { ...r, status } : r)))
    try {
      await updateMedicalStatus(eventId, enrolledId, status)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save status')
      loadData() // revert
    }
  }

  const handleChangeNotes = async (enrolledId: string, notes: string | null) => {
    setRows((prev) => prev.map((r) => (r.enrolled_id === enrolledId ? { ...r, notes } : r)))
    try {
      await updateMedicalNotes(eventId, enrolledId, notes)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save notes')
      loadData()
    }
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/public/medical/${eventId}`
    navigator.clipboard.writeText(url)
    toast.success('Public link copied to clipboard')
  }

  const handleOpenPublic = () => {
    window.open(`/public/medical/${eventId}`, '_blank')
  }

  const handleDownloadPdf = async () => {
    if (rows.length === 0) {
      toast.error('No data to export')
      return
    }
    const toastId = toast.loading('Generating PDF report...')
    try {
      // Fetch every athlete's history in parallel
      const histories = await Promise.all(
        rows.map(async (r) => {
          try {
            const log = await getMedicalHistory(eventId, r.enrolled_id)
            return [r.enrolled_id, log] as const
          } catch {
            return [r.enrolled_id, [] as MedicalLogEntry[]] as const
          }
        })
      )
      const historyMap = new Map(histories)

      const doc = new jsPDF({ orientation: 'landscape' })

      doc.setFontSize(16)
      doc.text(`${eventName || 'Event'} — Medical Clearance Report`, 14, 14)
      doc.setFontSize(9)
      doc.setTextColor(120)
      doc.text(`Generated: ${new Date().toLocaleString('pt-BR')}`, 14, 20)

      // Summary line
      doc.setFontSize(10)
      doc.setTextColor(0)
      const totals = summary.total
      doc.text(
        `Pending: ${totals.pending}   |   Cleared by Doctor: ${totals.cleared}   |   Sent to Hospital: ${totals.hospital}   |   Total: ${rows.length}`,
        14,
        27
      )

      // Sort by fight order for the report (matches default sort)
      const ordered = [...rows].sort((a, b) => (a.fight_order ?? 999) - (b.fight_order ?? 999))

      const body = ordered.map((r) => {
        const log = historyMap.get(r.enrolled_id) || []
        const historyText = log.length === 0
          ? '—'
          : log
              .map((e) => {
                const when = new Date(e.changed_at).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const from = e.old_status ? `${STATUS_LABEL[e.old_status]} → ` : ''
                return `${when}  ${from}${STATUS_LABEL[e.new_status]}`
              })
              .join('\n')

        const wasHospital = r.was_at_hospital && r.status !== 'sent_to_hospital' ? ' (was at hospital)' : ''
        return [
          r.fight_order?.toString() ?? '-',
          r.corner ?? '-',
          r.person.compiled_name,
          r.person.fighter_id ?? '-',
          STATUS_LABEL[r.status] + wasHospital,
          r.notes || '—',
          historyText,
        ]
      })

      autoTable(doc, {
        startY: 32,
        head: [['#', 'Corner', 'Fighter', 'ID', 'Current Status', 'Notes', 'History']],
        body,
        theme: 'striped',
        styles: { fontSize: 8, valign: 'top', cellPadding: 2 },
        headStyles: { fillColor: [38, 38, 38], textColor: 255, fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: 50 },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 45 },
          5: { cellWidth: 50 },
          6: { cellWidth: 'auto' },
        },
        didParseCell: (data) => {
          if (data.section !== 'body') return
          const row = ordered[data.row.index]
          if (!row) return
          // Tint Corner cell + Status cell by corner / status
          if (data.column.index === 1) {
            if (row.corner === 'RED') data.cell.styles.fillColor = [254, 226, 226]
            else if (row.corner === 'BLUE') data.cell.styles.fillColor = [219, 234, 254]
          }
          if (data.column.index === 4) {
            if (row.status === 'cleared_by_doctor') {
              data.cell.styles.fillColor = [220, 252, 231]
              data.cell.styles.textColor = [21, 128, 61]
            } else if (row.status === 'sent_to_hospital') {
              data.cell.styles.fillColor = [254, 226, 226]
              data.cell.styles.textColor = [185, 28, 28]
            }
          }
        },
      })

      const safeName = (eventName || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      const stamp = new Date().toISOString().slice(0, 10)
      doc.save(`medical-clearance-${safeName}-${stamp}.pdf`)
      toast.success('PDF report downloaded', { id: toastId })
    } catch (err: any) {
      console.error('[medical] pdf export failed:', err)
      toast.error(err.message || 'Failed to generate PDF', { id: toastId })
    }
  }

  return (
    <div className="flex flex-col h-full space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {eventName ? `${eventName} — Medical Clearance` : 'Medical Clearance'}
          </h2>
          <p className="text-muted-foreground">
            Time médico avalia e libera atletas para a luta.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={rows.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyLink} title="Copy Public Link">
            <Copy className="mr-2 h-4 w-4" /> Copy Link
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenPublic}>
            <ExternalLink className="mr-2 h-4 w-4" /> Public Monitor
          </Button>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <MedicalSummaryCard summary={summary} />

      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading medical data...</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/10 border-dashed">
          <p className="font-medium text-lg">No athletes found for this event.</p>
          <p className="text-muted-foreground text-sm">Ensure athletes are enrolled in the system.</p>
        </div>
      ) : (
        <MedicalTable
          rows={rows}
          onChangeStatus={handleChangeStatus}
          onChangeNotes={handleChangeNotes}
          fetchHistory={(enrolledId) => getMedicalHistory(eventId, enrolledId)}
          readOnly={!permissionsLoading && !canEditMedical}
        />
      )}
    </div>
  )
}
