'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAuditLog, type AuditLogEntry } from '@/lib/actions/admin-logs'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RefreshCw } from 'lucide-react'

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })

const actionVariant = (a: string): 'default' | 'secondary' | 'destructive' =>
  a === 'INSERT' ? 'default' : a === 'DELETE' ? 'destructive' : 'secondary'

// The tables the audit trigger is attached to (mma_ prefix trimmed for display).
const TABLES = ['mma_people', 'mma_enrollments', 'mma_staging_checkins', 'mma_medical_clearance', 'mma_events', 'mma_users']

/** UPDATE rows carry {field:{old,new}}; INSERT/DELETE carry a full-row snapshot. */
function renderChanged(action: string, changed: Record<string, unknown> | null) {
  if (!changed) return <span className="text-muted-foreground">—</span>
  if (action === 'UPDATE') {
    return (
      <div className="space-y-0.5">
        {Object.entries(changed).map(([field, v]) => {
          const { old: o, new: n } = (v ?? {}) as { old?: unknown; new?: unknown }
          return (
            <div key={field} className="text-xs">
              <span className="font-mono text-muted-foreground">{field}:</span>{' '}
              <span className="line-through text-muted-foreground">{String(o ?? '∅')}</span>{' → '}
              <span className="font-medium">{String(n ?? '∅')}</span>
            </div>
          )
        })}
      </div>
    )
  }
  // INSERT/DELETE: compact field list of the snapshot
  return (
    <span className="text-xs text-muted-foreground">
      {Object.keys(changed).length} fields
    </span>
  )
}

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [table, setTable] = useState<string>('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    setRows(await getAuditLog({ limit: 400, table: table === 'ALL' ? undefined : table }))
    setLoading(false)
  }, [table])

  useEffect(() => { load() }, [load])

  const label = useMemo(() => (t: string) => t.replace(/^mma_/, ''), [])

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        title="Activity Log"
        description="Every create / edit / delete on core data — who did what, when"
        actions={
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      >
        <Select value={table} onValueChange={setTable}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All tables</SelectItem>
            {TABLES.map((t) => <SelectItem key={t} value={t}>{label(t)}</SelectItem>)}
          </SelectContent>
        </Select>
      </DashboardHeader>

      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="whitespace-nowrap">When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No activity recorded yet (admin only).</TableCell></TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/30 align-top">
                    <TableCell className="tabular-nums whitespace-nowrap text-xs">{fmt(r.at)}</TableCell>
                    <TableCell className="text-sm">
                      {r.actor_email || <span className="text-muted-foreground italic">system</span>}
                    </TableCell>
                    <TableCell><Badge variant={actionVariant(r.action)} className="font-mono text-[11px]">{r.action}</Badge></TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{label(r.table_name)}</TableCell>
                    <TableCell>{renderChanged(r.action, r.changed)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
