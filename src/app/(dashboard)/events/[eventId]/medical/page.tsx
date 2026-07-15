'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, Copy, Download, ExternalLink, RefreshCw, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { createClient } from '@/lib/supabase/client'
import { getDataUrl } from '@/lib/utils'
import {
  getMedicalData,
  updateMedicalStatus,
  updateMedicalNotes,
  getMedicalHistory,
  resetEventMedicalStatus,
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
  const [resetOpen, setResetOpen] = useState(false)
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetting, setResetting] = useState(false)

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

  const handleResetConfirm = async () => {
    setResetting(true)
    try {
      const deleted = await resetEventMedicalStatus(eventId)
      toast.success(`Reset complete — ${deleted} record${deleted === 1 ? '' : 's'} cleared`)
      setResetOpen(false)
      setResetConfirm('')
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset statuses')
    } finally {
      setResetting(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (rows.length === 0) {
      toast.error('No data to export')
      return
    }
    const toastId = toast.loading('Generating PDF report...')
    try {
      // Sort by fight order for the report (matches default sort)
      const ordered = [...rows].sort((a, b) => (a.fight_order ?? 999) - (b.fight_order ?? 999))

      // Fetch histories AND photos in parallel
      const [histories, photoEntries] = await Promise.all([
        Promise.all(
          ordered.map(async (r) => {
            try {
              const log = await getMedicalHistory(eventId, r.enrolled_id)
              return [r.enrolled_id, log] as const
            } catch {
              return [r.enrolled_id, [] as MedicalLogEntry[]] as const
            }
          })
        ),
        Promise.all(
          ordered.map(async (r) => {
            if (!r.person.photo_url) return [r.enrolled_id, null] as const
            const dataUrl = await getDataUrl(r.person.photo_url)
            return [r.enrolled_id, dataUrl] as const
          })
        ),
      ])
      const historyMap = new Map(histories)
      const photoMap = new Map(photoEntries)

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
          '', // Photo placeholder — drawn in didDrawCell
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
        head: [['#', 'Photo', 'Corner', 'Fighter', 'ID', 'Current Status', 'Notes', 'History']],
        body,
        theme: 'striped',
        styles: { fontSize: 8, valign: 'top', cellPadding: 2, minCellHeight: 16 },
        headStyles: { fillColor: [38, 38, 38], textColor: 255, fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center', valign: 'middle' },
          1: { cellWidth: 16, halign: 'center', valign: 'middle' },
          2: { cellWidth: 16, halign: 'center', valign: 'middle' },
          3: { cellWidth: 46 },
          4: { cellWidth: 16, halign: 'center' },
          5: { cellWidth: 42 },
          6: { cellWidth: 46 },
          7: { cellWidth: 'auto' },
        },
        didParseCell: (data) => {
          if (data.section !== 'body') return
          const row = ordered[data.row.index]
          if (!row) return
          // Tint Corner cell + Status cell by corner / status
          if (data.column.index === 2) {
            if (row.corner === 'RED') data.cell.styles.fillColor = [254, 226, 226]
            else if (row.corner === 'BLUE') data.cell.styles.fillColor = [219, 234, 254]
          }
          if (data.column.index === 5) {
            if (row.status === 'cleared_by_doctor') {
              data.cell.styles.fillColor = [220, 252, 231]
              data.cell.styles.textColor = [21, 128, 61]
            } else if (row.status === 'sent_to_hospital') {
              data.cell.styles.fillColor = [254, 226, 226]
              data.cell.styles.textColor = [185, 28, 28]
            }
          }
        },
        didDrawCell: (data) => {
          if (data.section !== 'body' || data.column.index !== 1) return
          const row = ordered[data.row.index]
          if (!row) return
          const dataUrl = photoMap.get(row.enrolled_id)
          if (!dataUrl) return
          try {
            const dim = Math.min(data.cell.height, data.cell.width) - 2
            const x = data.cell.x + (data.cell.width - dim) / 2
            const y = data.cell.y + (data.cell.height - dim) / 2
            // Detect format from data URL prefix
            const fmt = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
            doc.addImage(dataUrl, fmt, x, y, dim, dim)
            // Corner-colored ring
            if (row.corner === 'RED' || row.corner === 'BLUE') {
              const ringColor: [number, number, number] = row.corner === 'RED' ? [220, 38, 38] : [37, 99, 235]
              doc.setDrawColor(...ringColor)
              doc.setLineWidth(0.6)
              doc.rect(x, y, dim, dim)
            }
          } catch (err) {
            console.warn('[medical pdf] image add failed:', err)
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
          {canEditMedical && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetOpen(true)}
              disabled={rows.length === 0}
              className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Reset Status
            </Button>
          )}
        </div>
      </div>

      <Dialog
        open={resetOpen}
        onOpenChange={(o) => {
          if (resetting) return
          setResetOpen(o)
          if (!o) setResetConfirm('')
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Reset all medical statuses?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <span className="block">
                This will permanently delete the medical clearance and history for{' '}
                <span className="font-bold text-foreground">every athlete</span> in{' '}
                <span className="font-bold text-foreground">{eventName || 'this event'}</span>.
              </span>
              <span className="block">All athletes will return to <strong>Pending</strong> and the timeline log will be wiped. This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label htmlFor="reset-confirm" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Type <span className="font-mono text-foreground">RESET</span> to confirm
            </label>
            <Input
              id="reset-confirm"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="RESET"
              autoComplete="off"
              autoFocus
              disabled={resetting}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setResetOpen(false)
                setResetConfirm('')
              }}
              disabled={resetting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetConfirm}
              disabled={resetConfirm !== 'RESET' || resetting}
            >
              {resetting ? 'Resetting…' : 'Reset all statuses'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
