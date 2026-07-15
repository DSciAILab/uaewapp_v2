'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Upload, AlertCircle, CheckCircle2, Loader2, UserX, Plane, RefreshCw, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { importFlightsFromCSV, type FlightCSVRow, type FlightImportError } from '@/lib/services/flights'

const DB_FIELDS: { value: keyof FlightCSVRow | 'skip'; label: string }[] = [
  { value: 'skip', label: '-- Ignorar --' },
  { value: 'passport_name', label: 'Nome Passaporte' },
  { value: 'flight_type', label: 'Tipo de Voo' },
  { value: 'arrival_reservation', label: 'Reserva Chegada' },
  { value: 'arrival_flight_number', label: 'Nº Voo Chegada' },
  { value: 'arrival_date', label: 'Data Chegada' },
  { value: 'arrival_time', label: 'Hora Chegada' },
  { value: 'arrival_airport', label: 'Aeroporto Chegada' },
  { value: 'arrival_ticket_link', label: 'Link Bilhete Chegada' },
  { value: 'departure_reservation', label: 'Reserva Partida' },
  { value: 'departure_flight_number', label: 'Nº Voo Partida' },
  { value: 'departure_date', label: 'Data Partida' },
  { value: 'departure_time', label: 'Hora Partida' },
  { value: 'departure_airport', label: 'Aeroporto Partida' },
  { value: 'departure_ticket_link', label: 'Link Bilhete Partida' },
  { value: 'notes', label: 'Observações' },
]

interface FlightCSVImportProps {
  eventId: string
  eventName: string
  onComplete: () => void
}

interface CSVMapping {
  csvColumn: string
  dbField: keyof FlightCSVRow | 'skip'
}

export function FlightCSVImport({ eventId, eventName, onComplete }: FlightCSVImportProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'result'>('upload')
  const [csvData, setCsvData] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<CSVMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' })
  const [result, setResult] = useState<{ created: number; updated: number; skipped: FlightImportError[]; errors: FlightImportError[] } | null>(null)
  const [upsertMode, setUpsertMode] = useState(true)

  const parseCSV = (text: string) => {
    const cleaned = text.replace(/^\uFEFF/, '').replace(/\0/g, '')
    const rawLines = cleaned.split(/\r?\n/).filter(l => l.trim().length > 0)
    if (rawLines.length === 0) return { headers: [] as string[], rows: [] as Record<string, string>[] }

    const candidates = [',', ';', '\t', '|']
    let delimiter = ','
    let maxFields = 0
    candidates.forEach(c => {
      const count = rawLines[0].split(c).length
      if (count > maxFields) { maxFields = count; delimiter = c }
    })

    const getFields = (line: string, delim: string) => {
      const fields: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"' && inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else if (ch === '"') inQuotes = !inQuotes
        else if (ch === delim && !inQuotes) { fields.push(current.trim()); current = '' }
        else current += ch
      }
      fields.push(current.trim())
      return fields
    }

    const h = getFields(rawLines[0], delimiter)
    const rows = rawLines.slice(1).map(line => {
      const fields = getFields(line, delimiter)
      const row: Record<string, string> = {}
      h.forEach((header, i) => { row[header] = fields[i] || '' })
      return row
    })

    return { headers: h, rows }
  }

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const { headers: h, rows } = parseCSV(ev.target?.result as string)
      setHeaders(h)
      setCsvData(rows)
      setMappings(h.map(col => ({ csvColumn: col, dbField: 'skip' as any })))
      setStep('mapping')
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const { headers: h, rows } = parseCSV(ev.target?.result as string)
        setHeaders(h)
        setCsvData(rows)
        setMappings(h.map(col => ({ csvColumn: col, dbField: 'skip' as any })))
        setStep('mapping')
      }
      reader.readAsText(file)
    }
  }, [])

  const transformData = (): FlightCSVRow[] => {
    return csvData.map(row => {
      const transformed: any = {}
      mappings.forEach(m => {
        if (m.dbField !== 'skip') {
          transformed[m.dbField] = row[m.csvColumn]?.trim() || null
        }
      })
      return transformed as FlightCSVRow
    })
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const data = transformData()
      const res = await importFlightsFromCSV(eventId, data, upsertMode, (current, total, message) => {
        setProgress({ current, total, message: message || '' })
      })
      setResult(res)
      setStep('result')
    } catch (err: any) {
      setResult({ created: 0, updated: 0, skipped: [], errors: [{ row: 0, name: 'Sistema', message: err.message }] })
      setStep('result')
    } finally {
      setLoading(false)
    }
  }

  const hasPassportNameMapped = mappings.some(m => m.dbField === 'passport_name')
  const progressValue = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

  const downloadTemplate = () => {
    const content = 'Passport Name,Flight Type,Arrival Reservation,Arrival Flight Number,Arrival Date,Arrival Time,Arrival Airport,Arrival Ticket Link,Departure Reservation,Departure Flight Number,Departure Date,Departure Time,Departure Airport,Departure Ticket Link,Notes\nJohn Doe,full,ABC123,EK204,2026-04-15,14:30,DXB,,DEF456,EK205,2026-04-20,09:00,DXB,,\n'
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'flight_import_template.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // === STEP: UPLOAD ===
  if (step === 'upload') {
    return (
      <Card className="border-none shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Importar Voos via CSV</CardTitle>
          <CardDescription>Evento: <strong>{eventName}</strong></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-0 pb-0">
          <Label
            htmlFor="flight-csv"
            className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">Clique para selecionar ou arraste o arquivo CSV</p>
            <p className="text-xs text-muted-foreground mt-1">A identificação é feita pelo nome no passaporte</p>
            <Input id="flight-csv" type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
          </Label>
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={downloadTemplate}>
              <Download className="h-4 w-4" /> Baixar Template
            </Button>
            <Button variant="outline" onClick={onComplete}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // === STEP: MAPPING ===
  if (step === 'mapping') {
    return (
      <Card className="border-none shadow-none flex flex-col h-full bg-transparent">
        <CardHeader className="px-6 pt-6 pb-4 border-b bg-background/50 rounded-t-xl">
          <CardTitle className="text-xl font-bold">Mapear Colunas</CardTitle>
          <CardDescription>Relacione as colunas do CSV com os campos de voo. O campo <strong>Nome Passaporte</strong> é obrigatório.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/80 rounded-t-lg border font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="flex-1">Coluna no Arquivo & Amostra</span>
            <span className="w-64 text-right pr-6">Campo no Sistema</span>
          </div>
          <div className="border rounded-lg divide-y overflow-y-auto scrollbar-thin bg-background/50 flex-1" style={{ maxHeight: '500px' }}>
            {mappings.map((m, idx) => {
              const sampleValue = csvData[0]?.[m.csvColumn] || ''
              const usedFields = mappings.map(mp => mp.dbField).filter(f => f !== 'skip')
              return (
                <div key={idx} className="flex items-center gap-4 p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <span className="text-sm font-bold truncate max-w-[180px]" title={m.csvColumn}>{m.csvColumn}</span>
                    <span className="text-muted-foreground/30 shrink-0">→</span>
                    {sampleValue ? (
                      <span className="text-[11px] text-muted-foreground truncate italic bg-muted/30 px-2 py-1 rounded border border-dashed max-w-[200px]">
                        Ex: {sampleValue.length > 30 ? sampleValue.substring(0, 30) + '...' : sampleValue}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/40 italic">(vazio)</span>
                    )}
                  </div>
                  <div className="w-56 shrink-0">
                    <Select value={m.dbField} onValueChange={(v) => {
                      setMappings(prev => {
                        const next = [...prev]
                        next[idx] = { ...next[idx], dbField: v as any }
                        return next
                      })
                    }}>
                      <SelectTrigger className="w-full h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DB_FIELDS.map(f => {
                          const isUsed = f.value !== 'skip' && usedFields.includes(f.value as any) && f.value !== m.dbField
                          if (isUsed) return null
                          return <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button>
            <Button disabled={!hasPassportNameMapped} onClick={() => setStep('preview')}>Revisar Dados</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // === STEP: PREVIEW ===
  if (step === 'preview') {
    const preview = transformData().slice(0, 8)
    const activeMappings = mappings.filter(m => m.dbField !== 'skip')

    return (
      <Card className="border-none shadow-none flex flex-col h-full bg-transparent">
        <CardHeader className="px-6 pt-6 pb-4 border-b bg-background/50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-3">
                {loading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Processando...</>
                ) : 'Pré-visualização'}
                <Badge variant="outline" className="font-mono bg-primary/10">{csvData.length} linhas</Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                {loading ? 'Aguarde...' : `Evento: ${eventName}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6 flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-6 bg-muted/20 rounded-xl border border-dashed text-center">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold">{Math.round(progressValue)}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">{progress.message || 'Importando...'}</h3>
                <p className="text-sm text-muted-foreground">Não feche esta janela.</p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                  <span>{progress.current} de {progress.total}</span>
                  <span className="text-primary">{Math.round(progressValue)}%</span>
                </div>
                <Progress value={progressValue} className="h-3" />
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      {activeMappings.map((m, i) => (
                        <TableHead key={i} className="font-bold text-[10px] uppercase">
                          {DB_FIELDS.find(f => f.value === m.dbField)?.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, i) => (
                      <TableRow key={i}>
                        {activeMappings.map((m, j) => (
                          <TableCell key={j} className="py-2 text-xs truncate max-w-[150px]">
                            {(row as any)[m.dbField] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center bg-muted/30 border border-dashed p-4 rounded-xl mt-auto">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Plane className="h-5 w-5 shrink-0 text-primary" />
                    <p className="text-xs">{csvData.length} voos serão processados para <strong>{eventName}</strong></p>
                  </div>
                  <div className="flex items-center space-x-2 pl-8">
                    <Switch id="upsert" checked={upsertMode} onCheckedChange={setUpsertMode} />
                    <Label htmlFor="upsert" className="text-xs font-medium cursor-pointer">
                      Atualizar voos existentes
                    </Label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" onClick={() => setStep('mapping')} disabled={loading}>Editar Mapeamento</Button>
                  <Button size="sm" onClick={handleImport} disabled={loading} className="px-6 shadow-md">Iniciar Importação</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  // === STEP: RESULT ===
  const totalProcessed = (result?.created || 0) + (result?.updated || 0)
  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0"><CardTitle>Resultado da Importação de Voos</CardTitle></CardHeader>
      <CardContent className="space-y-6 px-0 pb-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center space-y-1">
            <CheckCircle2 className="mx-auto h-6 w-6 text-green-600" />
            <p className="text-2xl font-bold text-green-700">{result?.created}</p>
            <p className="text-xs font-medium text-green-600/80 uppercase tracking-wider">Novos</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center space-y-1">
            <RefreshCw className="mx-auto h-6 w-6 text-blue-600" />
            <p className="text-2xl font-bold text-blue-700">{result?.updated}</p>
            <p className="text-xs font-medium text-blue-600/80 uppercase tracking-wider">Atualizados</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1">
            <UserX className="mx-auto h-6 w-6 text-amber-600" />
            <p className="text-2xl font-bold text-amber-700">{result?.skipped.length}</p>
            <p className="text-xs font-medium text-amber-600/80 uppercase tracking-wider">Não Encontrados</p>
          </div>
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-1">
            <AlertCircle className="mx-auto h-6 w-6 text-red-600" />
            <p className="text-2xl font-bold text-red-700">{result?.errors.length}</p>
            <p className="text-xs font-medium text-red-600/80 uppercase tracking-wider">Erros</p>
          </div>
        </div>

        {(result?.skipped.length || 0) > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-bold flex items-center gap-2">
              <UserX className="h-4 w-4 text-amber-600" /> Pessoas não encontradas no evento
            </p>
            <div className="bg-amber-500/5 rounded-lg p-3 max-h-40 overflow-y-auto border border-amber-500/10 text-xs">
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {result?.skipped.map((s, i) => <li key={i}>Linha {s.row}: <strong>{s.name}</strong> — {s.message}</li>)}
              </ul>
            </div>
          </div>
        )}

        {(result?.errors.length || 0) > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-bold flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" /> Erros
            </p>
            <div className="bg-red-500/5 rounded-lg p-3 max-h-40 overflow-y-auto border border-red-500/10 text-xs">
              <ul className="list-disc list-inside space-y-1 text-red-600/80">
                {result?.errors.map((e, i) => <li key={i}>Linha {e.row}: <strong>{e.name}</strong> — {e.message}</li>)}
              </ul>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <Button className="w-full" onClick={onComplete}>Concluir e Voltar</Button>
        </div>
      </CardContent>
    </Card>
  )
}
