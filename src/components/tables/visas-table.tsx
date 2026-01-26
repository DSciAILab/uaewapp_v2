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
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'
import type { VisaWithEnrollment } from '@/lib/services/visas'
import { getFighterPhotoUrl, cn } from '@/lib/utils'
import { VISA_STATUS_LABELS, VISA_STATUS_COLORS } from '@/lib/constants'

interface VisasTableProps {
  visas: VisaWithEnrollment[]
  onEdit: (visa: VisaWithEnrollment) => void
  onDelete: (visa: VisaWithEnrollment) => void
  onToggleDone: (visa: VisaWithEnrollment) => void
  canEdit?: boolean
  canDelete?: boolean
}

export function VisasTable({
  visas,
  onEdit,
  onDelete,
  onToggleDone,
  canEdit = true,
  canDelete = false,
}: VisasTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">Done</TableHead>
          <TableHead className="w-20">ID</TableHead>
          <TableHead>Pessoa</TableHead>
          <TableHead>Nacionalidade</TableHead>
          <TableHead>Aeroporto</TableHead>
          <TableHead>Documento</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visas.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
              Nenhum visto cadastrado
            </TableCell>
          </TableRow>
        ) : (
          visas.map((visa) => (
            <TableRow
              key={visa.id}
              className={cn(
                "cursor-pointer hover:bg-muted/50",
                visa.is_done && "opacity-60"
              )}
              onClick={() => onEdit(visa)}
            >
              <TableCell>
                <Checkbox
                  checked={visa.is_done}
                  onCheckedChange={() => onToggleDone(visa)}
                  disabled={!canEdit}
                />
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono">
                  {visa.enrollment?.event_code}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {visa.enrollment?.person?.fighter_id && (
                      <AvatarImage
                        src={getFighterPhotoUrl(visa.enrollment.person.fighter_id)}
                      />
                    )}
                    <AvatarFallback className="text-xs">
                      {visa.enrollment?.person?.compiled_name?.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {visa.passport_name || visa.enrollment?.person?.compiled_name}
                    </p>
                    {visa.enrollment?.person?.passport_number && (
                      <p className="text-sm text-muted-foreground">
                        {visa.enrollment.person.passport_number}
                      </p>
                    )}
                  </div>
                </div>
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
                {visa.document_link ? (
                  <a
                    href={visa.document_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()} // Prevent row click
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver
                  </a>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={VISA_STATUS_COLORS[visa.status]}>
                  {VISA_STATUS_LABELS[visa.status]}
                </Badge>
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
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleDone(visa)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {visa.is_done ? 'Marcar pendente' : 'Marcar concluído'}
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
                          Excluir
                        </DropdownMenuItem>
                      </>
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
