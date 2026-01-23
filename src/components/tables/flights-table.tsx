'use client'

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
} from 'lucide-react'
import type { FlightWithEnrollment } from '@/lib/services/flights'
import { getFighterPhotoUrl, formatDate, formatTime } from '@/lib/utils'

interface FlightsTableProps {
  flights: FlightWithEnrollment[]
  onEdit: (flight: FlightWithEnrollment) => void
  onDelete: (flight: FlightWithEnrollment) => void
  canEdit?: boolean
  canDelete?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  booked: 'bg-blue-500',
  confirmed: 'bg-green-500',
  cancelled: 'bg-red-500',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  booked: 'Reservado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
}

const TYPE_ICONS: Record<string, any> = {
  arrival_only: PlaneLanding,
  departure_only: PlaneTakeoff,
  full: Plane,
}

const TYPE_LABELS: Record<string, string> = {
  arrival_only: 'Chegada',
  departure_only: 'Partida',
  full: 'Ida/Volta',
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">ID</TableHead>
            <TableHead>Pessoa</TableHead>
            <TableHead className="text-center">Tipo</TableHead>
            <TableHead>Chegada</TableHead>
            <TableHead>Partida</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flights.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Nenhum voo cadastrado
              </TableCell>
            </TableRow>
          ) : (
            flights.map((flight) => {
              const TypeIcon = TYPE_ICONS[flight.type] || Plane
              
              return (
                <TableRow key={flight.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {flight.enrollment?.event_code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {flight.enrollment?.person?.fighter_id && (
                          <AvatarImage
                            src={getFighterPhotoUrl(flight.enrollment.person.fighter_id)}
                          />
                        )}
                        <AvatarFallback className="text-xs">
                          {flight.enrollment?.person?.compiled_name?.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {flight.enrollment?.person?.compiled_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {flight.enrollment?.person?.nationality}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger>
                        <TypeIcon className="h-5 w-5 mx-auto text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        {TYPE_LABELS[flight.type]}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {flight.arrival_date ? (
                      <div className="space-y-1">
                        <p className="font-medium">
                          {formatDate(flight.arrival_date)}
                          {flight.arrival_time && ` ${formatTime(flight.arrival_time)}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {flight.arrival_flight_number}
                          {flight.arrival_airport && ` • ${flight.arrival_airport}`}
                        </p>
                        {flight.arrival_ticket_link && (
                          <a
                            href={flight.arrival_ticket_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ticket
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {flight.departure_date ? (
                      <div className="space-y-1">
                        <p className="font-medium">
                          {formatDate(flight.departure_date)}
                          {flight.departure_time && ` ${formatTime(flight.departure_time)}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {flight.departure_flight_number}
                          {flight.departure_airport && ` • ${flight.departure_airport}`}
                        </p>
                        {flight.departure_ticket_link && (
                          <a
                            href={flight.departure_ticket_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ticket
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={STATUS_COLORS[flight.status]}>
                      {STATUS_LABELS[flight.status]}
                    </Badge>
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
                          <DropdownMenuItem onClick={() => onEdit(flight)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            className="text-red-500"
                            onClick={() => onDelete(flight)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
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
    </TooltipProvider>
  )
}
