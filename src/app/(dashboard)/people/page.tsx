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
import { Plus, Upload, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/use-permissions'
import type { Person, PeopleFilters } from '@/types/database'
import type { PersonSchema } from '@/lib/validations/person'
import {
  getPeople,
  createPerson,
  updatePerson,
  deletePerson,
  getNationalities,
  importPeopleFromCSV,
} from '@/lib/services/people'

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([])
  const [nationalities, setNationalities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [filters, setFilters] = useState<PeopleFilters>({ page: 1, pageSize: 20 })
  const [totalPages, setTotalPages] = useState(1)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)

  const { canEdit, isAdmin } = usePermissions()
  const canEditPeople = canEdit('people')

  const fetchPeople = async () => {
    setLoading(true)
    try {
      const response = await getPeople(filters)
      setPeople(response.data)
      setTotalPages(response.totalPages)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar pessoas')
    } finally {
      setLoading(false)
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

  useEffect(() => { fetchPeople() }, [filters])
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
      fetchPeople()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir pessoa')
    } finally {
      setFormLoading(false)
    }
  }

  const handleCSVImport = async (data: any[]) => {
    return await importPeopleFromCSV(data)
  }

  const handleCSVComplete = () => {
    setCsvOpen(false)
    fetchPeople()
    fetchNationalities()
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="People Database" description="Gerenciamento de pessoas" />
      
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

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <PeopleTable
                people={people}
                onEdit={handleEdit}
                onDelete={handleDelete}
                canEdit={canEditPeople}
                canDelete={isAdmin}
              />
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              disabled={filters.page === 1}
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
            >
              Anterior
            </Button>
            <span className="flex items-center px-4 text-sm">
              Página {filters.page} de {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={filters.page === totalPages}
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
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
        <DialogContent className="max-w-2xl">
          <CSVImport
            onImport={handleCSVImport}
            onCancel={handleCSVComplete}
          />
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
    </div>
  )
}
