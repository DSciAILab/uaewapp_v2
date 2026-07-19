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
  REPORT_TABLE_STYLES,
  buildReportFilename,
  drawAthleteCell,
  drawAthletePhoto,
  drawReportFooters,
  loadBrandLogo,
  repeatingHeader,
} from '@/lib/pdf/identity'
import { getWhereaboutsMap } from '@/lib/pdf/whereabouts'
import { useUser } from '@/hooks/use-user'
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
  const { user } = useUser()

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

      // Fetch histories, photos, brand mark and whereabouts in parallel
      const [histories, photoEntries, logoDataUrl, whereabouts] = await Promise.all([
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
        loadBrandLogo(),
        getWhereaboutsMap(eventId),
      ])
      const historyMap = new Map(histories)
      const photoMap = new Map(photoEntries)

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      const totals = summary.total
      // Header is drawn per page by repeatingHeader below, not once up front.
      const headerOptions = {
        eventName: eventName || 'Event',
        documentTitle: 'Medical Clearance Report',
        printedBy: user?.name || user?.email,
        breakdown: `${rows.length} fighters · ${totals.cleared} cleared · ${totals.pending} pending · ${totals.hospital} sent to hospital`,
        logoDataUrl,
      }

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
                if (e.field === 'notes' || !e.new_status) {
                  const clip = (v: string | null) => (!v ? '—' : v.length > 40 ? v.slice(0, 37) + '…' : v)
                  return `${when}  Notes: ${clip(e.old_value)} → ${clip(e.new_value)}`
                }
                const from = e.old_status ? `${STATUS_LABEL[e.old_status]} → ` : ''
                return `${when}  ${from}${STATUS_LABEL[e.new_status]}`
              })
              .join('\n')

        const wasHospital = r.was_at_hospital && r.status !== 'sent_to_hospital' ? ' (was at hospital)' : ''
        return [
          r.fight_order?.toString() ?? '-',
          '', // Photo — drawn in didDrawCell
          '', // Fighter — drawn in didDrawCell (name, code and detail carry different weights)
          STATUS_LABEL[r.status] + wasHospital,
          r.notes || '—',
          historyText,
        ]
      })

      autoTable(doc, {
        ...repeatingHeader(doc, headerOptions),
        head: [['#', 'Photo', 'Fighter', 'Current Status', 'Notes', 'History']],
        body,
        theme: 'striped',
        // Rows read centred: the photo is the tallest thing in the row, and text
        // pinned to the top floated away from the face it belongs to.
        styles: { ...REPORT_TABLE_STYLES.styles, valign: 'middle', minCellHeight: 16 },
        headStyles: REPORT_TABLE_STYLES.headStyles,
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: 58 },
          3: { cellWidth: 42 },
          4: { cellWidth: 50 },
          5: { cellWidth: 'auto' },
        },
        didParseCell: (data) => {
          if (data.section !== 'body') return
          const row = ordered[data.row.index]
          if (!row) return
          // The corner now rides on the photo, so only the status is tinted here.
          if (data.column.index === 3) {
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
          if (data.section !== 'body') return
          const row = ordered[data.row.index]
          if (!row) return
          try {
            if (data.column.index === 1) {
              drawAthletePhoto(doc, data.cell, {
                dataUrl: photoMap.get(row.enrolled_id),
                corner: row.corner,
              })
            } else if (data.column.index === 2) {
              drawAthleteCell(doc, data.cell, {
                name: row.person.compiled_name,
                eventCode: row.event_code,
                // Where they are: room once checked in, otherwise the inbound flight.
                detail: whereabouts.get(row.enrolled_id),
              })
            }
          } catch (err) {
            console.warn('[medical pdf] cell draw failed:', err)
          }
        },
      })

      drawReportFooters(doc, `${eventName || 'Event'} — Medical Clearance Report`)
      doc.save(buildReportFilename(eventName || 'Event', 'medical-clearance'))
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
            Medical team evaluates and clears athletes for the fight.
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
