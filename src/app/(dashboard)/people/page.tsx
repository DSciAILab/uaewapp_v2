'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PeopleTable } from '@/components/tables/people-table'
import { PersonForm } from '@/components/forms/person-form'
import { CSVImport } from '@/components/forms/csv-import'
import { QuickEnrollDialog } from '@/components/forms/quick-enroll-dialog'
import { Plus, Upload, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
import type { Person, PeopleFilters } from '@/types/database'
import type { PersonSchema } from '@/lib/validations/person'
import {
  getPeople,
  createPerson,
  updatePerson,
  deletePerson,
  bulkDeletePeople,
  getNationalities,
  importPeopleFromCSV,
} from '@/lib/services/people'

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([])
  const [nationalities, setNationalities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [filters, setFilters] = useState<PeopleFilters>({ page: 1, pageSize: 50 })
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)

  const { canEdit, isAdmin, loading: permissionsLoading } = usePermissions()
  const canEditPeople = canEdit('people')

  const fetchPeople = async () => {
    setLoading(true)
    try {
      const response = await getPeople(filters)
      setPeople(response.data)
      setTotalPages(response.totalPages)
      setTotalCount(response.count)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar pessoas')
    } finally {
      setLoading(false)
      setSelectedIds(new Set())
    }
  }

  const fetchNationalities = async () => {
    try {
      const data = await getNationalities()
      setNationalities(data)
    } catch (error) {
      console.error('Error fetching nationalities:', error)
    }
  }

  useEffect(() => { 
    if (!permissionsLoading) {
      fetchPeople() 
    }
  }, [filters, permissionsLoading])
  useEffect(() => { fetchNationalities() }, [])

  const handleCreate = () => {
    setSelectedPerson(null)
    setDrawerOpen(true)
  }

  const handleEdit = (person: Person) => {
    setSelectedPerson(person)
    setDrawerOpen(true)
  }

  const handleDelete = (person: Person) => {
    setSelectedPerson(person)
    setDeleteDialogOpen(true)
  }

  const handleEnroll = (person: Person) => {
    setSelectedPerson(person)
    setEnrollDialogOpen(true)
  }

  const handleSubmit = async (data: PersonSchema) => {
    setFormLoading(true)
    try {
      if (selectedPerson) {
        await updatePerson(selectedPerson.id, data)
        toast.success('Pessoa atualizada com sucesso')
      } else {
        await createPerson(data)
        toast.success('Pessoa criada com sucesso')
      }
      setDrawerOpen(false)
      fetchPeople()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar pessoa')
    } finally {
      setFormLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!selectedPerson) return
    setFormLoading(true)
    try {
      await deletePerson(selectedPerson.id)
      toast.success('Pessoa excluída com sucesso')
      setDeleteDialogOpen(false)
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(selectedPerson.id)
        return next
      })
      fetchPeople()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir pessoa')
    } finally {
      setFormLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setIsBulkDeleting(true)
    try {
      await bulkDeletePeople(Array.from(selectedIds))
      toast.success(`${selectedIds.size} pessoas excluídas com sucesso`)
      setBulkDeleteDialogOpen(false)
      setSelectedIds(new Set())
      fetchPeople()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir pessoas')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const handleCSVImport = async (data: any[], onProgress?: (current: number, total: number, message?: string) => void, checkDuplicates?: boolean) => {
    return await importPeopleFromCSV(data, onProgress, checkDuplicates)
  }

  const handleCSVComplete = () => {
    setCsvOpen(false)
    fetchPeople()
    fetchNationalities()
  }

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="People Database" 
        description={loading ? "Carregando registros..." : `Gerenciamento de ${totalCount} pessoas cadastradas`} 
      />
      
      <div className="flex-1 p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, passaporte..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                className="pl-10"
              />
            </div>
            {filters.search && (
              <Button variant="ghost" size="icon" onClick={() => setFilters({ ...filters, search: '', page: 1 })}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Select
              value={filters.nationality || 'all'}
              onValueChange={(v) => setFilters({ ...filters, nationality: v === 'all' ? undefined : v, page: 1 })}
            >
              <SelectTrigger className="w-40"><SelectValue placeholder="Nacionalidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {nationalities.map((n) => (<SelectItem key={n} value={n}>{n}</SelectItem>))}
              </SelectContent>
            </Select>
            
            {canEditPeople && (
              <>
                <Button variant="outline" onClick={() => setCsvOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />Importar CSV
                </Button>
                <Button onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />Nova Pessoa
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {people.length} de {totalCount} registros
            </p>
            {selectedIds.size > 0 && isAdmin && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                <Badge variant="secondary" className="h-6">{selectedIds.size} selecionados</Badge>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-8"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <X className="mr-2 h-4 w-4" />Excluir Selecionados
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Limpar
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Registros por página:</span>
            <Select
              value={filters.pageSize === 10000 ? 'all' : filters.pageSize?.toString() || '50'}
              onValueChange={(v) => {
                const newSize = v === 'all' ? 10000 : parseInt(v);
                setFilters({ ...filters, pageSize: newSize, page: 1 });
              }}
            >
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="250">250</SelectItem>
                <SelectItem value="500">500</SelectItem>
                <SelectItem value="1000">1000</SelectItem>
                <SelectItem value="1500">1500</SelectItem>
                <SelectItem value="all">Tudo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <PeopleTable
                people={people}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onEnroll={handleEnroll}
                canEdit={canEditPeople}
                canDelete={isAdmin}
              />
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 py-4 border-t bg-muted/5 rounded-lg">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page === 1}
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
              className="px-6"
            >
              Anterior
            </Button>
            
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">Página</span>
              <Badge variant="secondary" className="px-2 py-0 h-6 flex items-center justify-center min-w-8">
                {filters.page}
              </Badge>
              <span className="text-sm text-muted-foreground whitespace-nowrap">de {totalPages}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={filters.page === totalPages}
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
              className="px-6"
            >
              Próxima
            </Button>
          </div>
        )}
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedPerson ? 'Editar Pessoa' : 'Nova Pessoa'}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <PersonForm
              person={selectedPerson}
              onSubmit={handleSubmit}
              onCancel={() => setDrawerOpen(false)}
              loading={formLoading}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className={cn(
          "transition-all duration-300 ease-in-out p-0 border-none bg-transparent gap-0",
          "max-w-4xl max-h-[95vh]",
          "data-[fullscreen=true]:max-w-[98vw] data-[fullscreen=true]:max-h-[98vh] data-[fullscreen=true]:w-[98vw] data-[fullscreen=true]:h-[98vh]"
        )}>
          <div className="bg-background rounded-lg border shadow-2xl flex flex-col h-full w-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col">
              <CSVImport
                onImport={handleCSVImport}
                onCancel={handleCSVComplete}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir {selectedPerson?.compiled_name}?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={formLoading}>
              {formLoading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão em Massa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir as {selectedIds.size} pessoas selecionadas?
              Esta ação não pode ser desfeita e removerá permanentemente os registros.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkDeleting}>
              {isBulkDeleting ? 'Excluindo...' : 'Excluir Todos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <QuickEnrollDialog
        person={selectedPerson}
        open={enrollDialogOpen}
        onOpenChange={setEnrollDialogOpen}
        onSuccess={() => {
            // Optional: refresh something? Usually enrollment doesn't change person list directly, but maybe updates visual indicators if we had any
            toast.success('Enrollment complete');
        }}
      />
    </div>
  )
}
