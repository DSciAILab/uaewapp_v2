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
import { MoreHorizontal, Pencil, Trash2, ExternalLink } from 'lucide-react'
import type { Person } from '@/types/database'
import { getFighterPhotoUrl, formatDate } from '@/lib/utils'

interface PeopleTableProps {
  people: Person[]
  onEdit: (person: Person) => void
  onDelete: (person: Person) => void
  canEdit?: boolean
  canDelete?: boolean
}

export function PeopleTable({
  people,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = false,
}: PeopleTableProps) {
  const isPassportExpired = (expiry?: string) => {
    if (!expiry) return false
    return new Date(expiry) < new Date()
  }

  const isPassportExpiringSoon = (expiry?: string) => {
    if (!expiry) return false
    const sixMonths = new Date()
    sixMonths.setMonth(sixMonths.getMonth() + 6)
    return new Date(expiry) < sixMonths && new Date(expiry) >= new Date()
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12"></TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Nome de Guerra</TableHead>
          <TableHead>Nacionalidade</TableHead>
          <TableHead>Passaporte</TableHead>
          <TableHead>Validade</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {people.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              Nenhuma pessoa encontrada
            </TableCell>
          </TableRow>
        ) : (
          people.map((person) => (
            <TableRow key={person.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell>
                <Avatar className="h-8 w-8">
                  {person.fighter_id ? (
                    <AvatarImage 
                      src={getFighterPhotoUrl(person.fighter_id)} 
                      alt={person.compiled_name} 
                    />
                  ) : null}
                  <AvatarFallback className="text-xs">
                    {person.name[0]}{person.surname[0]}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">{person.compiled_name}</TableCell>
              <TableCell className="text-muted-foreground">
                {person.event_name || '-'}
              </TableCell>
              <TableCell>
                {person.nationality ? (
                  <Badge variant="secondary">{person.nationality}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {person.passport_number || (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {person.passport_expiry ? (
                  <Badge
                    variant={
                      isPassportExpired(person.passport_expiry)
                        ? 'destructive'
                        : isPassportExpiringSoon(person.passport_expiry)
                        ? 'warning'
                        : 'secondary'
                    }
                  >
                    {formatDate(person.passport_expiry)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
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
                      <DropdownMenuItem onClick={() => onEdit(person)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {person.document_folder && (
                      <DropdownMenuItem asChild>
                        <a href={person.document_folder} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Documentos
                        </a>
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={() => onDelete(person)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
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
