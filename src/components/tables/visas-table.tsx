'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderOpen,
  CheckCircle2,
} from 'lucide-react'
import type { VisaWithEnrollment } from '@/lib/services/visas'
import { getEventById } from '@/lib/services/events'
import {
  getFightCardPositions,
  type EnrollmentIdentity,
  type FightCardPosition,
} from '@/lib/services/fight-card-positions'
import {
  FighterAvatar,
  FighterIdentity,
  FightOrderCell,
  FIGHT_ORDER_CELL_CLASS,
  FIGHT_ORDER_HEAD_CLASS,
  SortableHead,
  compareValues,
  nextSort,
  type SortState,
} from '@/components/fighters/fighter-identity'
import { useFightCard, type CardPerson } from '@/hooks/use-fight-card'
import { getFighterPhotoUrl, cn } from '@/lib/utils'
import { VISA_STATUS_LABELS, VISA_STATUS_COLORS } from '@/lib/constants'
import { StatusBadge } from '@/components/ui/status-badge'

type SortKey = 'order' | 'done' | 'person' | 'nationality' | 'airport' | 'documents' | 'status'

interface VisasTableProps {
  visas: VisaWithEnrollment[]
  onEdit: (visa: VisaWithEnrollment) => void
  onDelete: (visa: VisaWithEnrollment) => void
  onToggleDone: (visa: VisaWithEnrollment) => void
  canEdit?: boolean
  canDelete?: boolean
}

const nameOf = (visa: VisaWithEnrollment) =>
  visa.passport_name || visa.enrollment?.person?.compiled_name || ''

const documentFolderOf = (visa: VisaWithEnrollment) => visa.enrollment?.person?.document_folder

export function VisasTable({
  visas,
  onEdit,
  onDelete,
  onToggleDone,
  canEdit = true,
  canDelete = false,
}: VisasTableProps) {
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'order', dir: 'asc' })

  const { positions, eventNames } = useFightCard(
    useMemo(
      () =>
        visas.map((v) => ({
          eventId: v.enrollment?.event_id,
          enrollmentId: v.enrollment?.id ?? '',
          fullName: v.enrollment?.person?.compiled_name ?? '',
          ringName: v.enrollment?.person?.event_name,
        })),
      [visas]
    )
  )

  const orderOf = (visa: VisaWithEnrollment) =>
    positions.get(visa.enrollment?.id ?? '')?.fightOrder ?? null

  const sorted = useMemo(() => {
    const value = (visa: VisaWithEnrollment): unknown => {
      switch (sort.key) {
        case 'order': return orderOf(visa)
        case 'done': return visa.is_done ? 1 : 0
        case 'person': return nameOf(visa)
        case 'nationality': return visa.nationality || visa.enrollment?.person?.nationality
        case 'airport': return visa.departure_airport
        case 'documents': return documentFolderOf(visa) ? 0 : 1
        case 'status': return VISA_STATUS_LABELS[visa.status]
      }
    }
    const out = [...visas].sort((a, b) => compareValues(value(a), value(b)))
    return sort.dir === 'asc' ? out : out.reverse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visas, sort, positions])

  const onSort = (key: SortKey) => setSort((prev) => nextSort(prev, key))

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead column="done" label="Done" sort={sort} onSort={onSort} className="w-16" />
          <SortableHead column="order" label="#" sort={sort} onSort={onSort} className={FIGHT_ORDER_HEAD_CLASS} center />
          <TableHead className="w-[80px] text-center">Photo</TableHead>
          <SortableHead column="person" label="Person" sort={sort} onSort={onSort} className="w-[280px]" />
          <SortableHead column="nationality" label="Nationality" sort={sort} onSort={onSort} />
          <SortableHead column="airport" label="Airport" sort={sort} onSort={onSort} />
          <SortableHead column="documents" label="Documents" sort={sort} onSort={onSort} />
          <SortableHead column="status" label="Status" sort={sort} onSort={onSort} />
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
              No visas registered
            </TableCell>
          </TableRow>
        ) : (
          sorted.map((visa) => {
            const documentFolder = documentFolderOf(visa)

            return (
              <TableRow
                key={visa.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  visa.is_done && "opacity-60"
                )}
                onClick={() => onEdit(visa)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={visa.is_done}
                    onCheckedChange={() => onToggleDone(visa)}
                    disabled={!canEdit}
                  />
                </TableCell>

                <TableCell className={FIGHT_ORDER_CELL_CLASS}>
                  <FightOrderCell order={orderOf(visa)} />
                </TableCell>

                <TableCell className="text-center p-2">
                  <div className="flex justify-center">
                    <FighterAvatar
                      name={nameOf(visa)}
                      photoUrl={getFighterPhotoUrl(visa.enrollment?.person?.appadmin_fighter_id)}
                      corner={positions.get(visa.enrollment?.id ?? '')?.corner}
                    />
                  </div>
                </TableCell>

                <TableCell>
                  <FighterIdentity
                    name={nameOf(visa)}
                    fighterId={visa.enrollment?.person?.appadmin_fighter_id}
                    eventName={eventNames.get(visa.enrollment?.event_id ?? '') ?? null}
                    subtitle={
                      visa.enrollment?.person?.passport_number ? (
                        <span className="text-[10px] text-muted-foreground font-mono truncate">
                          {visa.enrollment.person.passport_number}
                        </span>
                      ) : undefined
                    }
                  />
                </TableCell>

                <TableCell>
                  <Badge variant="secondary">
                    {visa.nationality || visa.enrollment?.person?.nationality || '-'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {visa.departure_airport || '-'}
                </TableCell>
                <TableCell>
                  {documentFolder ? (
                    <a
                      href={documentFolder}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 gap-1.5"
                      >
                        <FolderOpen className="h-3 w-3" />
                        Documents
                      </Badge>
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={VISA_STATUS_COLORS[visa.status] ?? 'neutral'}
                    label={VISA_STATUS_LABELS[visa.status]}
                  />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit && (
                        <>
                          <DropdownMenuItem onClick={() => onEdit(visa)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onToggleDone(visa)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {visa.is_done ? 'Mark as pending' : 'Mark as completed'}
                          </DropdownMenuItem>
                        </>
                      )}
                      {canDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-500"
                            onClick={() => onDelete(visa)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}

/* ---------- Fight card lookup ---------- */

