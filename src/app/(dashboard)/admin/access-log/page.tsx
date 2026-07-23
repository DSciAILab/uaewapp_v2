'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAccessLog, type AccessLogEntry } from '@/lib/actions/admin-logs'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RefreshCw } from 'lucide-react'

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })

// Login/logout/token events are the noisy majority; highlight the ones that
// matter (sign-in/out) and tone the rest down.
const actionVariant = (a: string): 'default' | 'secondary' | 'outline' =>
  a === 'login' ? 'default' : a === 'logout' ? 'secondary' : 'outline'

export default function AccessLogPage() {
  const [rows, setRows] = useState<AccessLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setRows(await getAccessLog(300))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader
        title="Access Log"
        description="Sign-ins, sign-outs and token events — from Supabase auth"
        actions={
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="whitespace-nowrap">When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No access events (admin only).</TableCell></TableRow>
              ) : (
                rows.map((r, i) => (
                  <TableRow key={i} className="hover:bg-muted/30">
                    <TableCell className="tabular-nums whitespace-nowrap text-xs">{fmt(r.at)}</TableCell>
                    <TableCell className="font-medium">
                      {r.email || r.actor_id || <span className="text-muted-foreground italic">unknown</span>}
                      {r.name && <span className="block text-xs text-muted-foreground">{r.name}</span>}
                    </TableCell>
                    <TableCell><Badge variant={actionVariant(r.action)} className="font-mono text-[11px]">{r.action}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.log_type || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.ip || '-'}</TableCell>
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
