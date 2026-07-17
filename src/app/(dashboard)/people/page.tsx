'use client'

import { useState, useEffect } from 'react'
import { DashboardHeader } from '@/components/layout/dashboard-header'
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
import { GenericCSVImport, type FieldDef, type ImportResult } from '@/components/shared/generic-csv-import'
import { QuickEnrollDialog } from '@/components/forms/quick-enroll-dialog'
import { PeopleBatchEnrollment } from '@/components/forms/people-batch-enrollment'
import { Plus, Upload, Search, X, Users, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
import { CSVImportDropdown, downloadCSVTemplate } from '@/components/shared/csv-import-dropdown'
import type { Person, PeopleFilters, PersonFormData } from '@/types/database'
import type { PersonSchema } from '@/lib/validations/person'
import {
  getPeople,
  createPerson,
  updatePerson,
  deletePerson,
  bulkDeletePeople,
  getNationalities,
  importPeopleFromCSV,
  syncPeopleFromGoogleSheet,
} from '@/lib/services/people'
import { getActiveEvents } from '@/lib/services/events'
import { getEnrollmentsByEvent } from '@/lib/services/enrollments'
import type { Event } from '@/types/database'

const PEOPLE_FIELDS: FieldDef[] = [
  { value: 'name', label: 'Nome' },
  { value: 'surname', label: 'Sobrenome' },
  { value: 'event_name', label: 'Nome de Guerra' },
  { value: 'appadmin_fighter_id', label: 'Fighter ID' },
  { value: 'gender', label: 'Gênero' },
  { value: 'phone', label: 'Telefone' },
  { value: 'dob', label: 'Data de Nascimento' },
  { value: 'nationality', label: 'Nacionalidade' },
  { value: 'passport_number', label: 'Nº Passaporte' },
  { value: 'passport_expiry', label: 'Validade Passaporte' },
  { value: 'passport_photo', label: 'Link Foto Passaporte' },
  { value: 'document_folder', label: 'Pasta de Documentos' },
  { value: 'height', label: 'Altura' },
  { value: 'reach', label: 'Envergadura' },
]

/** Normalizes a CSV date cell to YYYY-MM-DD, or null when unparseable. */
function parseCSVDate(value: string): string | null {
  // DD/MM/YYYY or DD-MM-YYYY (European order)
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(value)) {
    const [day, month, year] = value.split(/[\/\-]/).map(Number)
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // Excel serial date. Excel's epoch is 1899-12-30, which absorbs its
  // "1900 was a leap year" bug.
  if (/^\d+(\.\d+)?$/.test(value)) {
    const serial = parseFloat(value)
    if (!(serial > 0 && serial < 100000)) return null
    const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400 * 1000)
    if (isNaN(date.getTime())) return null
    return date.toISOString().split('T')[0]
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const attempt = new Date(value)
  return isNaN(attempt.getTime()) ? null : attempt.toISOString().split('T')[0]
}

/** Coerces one mapped CSV cell into the shape PersonFormData expects. */
function transformPersonValue(field: string, value: string): unknown {
  if (!value) return null

  if (field === 'height' || field === 'reach') {
    const numeric = value.replace(/[^\d.,-]/g, '').replace(',', '.')
    return numeric ? Number(numeric) : null
  }

  if (field === 'dob' || field === 'passport_expiry') return parseCSVDate(value)

  return String(value)
}

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
  const [csvFullscreen, setCsvFullscreen] = useState(false)
  // Changed from Set<string> to Map<string, Person> to persist full objects
  const [selectedPeople, setSelectedPeople] = useState<Map<string, Person>>(new Map())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [isBulkEnrolling, setIsBulkEnrolling] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [syncing, setSyncing] = useState(false)

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

  const fetchActiveEventEnrollments = async () => {
    try {
      const events = await getActiveEvents();
      if (events.length > 0) {
        const currentEvent = events[0];
        setActiveEvent(currentEvent);
        const enrollments = await getEnrollmentsByEvent(currentEvent.id);
        setEnrolledIds(new Set(enrollments.map(e => e.person_id)));
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  }

  useEffect(() => { 
    if (!permissionsLoading) {
      fetchPeople() 
    }
  }, [filters, permissionsLoading])
  
  useEffect(() => { 
    fetchNationalities();
    fetchActiveEventEnrollments();
  }, [])

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

  const handleToggleRow = (person: Person) => {
    setSelectedPeople(prev => {
        const next = new Map(prev)
        if (next.has(person.id)) {
            next.delete(person.id)
        } else {
            next.set(person.id, person)
        }
        return next
    })
  }

  const handleToggleAll = (active: boolean) => {
    if (!active) {
        setSelectedPeople(new Map())
    } else {
        // Only select what is currently visible, merging with existing
        setSelectedPeople(prev => {
            const next = new Map(prev)
            people.forEach(p => next.set(p.id, p))
            return next
        })
    }
  }

  const confirmDelete = async () => {
    if (!selectedPerson) return
    setFormLoading(true)
    try {
      await deletePerson(selectedPerson.id)
      toast.success('Pessoa excluída com sucesso')
      setDeleteDialogOpen(false)
      setDeleteDialogOpen(false)
      setSelectedPeople(prev => {
        const next = new Map(prev)
        next.delete(selectedPerson.id)
        return next
      })
      fetchPeople()
      fetchPeople()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir pessoa')
    } finally {
      setFormLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedPeople.size === 0) return
    setIsBulkDeleting(true)
    try {
      await bulkDeletePeople(Array.from(selectedPeople.keys()))
      toast.success(`${selectedPeople.size} pessoas excluídas com sucesso`)
      setBulkDeleteDialogOpen(false)
      setSelectedPeople(new Map())
      fetchPeople()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir pessoas')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const handleCSVImport = async (
    rows: PersonFormData[],
    upsertMode: boolean,
    onProgress: (current: number, total: number, message?: string) => void,
    { checkDuplicates, mapping }: { checkDuplicates: boolean; mapping: Record<string, string> }
  ): Promise<ImportResult> => {
    const res = await importPeopleFromCSV(rows, onProgress, checkDuplicates, mapping, upsertMode)
    return {
      created: res.success,
      updated: res.updated,
      skipped: res.duplicates.map((name, i) => ({
        row: i + 1,
        name,
        message: upsertMode ? 'Já existe — sem alteração' : 'Já existe no banco',
      })),
      errors: res.errors.map((e, i) => ({
        row: i + 1,
        name: e.fullName,
        message: e.message,
        column: e.csvColumnTitle || e.column,
        errorType: e.errorType,
      })),
    }
  }

  const handleCSVComplete = () => {
    setCsvOpen(false)
    fetchPeople()
    fetchNationalities()
  }

  const handleSyncSheet = async () => {
    setSyncing(true)
    try {
      const result = await syncPeopleFromGoogleSheet()
      const parts = [`${result.success} novos`]
      if (result.duplicates.length > 0) parts.push(`${result.duplicates.length} já existiam`)
      if (result.errors.length > 0) parts.push(`${result.errors.length} com erro`)
      const summary = parts.join(', ')

      if (result.errors.length > 0) {
        toast.warning(`Sincronização concluída: ${summary}`, {
          description: result.errors.slice(0, 3).map((e) => `${e.fullName}: ${e.message}`).join(' • '),
        })
      } else {
        toast.success(`Sincronização concluída: ${summary}`)
      }
      fetchPeople()
      fetchNationalities()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao sincronizar com Google Sheet')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <DashboardHeader 
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
            <Button
              variant={filters.personIds ? 'default' : 'outline'}
              size="sm"
              disabled={!activeEvent}
              title={activeEvent ? `Show only people enrolled in ${activeEvent.name}` : 'No active event'}
              onClick={() =>
                setFilters({
                  ...filters,
                  personIds: filters.personIds ? undefined : Array.from(enrolledIds),
                  page: 1,
                })
              }
            >
              <Users className="mr-2 h-4 w-4" />
              Enrolled{activeEvent && filters.personIds ? ` · ${activeEvent.name}` : ''}
            </Button>
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
                  <CSVImportDropdown
                    onImportClick={() => setCsvOpen(true)}
                    onTemplateDownload={() => downloadCSVTemplate('people_import_template.csv', 'Name,Surname,Date of Birth (YYYY-MM-DD),Gender,Nationality,Phone,Passport Name,Passport Number,Passport Expiry,Fighter ID\nJohn,Doe,1990-01-15,male,USA,+1234567890,JOHN DOE,AB123456,2028-12-31,F001\n')}
                    extraItems={[
                      {
                        label: syncing ? 'Sincronizando...' : 'Sync Google Sheet',
                        icon: <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />,
                        onClick: handleSyncSheet,
                        disabled: syncing || !process.env.NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL,
                        title: !process.env.NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL ? 'Configure NEXT_PUBLIC_PEOPLE_SHEET_CSV_URL no .env.local' : undefined,
                      },
                    ]}
                  />
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
            {selectedPeople.size > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                <Badge variant="secondary" className="h-6">{selectedPeople.size} selecionados</Badge>
                
                <Button 
                  variant="default" 
                  size="sm" 
                  className="h-8 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setIsBulkEnrolling(true)}
                >
                  <Users className="mr-2 h-4 w-4" />Batch Enroll
                </Button>

                {isAdmin && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="h-8"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                  >
                    <X className="mr-2 h-4 w-4" />Excluir
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8"
                  onClick={() => setSelectedPeople(new Map())}
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
                selectedIds={new Set(selectedPeople.keys())}
                onToggleRow={handleToggleRow}
                onToggleAll={handleToggleAll}
                enrolledIds={enrolledIds}
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
        )} data-fullscreen={csvFullscreen}>
          <div className="bg-background rounded-lg border shadow-2xl flex flex-col h-full w-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col">
              <GenericCSVImport<PersonFormData>
                title="Importar CSV"
                subtitle="Relacione as colunas do arquivo com os campos do banco de dados."
                fields={PEOPLE_FIELDS}
                requiredField="name"
                uploadHint="Formato suportado: .csv (codificação UTF-8)"
                defaultUpsert={false}
                showDuplicateCheck
                upsertRequiresDuplicateCheck
                allowFullscreen
                onFullscreenChange={setCsvFullscreen}
                transformValue={transformPersonValue}
                enableReportDownload
                resultLabels={{ skipped: 'Duplicados' }}
                onImport={handleCSVImport}
                onComplete={handleCSVComplete}
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
              Tem certeza que deseja excluir as {selectedPeople.size} pessoas selecionadas?
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
            fetchActiveEventEnrollments();
            toast.success('Enrollment complete');
        }}
      />

      {isBulkEnrolling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-5xl h-[90vh]">
            <PeopleBatchEnrollment 
              selectedPeople={Array.from(selectedPeople.values())}
              onCancel={() => setIsBulkEnrolling(false)}
              onRemovePerson={(id) => {
                  const next = new Map(selectedPeople);
                  next.delete(id);
                  setSelectedPeople(next);
                  if (next.size === 0) setIsBulkEnrolling(false);
              }}
              onSuccess={() => {
                  setIsBulkEnrolling(false);
                  setSelectedPeople(new Map());
                  fetchActiveEventEnrollments();
                  fetchPeople();
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
