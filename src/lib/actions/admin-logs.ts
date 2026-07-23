'use server'

// Admin-only log readers. Both use the authed client (the caller's session
// cookies), so the DB gate governs: get_access_log checks is_admin_user()
// internally, and mma_audit_log has an admin-only RLS SELECT policy. A
// non-admin caller simply gets an empty list.
import { createClient } from '@/lib/supabase/server'

export interface AccessLogEntry {
  at: string
  actor_id: string | null
  email: string | null
  name: string | null
  action: string
  log_type: string | null
  ip: string | null
}

export interface AuditLogEntry {
  id: number
  at: string
  actor_id: string | null
  actor_email: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  table_name: string
  row_id: string | null
  changed: Record<string, unknown> | null
}

export async function getAccessLog(limit = 200): Promise<AccessLogEntry[]> {
  // Cast: get_access_log and mma_audit_log were added by a migration that
  // postdates the generated Database types, so the typed client doesn't know
  // them yet. Regenerating types is a separate chore.
  const supabase = (await createClient()) as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
  }
  const { data, error } = await supabase.rpc('get_access_log', { p_limit: limit })
  if (error) {
    console.error('[access-log] rpc failed:', error.message)
    return []
  }
  return (data ?? []) as AccessLogEntry[]
}

export async function getAuditLog(opts?: { limit?: number; table?: string }): Promise<AuditLogEntry[]> {
  // Same cast rationale as getAccessLog.
  const supabase = (await createClient()) as unknown as {
    from: (t: string) => any // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  let query = supabase
    .from('mma_audit_log')
    .select('*')
    .order('at', { ascending: false })
    .limit(opts?.limit ?? 200)
  if (opts?.table) query = query.eq('table_name', opts.table)
  const { data, error } = await query
  if (error) {
    console.error('[audit-log] query failed:', error.message)
    return []
  }
  return (data ?? []) as AuditLogEntry[]
}
