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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, X, Plane, FileText, Hotel, Car, BrainCircuit } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { EnrollmentWithDetails } from '@/lib/services/enrollments'
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
  type Corner,
  type SortState,
} from '@/components/fighters/fighter-identity'
import { useFightCard, type CardPerson } from '@/hooks/use-fight-card'
import { getFighterPhotoUrl, getDisplayName } from '@/lib/utils'

type SortKey = 'order' | 'eventCode' | 'name' | 'role' | 'needs'

interface EnrollmentsTableProps {
  enrollments: EnrollmentWithDetails[]
  onEdit: (enrollment: EnrollmentWithDetails) => void
  onCancel: (enrollment: EnrollmentWithDetails) => void
  canEdit?: boolean
}

const eventCodeOf = (e: EnrollmentWithDetails) =>
  `${e.role?.code}.${String(e.event_code_seq || 1).padStart(3, '0')}`

const needsCount = (e: EnrollmentWithDetails) =>
  (e.needs_flight !== 'none' ? 1 : 0) +
  (e.needs_visa ? 1 : 0) +
  (e.needs_hotel ? 1 : 0) +
  (e.needs_transport !== 'none' ? 1 : 0)

export function EnrollmentsTable({ enrollments, onEdit, onCancel, canEdit = true }: EnrollmentsTableProps) {
  const router = useRouter()
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'order', dir: 'asc' })

  const { positions, eventNames } = useFightCard(
    useMemo(
      () =>
        enrollments.map((e) => ({
          eventId: e.event_id,
          enrollmentId: e.id,
          fullName: e.person?.compiled_name ?? '',
          ringName: e.person?.event_name,
        })),
      [enrollments]
    )
  )

  const getRoleBadgeColor = (code: string) => {
    switch (code) {
      case 'F': return 'default'
      case 'C': return 'secondary'
      case 'ST': return 'outline'
      case 'G': return 'outline'
      default: return 'secondary'
    }
  }

  const orderOf = (e: EnrollmentWithDetails) => positions.get(e.id)?.fightOrder ?? null

  /**
   * Ring colour. The card is the source, but `corner` is also a real column on
   * the enrollment — falling back to it keeps a recorded corner visible when the
   * card hasn't been synced yet. Neither is a guess; a missing corner stays grey.
   */
  const cornerOf = (e: EnrollmentWithDetails): Corner =>
    positions.get(e.id)?.corner ?? ((e.corner || null) as Corner)

  const sorted = useMemo(() => {
    const value = (e: EnrollmentWithDetails): unknown => {
      switch (sort.key) {
        case 'order': return orderOf(e)
        case 'eventCode': return eventCodeOf(e)
        case 'name': return getDisplayName(e.person || {})
        case 'role': return e.role?.name
        case 'needs': return needsCount(e)
      }
    }
    const out = [...enrollments].sort((a, b) => compareValues(value(a), value(b)))
    return sort.dir === 'asc' ? out : out.reverse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollments, sort, positions])

  const onSort = (key: SortKey) => setSort((prev) => nextSort(prev, key))

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead column="order" label="#" sort={sort} onSort={onSort} className={FIGHT_ORDER_HEAD_CLASS} center />
          <TableHead className="w-[80px] text-center">Photo</TableHead>
          <SortableHead column="name" label="Fighter" sort={sort} onSort={onSort} className="w-[280px]" />
          <SortableHead column="eventCode" label="Event ID" sort={sort} onSort={onSort} className="w-24" />
          <SortableHead column="role" label="Role" sort={sort} onSort={onSort} />
          <SortableHead column="needs" label="Requirements" sort={sort} onSort={onSort} />
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              No one enrolled
            </TableCell>
          </TableRow>
        ) : (
          sorted.map((enrollment) => (
            <TableRow key={enrollment.id}>
              <TableCell className={FIGHT_ORDER_CELL_CLASS}>
                <FightOrderCell order={orderOf(enrollment)} />
              </TableCell>

              <TableCell className="text-center p-2">
                <div className="flex justify-center">
                  <FighterAvatar
                    name={getDisplayName(enrollment.person || {})}
                    photoUrl={getFighterPhotoUrl(enrollment.person?.appadmin_fighter_id)}
                    corner={cornerOf(enrollment)}
                  />
                </div>
              </TableCell>

              <TableCell>
                <FighterIdentity
                  name={getDisplayName(enrollment.person || {})}
                  fighterId={enrollment.person?.appadmin_fighter_id}
                  eventName={eventNames.get(enrollment.event_id) ?? null}
                />
              </TableCell>

              <TableCell>
                <span className="font-mono text-sm font-medium">{eventCodeOf(enrollment)}</span>
              </TableCell>

              <TableCell>
                <Badge variant={getRoleBadgeColor(enrollment.role?.code || '')}>
                  {enrollment.role?.name}
                </Badge>
              </TableCell>

              <TableCell>
                <div className="flex gap-1">
                  {enrollment.needs_flight !== 'none' && (
                    <Badge variant="outline" className="gap-1">
                      <Plane className="h-3 w-3" />
                    </Badge>
                  )}
                  {enrollment.needs_visa && (
                    <Badge variant="outline" className="gap-1">
                      <FileText className="h-3 w-3" />
                    </Badge>
                  )}
                  {enrollment.needs_hotel && (
                    <Badge variant="outline" className="gap-1">
                      <Hotel className="h-3 w-3" />
                    </Badge>
                  )}
                  {enrollment.needs_transport !== 'none' && (
                    <Badge variant="outline" className="gap-1">
                      <Car className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <DropdownMenuItem onClick={() => onEdit(enrollment)}>
                        <Pencil className="mr-2 h-4 w-4" />Edit
                      </DropdownMenuItem>
                    )}
                    {canEdit && (
                      <DropdownMenuItem className="text-red-500" onClick={() => onCancel(enrollment)}>
                        <X className="mr-2 h-4 w-4" />Cancel
                      </DropdownMenuItem>
                    )}
                    {enrollment.role?.code === 'F' && (
                       <DropdownMenuItem onClick={() => router.push(`/operations?eventId=${enrollment.event_id}&personId=${enrollment.person_id}&enrolledId=${enrollment.id}`)}>
                         <BrainCircuit className="mr-2 h-4 w-4 text-blue-500" />Operations
                       </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

/* ---------- Fight card lookup ---------- */

