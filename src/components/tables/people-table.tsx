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
import { MoreHorizontal, Pencil, Trash2, ExternalLink, UserPlus } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { Person } from '@/types/database'
import { getFighterPhotoUrl, formatDate, cn } from '@/lib/utils'

interface PeopleTableProps {
  people: Person[]
  selectedIds?: Set<string>
  onToggleRow?: (person: Person) => void
  onToggleAll?: (selected: boolean) => void
  onEdit: (person: Person) => void
  onDelete: (person: Person) => void
  onEnroll?: (person: Person) => void
  enrolledIds?: Set<string>
  canEdit?: boolean
  canDelete?: boolean
}

export function PeopleTable({
  people,
  selectedIds = new Set(),
  onToggleRow,
  onToggleAll,
  onEdit,
  onDelete,
  onEnroll,
  enrolledIds = new Set(),
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

  const handleSelectAll = (checked: boolean) => {
    if (onToggleAll) onToggleAll(checked)
  }

  const handleSelectOne = (person: Person, e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggleRow) onToggleRow(person)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {onToggleAll && (
            <TableHead className="w-12 px-4">
              <Checkbox 
                checked={people.length > 0 && people.every(p => selectedIds.has(p.id))}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
          )}
          <TableHead className="w-12">Foto</TableHead>
          <TableHead>Fighter ID</TableHead>
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
            <TableCell colSpan={onToggleRow ? 9 : 8} className="text-center py-8 text-muted-foreground">
              Nenhuma pessoa encontrada
            </TableCell>
          </TableRow>
        ) : (
          people.map((person) => (
            <TableRow 
              key={person.id} 
              className={cn(
                "cursor-pointer hover:bg-muted/50 transition-colors",
                selectedIds.has(person.id) && "bg-primary/5 hover:bg-primary/10"
              )}
              onClick={() => onEdit(person)}
            >
              {onToggleRow && (
                <TableCell className="w-12 px-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={selectedIds.has(person.id)}
                    onCheckedChange={() => {
                        if (onToggleRow) onToggleRow(person);
                    }}
                  />
                </TableCell>
              )}
              <TableCell>
                <Avatar className="h-10 w-10 border border-muted shadow-sm">
                  {person.fighter_id !== null && person.fighter_id !== undefined ? (
                    <AvatarImage 
                      src={getFighterPhotoUrl(person.fighter_id)} 
                      alt={person.compiled_name} 
                      className={cn(enrolledIds.has(person.id) && "border-2 border-green-500 rounded-full")}
                    />
                  ) : null}
                  <AvatarFallback className={cn(
                    "text-xs font-bold bg-muted/50",
                    enrolledIds.has(person.id) && "border-2 border-green-500"
                  )}>
                    {person.name?.[0]}{(person.surname || '')[0]}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {person.fighter_id !== null && person.fighter_id !== undefined ? (
                    <Badge variant="outline" className="font-mono text-[10px] bg-background w-fit">
                      ID: {person.fighter_id}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs font-mono">-</span>
                  )}
                  {enrolledIds.has(person.id) && (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-[10px] h-4 px-1 w-fit">
                      ENROLLED
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-semibold">{person.compiled_name}</TableCell>
              <TableCell className="text-muted-foreground italic text-sm">
                {person.event_name || '-'}
              </TableCell>
              <TableCell>
                {person.nationality ? (
                  <Badge variant="secondary" className="font-normal">{person.nationality}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs">{person.passport_number || '-'}</span>
              </TableCell>
              <TableCell>
                {person.passport_expiry ? (
                  <Badge
                    variant={
                      isPassportExpired(person.passport_expiry)
                        ? 'destructive'
                        : isPassportExpiringSoon(person.passport_expiry)
                        ? 'warning'
                        : 'outline'
                    }
                    className="font-mono text-[10px]"
                  >
                    {formatDate(person.passport_expiry)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {canEdit && (
                      <DropdownMenuItem onClick={() => onEdit(person)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar Detalhes
                      </DropdownMenuItem>
                    )}
                    {canEdit && onEnroll && (
                      <DropdownMenuItem onClick={() => onEnroll(person)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Enroll in Event
                      </DropdownMenuItem>
                    )}
                    {person.document_folder && (
                      <DropdownMenuItem asChild>
                        <a href={person.document_folder} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Ver Documentos
                        </a>
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        className="text-red-500 focus:text-red-500 focus:bg-red-50"
                        onClick={() => onDelete(person)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir Registro
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
