'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ArrowDown, ArrowUp, ArrowUpDown, History, Hospital, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MedicalLogEntry, MedicalRow, MedicalStatus } from '@/types/medical'
import { MedicalStatusCell } from './medical-status-cell'
import { MedicalWhatsAppLink } from './medical-whatsapp-link'
import { MedicalHistoryDrawer } from './medical-history-drawer'

type CornerFilter = 'ALL' | 'RED' | 'BLUE'
type ShowFilter = 'pending' | 'all' | 'cleared_by_doctor' | 'sent_to_hospital'
type SortKey = 'order' | 'athlete' | 'wa' | 'status'
type SortDir = 'asc' | 'desc'

const STATUS_RANK: Record<MedicalStatus, number> = {
  pending: 0,
  cleared_by_doctor: 1,
  sent_to_hospital: 2,
}

const ROW_TONE = (status: MedicalStatus) => {
  if (status === 'cleared_by_doctor')
    return 'bg-emerald-50/60 hover:bg-emerald-50/80 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20'
  if (status === 'sent_to_hospital')
    return 'bg-red-50/60 hover:bg-red-50/80 dark:bg-red-500/10 dark:hover:bg-red-500/20'
  return 'hover:bg-muted/30'
}

const ORDER_TONE = (status: MedicalStatus) => {
  if (status === 'cleared_by_doctor') return 'text-emerald-700/80 dark:text-emerald-400/80'
  if (status === 'sent_to_hospital') return 'text-red-700/80 dark:text-red-400/80'
  return 'bg-yellow-50/30 text-yellow-700/80 dark:bg-yellow-500/5 dark:text-yellow-400/80'
}

const AVATAR_BORDER = (corner: 'RED' | 'BLUE' | null) =>
  corner === 'RED' ? 'border-red-600' : corner === 'BLUE' ? 'border-blue-600' : 'border-muted'

interface Props {
  rows: MedicalRow[]
  onChangeStatus?: (enrolledId: string, status: MedicalStatus) => void
  onChangeNotes?: (enrolledId: string, notes: string | null) => void
  fetchHistory: (enrolledId: string) => Promise<MedicalLogEntry[]>
  readOnly?: boolean
}

const noop = () => {}

export function MedicalTable({
  rows,
  onChangeStatus = noop,
  onChangeNotes = noop,
  fetchHistory,
  readOnly,
}: Props) {
  const [search, setSearch] = useState('')
  const [cornerFilter, setCornerFilter] = useState<CornerFilter>('ALL')
  const [showFilter, setShowFilter] = useState<ShowFilter>('pending')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'order', dir: 'asc' })
  const [historyOpenFor, setHistoryOpenFor] = useState<MedicalRow | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (cornerFilter !== 'ALL' && r.corner !== cornerFilter) return false
      if (showFilter !== 'all' && r.status !== showFilter) return false
      if (!term) return true
      return (
        r.person.compiled_name.toLowerCase().includes(term) ||
        (r.person.appadmin_fighter_id ?? '').toLowerCase().includes(term) ||
        (r.corner ?? '').toLowerCase().includes(term)
      )
    })
  }, [rows, search, cornerFilter, showFilter])

  const sorted = useMemo(() => {
    const compare = (a: MedicalRow, b: MedicalRow): number => {
      switch (sort.key) {
        case 'order':
          return (a.fight_order ?? 999) - (b.fight_order ?? 999)
        case 'athlete':
          return a.person.compiled_name.localeCompare(b.person.compiled_name)
        case 'wa':
          return (b.person.phone ? 1 : 0) - (a.person.phone ? 1 : 0)
        case 'status':
          return STATUS_RANK[a.status] - STATUS_RANK[b.status]
      }
    }
    const out = [...filtered].sort(compare)
    return sort.dir === 'asc' ? out : out.reverse()
  }, [filtered, sort])

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    )

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sort.key !== k) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground/40" />
    return sort.dir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const HeaderButton = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className={cn('inline-flex items-center hover:text-foreground transition-colors', className)}
    >
      {label}
      <SortIcon k={k} />
    </button>
  )

  return (
    <div className="space-y-3">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, fighter id, corner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={cornerFilter} onValueChange={(v) => setCornerFilter(v as CornerFilter)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Corners</SelectItem>
            <SelectItem value="RED">Red</SelectItem>
            <SelectItem value="BLUE">Blue</SelectItem>
          </SelectContent>
        </Select>
        <Select value={showFilter} onValueChange={(v) => setShowFilter(v as ShowFilter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending only</SelectItem>
            <SelectItem value="cleared_by_doctor">Cleared</SelectItem>
            <SelectItem value="sent_to_hospital">Sent to Hospital</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[60px] text-center bg-yellow-50/50 dark:bg-yellow-500/5">
                <HeaderButton k="order" label="#" className="justify-center w-full" />
              </TableHead>
              <TableHead className="w-[80px] text-center">Photo</TableHead>
              <TableHead className="w-[280px]">
                <HeaderButton k="athlete" label="Fighter" />
              </TableHead>
              <TableHead className="w-[80px] text-center">
                <HeaderButton k="wa" label="WA" className="justify-center w-full" />
              </TableHead>
              <TableHead className="w-[220px]">
                <HeaderButton k="status" label="Status" />
              </TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[60px] text-center">Log</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No athletes match the current filters.
                </TableCell>
              </TableRow>
            )}
            {sorted.map((row) => (
              <TableRow key={row.enrolled_id} className={cn('transition-colors', ROW_TONE(row.status))}>
                <TableCell className={cn('p-2 text-center font-bold text-lg', ORDER_TONE(row.status))}>
                  {row.fight_order ?? '-'}
                </TableCell>

                <TableCell className="text-center p-2">
                  <div className="flex justify-center">
                    <Avatar className={cn('h-12 w-12 border-4 shadow-sm', AVATAR_BORDER(row.corner))}>
                      <AvatarImage src={row.person.photo_url ?? ''} className="object-cover" />
                      <AvatarFallback className="font-bold bg-muted text-muted-foreground">
                        {row.person.compiled_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-base truncate">{row.person.compiled_name}</span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] bg-background/80 text-muted-foreground border-muted-foreground/30 px-1 py-0 h-4"
                      >
                        ID: {row.person.appadmin_fighter_id || 'N/A'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                        {row.event_name}
                      </span>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <MedicalWhatsAppLink phone={row.person.phone} />
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <MedicalStatusCell
                      value={row.status}
                      onChange={(status) => onChangeStatus(row.enrolled_id, status)}
                      disabled={readOnly}
                    />
                    {row.was_at_hospital && row.status !== 'sent_to_hospital' && (
                      <span
                        title="This athlete was sent to hospital previously"
                        className="text-red-600 dark:text-red-400 shrink-0"
                      >
                        <Hospital className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <NotesCell
                    initial={row.notes}
                    disabled={readOnly}
                    onSave={(value) => onChangeNotes(row.enrolled_id, value)}
                  />
                </TableCell>

                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="View status history"
                    onClick={() => setHistoryOpenFor(row)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card stack */}
      <div className="md:hidden space-y-2">
        {sorted.length === 0 && (
          <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
            No athletes match the current filters.
          </div>
        )}
        {sorted.map((row) => (
          <div
            key={row.enrolled_id}
            className={cn(
              'rounded-lg border bg-card overflow-hidden transition-colors',
              ROW_TONE(row.status)
            )}
          >
            <div className="flex items-stretch">
              {/* Order column — vertical */}
              <div
                className={cn(
                  'flex items-center justify-center w-12 shrink-0 border-r font-bold text-2xl',
                  ORDER_TONE(row.status)
                )}
              >
                {row.fight_order ?? '-'}
              </div>

              {/* Identity */}
              <div className="flex-1 p-3 flex items-center gap-3 min-w-0">
                <Avatar className={cn('h-12 w-12 border-4 shrink-0 shadow-sm', AVATAR_BORDER(row.corner))}>
                  <AvatarImage src={row.person.photo_url ?? ''} className="object-cover" />
                  <AvatarFallback className="font-bold bg-muted text-muted-foreground">
                    {row.person.compiled_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-bold text-sm leading-tight truncate">
                    {row.person.compiled_name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge
                      variant="outline"
                      className="font-mono text-[9px] bg-background/80 text-muted-foreground border-muted-foreground/30 px-1 py-0 h-4"
                    >
                      ID: {row.person.appadmin_fighter_id || 'N/A'}
                    </Badge>
                  </div>
                </div>
                <div className="shrink-0">
                  <MedicalWhatsAppLink phone={row.person.phone} />
                </div>
              </div>
            </div>

            {/* Status + notes */}
            <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/40">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
                  Medical Status
                  {row.was_at_hospital && row.status !== 'sent_to_hospital' && (
                    <Hospital
                      className="h-3.5 w-3.5 text-red-600 dark:text-red-400"
                      aria-label="Was at hospital"
                    />
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <MedicalStatusCell
                    value={row.status}
                    onChange={(status) => onChangeStatus(row.enrolled_id, status)}
                    disabled={readOnly}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    title="View status history"
                    onClick={() => setHistoryOpenFor(row)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <NotesCell
                initial={row.notes}
                disabled={readOnly}
                onSave={(value) => onChangeNotes(row.enrolled_id, value)}
                compact
              />
            </div>
          </div>
        ))}
      </div>

      <MedicalHistoryDrawer
        open={historyOpenFor !== null}
        onOpenChange={(open) => !open && setHistoryOpenFor(null)}
        athleteName={historyOpenFor?.person.compiled_name ?? ''}
        fetchHistory={() =>
          historyOpenFor ? fetchHistory(historyOpenFor.enrolled_id) : Promise.resolve([])
        }
      />
    </div>
  )
}

/* ---------- NotesCell (debounced editable) ---------- */

interface NotesCellProps {
  initial: string | null
  disabled?: boolean
  onSave: (value: string | null) => void
  compact?: boolean
}

function NotesCell({ initial, disabled, onSave, compact }: NotesCellProps) {
  const [value, setValue] = useState(initial ?? '')
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle')
  const lastSavedRef = useRef(initial ?? '')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync with prop changes from realtime updates (without losing local edits in-flight)
  useEffect(() => {
    if (lastSavedRef.current === (initial ?? '')) return
    setValue(initial ?? '')
    lastSavedRef.current = initial ?? ''
  }, [initial])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (savedFlashRef.current) clearTimeout(savedFlashRef.current)
    }
  }, [])

  const scheduleSave = (next: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (next === lastSavedRef.current) return
      setSaving('saving')
      onSave(next.trim() ? next : null)
      lastSavedRef.current = next
      // Flash "saved" briefly. Realtime echo from DB will replace this.
      if (savedFlashRef.current) clearTimeout(savedFlashRef.current)
      savedFlashRef.current = setTimeout(() => setSaving('saved'), 200)
      savedFlashRef.current = setTimeout(() => setSaving('idle'), 1500)
    }, 600)
  }

  return (
    <div className="relative">
      <Textarea
        value={value}
        disabled={disabled}
        placeholder="Add notes..."
        rows={compact ? 2 : 1}
        onChange={(e) => {
          setValue(e.target.value)
          scheduleSave(e.target.value)
        }}
        className={cn(
          'resize-none text-xs leading-snug bg-background/60 border-border/60',
          'focus-visible:bg-background',
          compact ? 'min-h-[44px]' : 'min-h-[36px] max-h-[80px]'
        )}
      />
      {saving !== 'idle' && (
        <span
          className={cn(
            'absolute right-2 bottom-1 text-[9px] uppercase tracking-wider font-medium pointer-events-none',
            saving === 'saving' ? 'text-muted-foreground' : 'text-emerald-600 dark:text-emerald-400'
          )}
        >
          {saving === 'saving' ? 'saving…' : 'saved'}
        </span>
      )}
    </div>
  )
}
