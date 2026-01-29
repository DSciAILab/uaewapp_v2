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
import { MoreHorizontal, Pencil, X, Plane, FileText, Hotel, Car, BrainCircuit } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { EnrollmentWithDetails } from '@/lib/services/enrollments'
import { getFighterPhotoUrl, cn } from '@/lib/utils'

interface EnrollmentsTableProps {
  enrollments: EnrollmentWithDetails[]
  onEdit: (enrollment: EnrollmentWithDetails) => void
  onCancel: (enrollment: EnrollmentWithDetails) => void
  canEdit?: boolean
}

export function EnrollmentsTable({ enrollments, onEdit, onCancel, canEdit = true }: EnrollmentsTableProps) {
  const router = useRouter()
  const getRoleBadgeColor = (code: string) => {
    switch (code) {
      case 'F': return 'default'
      case 'C': return 'secondary'
      case 'ST': return 'outline'
      case 'G': return 'outline'
      default: return 'secondary'
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">Event ID</TableHead>
          <TableHead className="w-12"></TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Função</TableHead>
          <TableHead>Corner</TableHead>
          <TableHead>Necessidades</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {enrollments.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              Nenhuma pessoa inscrita
            </TableCell>
          </TableRow>
        ) : (
          enrollments.map((enrollment) => (
            <TableRow key={enrollment.id}>
              <TableCell>
                <span className="font-mono text-sm font-medium">
                  {`${enrollment.role?.code}.${String(enrollment.event_code_seq || 1).padStart(3, '0')}`}
                </span>
              </TableCell>
              <TableCell>
                <div className="relative">
                  <Avatar className="h-9 w-9 border-2 border-slate-100 dark:border-slate-800">
                    {enrollment.person?.fighter_id ? (
                       <AvatarImage 
                         src={getFighterPhotoUrl(enrollment.person.fighter_id)} 
                         alt={enrollment.person.compiled_name} 
                         className="object-cover"
                       />
                    ) : null}
                    <AvatarFallback className="text-xs bg-slate-200 dark:bg-slate-700">
                      {enrollment.person?.name?.[0]}{(enrollment.person?.surname || '')[0]}
                    </AvatarFallback>
                  </Avatar>
                  {enrollment.role?.code === 'F' && (
                     <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-950" title="Fighter" />
                  )}
                </div>
              </TableCell>
              <TableCell className="font-medium">{enrollment.person?.compiled_name}</TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeColor(enrollment.role?.code || '')}>
                  {enrollment.role?.name}
                </Badge>
              </TableCell>
              <TableCell>
                {enrollment.corner && (
                  <Badge className={cn(
                    "text-[10px] font-bold uppercase text-white min-w-[50px] justify-center",
                    enrollment.corner.toLowerCase() === 'red' ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
                  )}>
                    {enrollment.corner}
                  </Badge>
                )}
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
                        <Pencil className="mr-2 h-4 w-4" />Editar
                      </DropdownMenuItem>
                    )}
                    {canEdit && (
                      <DropdownMenuItem className="text-red-500" onClick={() => onCancel(enrollment)}>
                        <X className="mr-2 h-4 w-4" />Cancelar
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
