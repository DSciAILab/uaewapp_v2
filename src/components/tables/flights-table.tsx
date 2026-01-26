'use client';

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  ExternalLink,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  AlertCircle,
  FileCheck
} from 'lucide-react'
import type { FlightWithEnrollment } from '@/lib/services/flights'
import { getFighterPhotoUrl, formatDate, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

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

const TYPE_ICONS: Record<string, any> = {
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
  return (
    <TooltipProvider>
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead className="min-w-[200px]">Passenger</TableHead>
              <TableHead className="text-center w-[80px]">Type</TableHead>
              <TableHead className="min-w-[180px]">Arrival</TableHead>
              <TableHead className="min-w-[180px]">Departure</TableHead>
              <TableHead className="text-center w-[120px]">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flights.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <Plane className="h-8 w-8 opacity-20" />
                        <p>No flights found for this criteria.</p>
                    </div>
                </TableCell>
              </TableRow>
            ) : (
              flights.map((flight) => {
                const TypeIcon = TYPE_ICONS[flight.type] || Plane
                const statusStyle = STATUS_CONFIG[flight.status] || { color: 'bg-gray-100 text-gray-500 border-gray-200', label: flight.status }
                
                return (
                  <TableRow 
                    key={flight.id} 
                    className="group hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => canEdit && onEdit(flight)}
                  >
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px] bg-background text-muted-foreground group-hover:bg-background/80 group-hover:text-foreground transition-colors">
                        {flight.enrollment?.person?.fighter_id || flight.enrollment?.event_code || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border ring-1 ring-border/50">
                          {flight.enrollment?.person?.fighter_id && (
                            <AvatarImage
                              src={getFighterPhotoUrl(flight.enrollment.person.fighter_id)}
                              className="object-cover"
                            />
                          )}
                          <AvatarFallback className="text-xs bg-primary/5 font-medium text-primary">
                            {flight.enrollment?.person?.compiled_name?.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
                            {flight.enrollment?.person?.compiled_name}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            {flight.enrollment?.person?.nationality || 'Unknown'}
                          </span>
                        </div>
                      </div>
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
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm tabular-nums text-foreground">
                                    {formatDate(flight.arrival_date)}
                                </span>
                                {flight.arrival_time && (
                                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded tabular-nums">
                                        {formatTime(flight.arrival_time)}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {flight.arrival_flight_number && <span className="font-mono font-medium text-foreground">{flight.arrival_flight_number}</span>}
                                {flight.arrival_airport && <span>• {flight.arrival_airport}</span>}
                            </div>
                             {flight.arrival_ticket_link && (
                                <a href={flight.arrival_ticket_link} target="_blank" className="text-[10px] flex items-center gap-1 text-blue-500 hover:text-blue-600 mt-0.5 w-fit hover:underline">
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
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-sm tabular-nums text-foreground">
                                    {formatDate(flight.departure_date)}
                                </span>
                                {flight.departure_time && (
                                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded tabular-nums">
                                        {formatTime(flight.departure_time)}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {flight.departure_flight_number && <span className="font-mono font-medium text-foreground">{flight.departure_flight_number}</span>}
                                {flight.departure_airport && <span>• {flight.departure_airport}</span>}
                            </div>
                             {flight.departure_ticket_link && (
                                <a href={flight.departure_ticket_link} target="_blank" className="text-[10px] flex items-center gap-1 text-blue-500 hover:text-blue-600 mt-0.5 w-fit hover:underline">
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
