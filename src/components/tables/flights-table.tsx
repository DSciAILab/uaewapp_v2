'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  FileCheck,
} from 'lucide-react'
import type { FlightWithEnrollment } from '@/lib/services/flights'
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
import { getFighterPhotoUrl, formatDate, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

type SortKey = 'order' | 'passenger' | 'type' | 'arrival' | 'departure' | 'status'

interface FlightsTableProps {
  flights: FlightWithEnrollment[]
  onEdit: (flight: FlightWithEnrollment) => void
  onDelete: (flight: FlightWithEnrollment) => void
  canEdit?: boolean
  canDelete?: boolean
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending: { color: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900', label: 'Pending' },
  booked: { color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900', label: 'Booked' },
  confirmed: { color: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900', label: 'Confirmed' },
  cancelled: { color: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900', label: 'Cancelled' },
}

const TYPE_ICONS: Record<string, typeof Plane> = {
  arrival_only: PlaneLanding,
  departure_only: PlaneTakeoff,
  full: Plane,
}

const TYPE_LABELS: Record<string, string> = {
  arrival_only: 'Arrival',
  departure_only: 'Departure',
  full: 'Round Trip',
}

export function FlightsTable({
  flights,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = false,
}: FlightsTableProps) {
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'order', dir: 'asc' })

  const { positions, eventNames } = useFightCard(
    useMemo(
      () =>
        flights.map((f) => ({
          eventId: f.enrollment?.event_id,
          enrollmentId: f.enrollment?.id ?? '',
          fullName: f.enrollment?.person?.compiled_name ?? '',
          ringName: f.enrollment?.person?.event_name,
        })),
      [flights]
    )
  )

  const orderOf = (flight: FlightWithEnrollment) =>
    positions.get(flight.enrollment?.id ?? '')?.fightOrder ?? null

  const sortedFlights = useMemo(() => {
    const value = (flight: FlightWithEnrollment): unknown => {
      switch (sort.key) {
        case 'order': return orderOf(flight)
        case 'passenger': return flight.enrollment?.person?.compiled_name
        case 'type': return flight.type
        case 'arrival': return flight.arrival_date
        case 'departure': return flight.departure_date
        case 'status': return flight.status
      }
    }
    const out = [...flights].sort((a, b) => compareValues(value(a), value(b)))
    return sort.dir === 'asc' ? out : out.reverse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flights, sort, positions])

  const onSort = (key: SortKey) => setSort((prev) => nextSort(prev, key))

  return (
    <TooltipProvider>
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <SortableHead column="order" label="#" sort={sort} onSort={onSort} className={FIGHT_ORDER_HEAD_CLASS} center />
              <TableHead className="w-[80px] text-center">Photo</TableHead>
              <SortableHead column="passenger" label="Passenger" sort={sort} onSort={onSort} className="min-w-[220px]" />
              <SortableHead column="type" label="Type" sort={sort} onSort={onSort} className="text-center w-[80px]" center />
              <SortableHead column="arrival" label="Arrival" sort={sort} onSort={onSort} className="min-w-[180px]" />
              <SortableHead column="departure" label="Departure" sort={sort} onSort={onSort} className="min-w-[180px]" />
              <SortableHead column="status" label="Status" sort={sort} onSort={onSort} className="text-center w-[120px]" center />
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFlights.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <Plane className="h-8 w-8 opacity-20" />
                        <p>No flights found for this criteria.</p>
                    </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedFlights.map((flight) => {
                const TypeIcon = TYPE_ICONS[flight.type] || Plane
                const statusStyle = STATUS_CONFIG[flight.status] || { color: 'bg-gray-100 text-gray-500 border-gray-200', label: flight.status }
                const name = flight.enrollment?.person?.compiled_name ?? ''

                return (
                  <TableRow
                    key={flight.id}
                    className="group hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => canEdit && onEdit(flight)}
                  >
                    <TableCell className={FIGHT_ORDER_CELL_CLASS}>
                      <FightOrderCell order={orderOf(flight)} />
                    </TableCell>

                    <TableCell className="text-center p-2">
                      <div className="flex justify-center">
                        <FighterAvatar
                          name={name}
                          photoUrl={getFighterPhotoUrl(flight.enrollment?.person?.appadmin_fighter_id)}
                          corner={positions.get(flight.enrollment?.id ?? '')?.corner}
                        />
                      </div>
                    </TableCell>

                    <TableCell>
                      <FighterIdentity
                        name={name}
                        fighterId={flight.enrollment?.person?.appadmin_fighter_id}
                        eventName={eventNames.get(flight.enrollment?.event_id ?? '') ?? null}
                        subtitle={
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">
                            {flight.enrollment?.person?.nationality || 'Unknown'}
                          </span>
                        }
                      />
                    </TableCell>

                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn("inline-flex items-center justify-center h-8 w-8 rounded-full bg-muted/50 border",
                              flight.type === 'arrival_only' ? 'text-emerald-500 bg-emerald-500/5' :
                              flight.type === 'departure_only' ? 'text-sky-500 bg-sky-500/5' :
                              'text-violet-500 bg-violet-500/5'
                          )}>
                             <TypeIcon className="h-4 w-4" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {TYPE_LABELS[flight.type]}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {flight.arrival_date ? (
                        <div className="flex flex-col">
                            {flight.arrival_flight_number && (
                                <span className="font-mono font-bold text-xs text-primary leading-tight">
                                    {flight.arrival_flight_number.toUpperCase().replace(/\s/g, '')}
                                </span>
                            )}
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm tabular-nums text-foreground leading-tight">
                                    {formatDate(flight.arrival_date)}
                                </span>
                                {flight.arrival_time && (
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                        {formatTime(flight.arrival_time)}
                                    </span>
                                )}
                            </div>
                            {flight.arrival_airport && (
                                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-tight">
                                    {flight.arrival_airport}
                                </span>
                            )}
                            {flight.arrival_ticket_link && (
                                <a href={flight.arrival_ticket_link} target="_blank" className="text-[10px] flex items-center gap-1 text-blue-500 hover:text-blue-600 mt-1 w-fit hover:underline">
                                    <FileCheck className="h-3 w-3" /> View Ticket
                                </a>
                            )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30 text-xs italic">No arrival info</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {flight.departure_date ? (
                        <div className="flex flex-col">
                            {flight.departure_flight_number && (
                                <span className="font-mono font-bold text-xs text-primary leading-tight">
                                    {flight.departure_flight_number.toUpperCase().replace(/\s/g, '')}
                                </span>
                            )}
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm tabular-nums text-foreground leading-tight">
                                    {formatDate(flight.departure_date)}
                                </span>
                                {flight.departure_time && (
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                        {formatTime(flight.departure_time)}
                                    </span>
                                )}
                            </div>
                            {flight.departure_airport && (
                                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-tight">
                                    {flight.departure_airport}
                                </span>
                            )}
                            {flight.departure_ticket_link && (
                                <a href={flight.departure_ticket_link} target="_blank" className="text-[10px] flex items-center gap-1 text-blue-500 hover:text-blue-600 mt-1 w-fit hover:underline">
                                    <FileCheck className="h-3 w-3" /> View Ticket
                                </a>
                            )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30 text-xs italic">No departure info</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("border font-medium px-2.5 py-0.5", statusStyle.color)}>
                        {statusStyle.label}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {canEdit && (
                            <DropdownMenuItem onClick={() => onEdit(flight)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => onDelete(flight)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
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
      </div>
    </TooltipProvider>
  )
}

/* ---------- Fight card lookup ---------- */

