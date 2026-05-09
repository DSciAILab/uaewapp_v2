'use client'

import { useMemo, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MedicalRow, MedicalStatus } from '@/types/medical'
import { MedicalStatusCell } from './medical-status-cell'
import { MedicalWhatsAppLink } from './medical-whatsapp-link'

type CornerFilter = 'ALL' | 'RED' | 'BLUE'
type ShowFilter = 'pending' | 'all' | 'cleared_by_doctor' | 'sent_to_hospital'

interface Props {
  rows: MedicalRow[]
  onChangeStatus: (enrolledId: string, status: MedicalStatus) => void
  readOnly?: boolean
}

export function MedicalTable({ rows, onChangeStatus, readOnly }: Props) {
  const [search, setSearch] = useState('')
  const [cornerFilter, setCornerFilter] = useState<CornerFilter>('ALL')
  const [showFilter, setShowFilter] = useState<ShowFilter>('pending')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (cornerFilter !== 'ALL' && r.corner !== cornerFilter) return false
      if (showFilter !== 'all' && r.status !== showFilter) return false
      if (!term) return true
      return (
        r.person.compiled_name.toLowerCase().includes(term) ||
        (r.person.fighter_id ?? '').toLowerCase().includes(term) ||
        (r.corner ?? '').toLowerCase().includes(term)
      )
    })
  }, [rows, search, cornerFilter, showFilter])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, fighter id, corner..."
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] text-center">#</TableHead>
              <TableHead className="w-[60px]">Photo</TableHead>
              <TableHead>Athlete</TableHead>
              <TableHead className="w-[90px] text-center">Corner</TableHead>
              <TableHead className="w-[60px] text-center">WA</TableHead>
              <TableHead className="w-[200px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No athletes match the current filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((row) => (
              <TableRow key={row.enrolled_id}>
                <TableCell className="text-center text-xs text-muted-foreground">
                  {row.fight_order ?? '-'}
                </TableCell>
                <TableCell>
                  <Avatar
                    className={cn(
                      'h-9 w-9 border-2',
                      row.corner === 'RED'
                        ? 'border-red-500'
                        : row.corner === 'BLUE'
                        ? 'border-blue-500'
                        : 'border-muted'
                    )}
                  >
                    <AvatarImage src={row.person.photo_url ?? ''} />
                    <AvatarFallback>{row.person.compiled_name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col leading-tight">
                    <span className="font-medium text-sm">{row.person.compiled_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {row.person.nationality ?? ''}{row.person.fighter_id ? ` · ${row.person.fighter_id}` : ''}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      row.corner === 'RED'
                        ? 'text-red-700 border-red-200 bg-red-50 dark:bg-red-950/20'
                        : row.corner === 'BLUE'
                        ? 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/20'
                        : ''
                    )}
                  >
                    {row.corner ?? '—'}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <MedicalWhatsAppLink phone={row.person.phone} />
                </TableCell>
                <TableCell>
                  <MedicalStatusCell
                    value={row.status}
                    onChange={(status) => onChangeStatus(row.enrolled_id, status)}
                    disabled={readOnly}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
