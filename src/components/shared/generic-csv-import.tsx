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
import { Upload, AlertCircle, CheckCircle2, Loader2, UserX, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export interface FieldDef {
  value: string
  label: string
}

interface ImportResult {
  created: number
  updated: number
  skipped: { row: number; name: string; message: string }[]
  errors: { row: number; name: string; message: string }[]
}

interface GenericCSVImportProps {
  title: string
  subtitle?: string
  fields: FieldDef[]
  requiredField: string
  onImport: (rows: Record<string, string>[], upsertMode: boolean, onProgress: (c: number, t: number, m?: string) => void) => Promise<ImportResult>
  onComplete: () => void
  showUpsert?: boolean
}

function parseCSV(text: string) {
  const cleaned = text.replace(/^\uFEFF/, '').replace(/\0/g, '')
  const rawLines = cleaned.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (rawLines.length === 0) return { headers: [] as string[], rows: [] as Record<string, string>[] }

  const candidates = [',', ';', '\t', '|']
  let delimiter = ','
  let maxFields = 0
  candidates.forEach(c => { const count = rawLines[0].split(c).length; if (count > maxFields) { maxFields = count; delimiter = c } })

  const getFields = (line: string, delim: string) => {
    const fields: string[] = []; let current = ''; let inQuotes = false
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

export function GenericCSVImport({ title, subtitle, fields, requiredField, onImport, onComplete, showUpsert = true }: GenericCSVImportProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'result'>('upload')
  const [csvData, setCsvData] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<{ csvColumn: string; dbField: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' })
  const [result, setResult] = useState<ImportResult | null>(null)
  const [upsertMode, setUpsertMode] = useState(true)

  const allFields = [{ value: 'skip', label: '-- Ignorar --' }, ...fields]

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const { headers: h, rows } = parseCSV(ev.target?.result as string)
      setHeaders(h); setCsvData(rows)
      setMappings(h.map(col => ({ csvColumn: col, dbField: 'skip' })))
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
        setHeaders(h); setCsvData(rows)
        setMappings(h.map(col => ({ csvColumn: col, dbField: 'skip' })))
        setStep('mapping')
      }
      reader.readAsText(file)
    }
  }, [])

  const transformData = () => csvData.map(row => {
    const t: Record<string, string> = {}
    mappings.forEach(m => { if (m.dbField !== 'skip') t[m.dbField] = row[m.csvColumn]?.trim() || '' })
    return t
  })

  const handleImport = async () => {
    setLoading(true)
    try {
      const data = transformData()
      const res = await onImport(data, upsertMode, (c, t, m) => setProgress({ current: c, total: t, message: m || '' }))
      setResult(res); setStep('result')
    } catch (err: any) {
      setResult({ created: 0, updated: 0, skipped: [], errors: [{ row: 0, name: 'Sistema', message: err.message }] })
      setStep('result')
    } finally { setLoading(false) }
  }

  const hasRequired = mappings.some(m => m.dbField === requiredField)
  const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

  // UPLOAD
  if (step === 'upload') {
    return (
      <Card className="border-none shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4 px-0 pb-0">
          <Label htmlFor="csv-generic" className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">Clique para selecionar ou arraste o arquivo CSV</p>
            <p className="text-xs text-muted-foreground mt-1">Identificação feita pelo nome no passaporte</p>
            <Input id="csv-generic" type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
          </Label>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onComplete}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // MAPPING
  if (step === 'mapping') {
    return (
      <Card className="border-none shadow-none flex flex-col h-full bg-transparent">
        <CardHeader className="px-6 pt-6 pb-4 border-b bg-background/50 rounded-t-xl">
          <CardTitle className="text-xl">Mapear Colunas</CardTitle>
          <CardDescription>O campo <strong>{fields.find(f => f.value === requiredField)?.label}</strong> é obrigatório.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6 flex-1 flex flex-col min-h-0">
          <div className="border rounded-lg divide-y overflow-y-auto bg-background/50 flex-1" style={{ maxHeight: '500px' }}>
            {mappings.map((m, idx) => {
              const sample = csvData[0]?.[m.csvColumn] || ''
              const used = mappings.map(mp => mp.dbField).filter(f => f !== 'skip')
              return (
                <div key={idx} className="flex items-center gap-4 p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <span className="text-sm font-bold truncate max-w-[180px]">{m.csvColumn}</span>
                    <span className="text-muted-foreground/30 shrink-0">→</span>
                    {sample && <span className="text-[11px] text-muted-foreground truncate italic bg-muted/30 px-2 py-1 rounded border border-dashed max-w-[200px]">Ex: {sample.substring(0, 30)}</span>}
                  </div>
                  <div className="w-56 shrink-0">
                    <Select value={m.dbField} onValueChange={(v) => setMappings(prev => { const n = [...prev]; n[idx] = { ...n[idx], dbField: v }; return n })}>
                      <SelectTrigger className="w-full h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {allFields.map(f => {
                          const isUsed = f.value !== 'skip' && used.includes(f.value) && f.value !== m.dbField
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
            <Button disabled={!hasRequired} onClick={() => setStep('preview')}>Revisar</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // PREVIEW
  if (step === 'preview') {
    const preview = transformData().slice(0, 8)
    const active = mappings.filter(m => m.dbField !== 'skip')
    return (
      <Card className="border-none shadow-none flex flex-col h-full bg-transparent">
        <CardHeader className="px-6 pt-6 pb-4 border-b bg-background/50 rounded-t-xl">
          <CardTitle className="text-xl flex items-center gap-3">
            {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Processando...</> : 'Pré-visualização'}
            <Badge variant="outline" className="font-mono bg-primary/10">{csvData.length} linhas</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6 flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-6 bg-muted/20 rounded-xl border border-dashed text-center">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center"><span className="text-[10px] font-bold">{Math.round(pct)}%</span></div>
              </div>
              <h3 className="text-xl font-bold">{progress.message}</h3>
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                  <span>{progress.current} de {progress.total}</span><span className="text-primary">{Math.round(pct)}%</span>
                </div>
                <Progress value={pct} className="h-3" />
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>{active.map((m, i) => <TableHead key={i} className="font-bold text-[10px] uppercase">{fields.find(f => f.value === m.dbField)?.label}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, i) => <TableRow key={i}>{active.map((m, j) => <TableCell key={j} className="py-2 text-xs truncate max-w-[150px]">{row[m.dbField] || '-'}</TableCell>)}</TableRow>)}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center bg-muted/30 border border-dashed p-4 rounded-xl mt-auto">
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">{csvData.length} registros serão processados</p>
                  {showUpsert && (
                    <div className="flex items-center space-x-2">
                      <Switch id="upsert-gen" checked={upsertMode} onCheckedChange={setUpsertMode} />
                      <Label htmlFor="upsert-gen" className="text-xs font-medium cursor-pointer">Atualizar existentes</Label>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" onClick={() => setStep('mapping')}>Editar</Button>
                  <Button size="sm" onClick={handleImport} className="px-6 shadow-md">Importar</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  // RESULT
  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0"><CardTitle>Resultado da Importação</CardTitle></CardHeader>
      <CardContent className="space-y-6 px-0 pb-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center space-y-1">
            <CheckCircle2 className="mx-auto h-6 w-6 text-green-600" /><p className="text-2xl font-bold text-green-700">{result?.created}</p>
            <p className="text-xs font-medium text-green-600/80 uppercase tracking-wider">Novos</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center space-y-1">
            <RefreshCw className="mx-auto h-6 w-6 text-blue-600" /><p className="text-2xl font-bold text-blue-700">{result?.updated}</p>
            <p className="text-xs font-medium text-blue-600/80 uppercase tracking-wider">Atualizados</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1">
            <UserX className="mx-auto h-6 w-6 text-amber-600" /><p className="text-2xl font-bold text-amber-700">{result?.skipped.length}</p>
            <p className="text-xs font-medium text-amber-600/80 uppercase tracking-wider">Não Encontrados</p>
          </div>
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-1">
            <AlertCircle className="mx-auto h-6 w-6 text-red-600" /><p className="text-2xl font-bold text-red-700">{result?.errors.length}</p>
            <p className="text-xs font-medium text-red-600/80 uppercase tracking-wider">Erros</p>
          </div>
        </div>
        {(result?.skipped.length || 0) > 0 && (
          <div className="bg-amber-500/5 rounded-lg p-3 max-h-40 overflow-y-auto border border-amber-500/10 text-xs">
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              {result?.skipped.map((s, i) => <li key={i}>Linha {s.row}: <strong>{s.name}</strong> — {s.message}</li>)}
            </ul>
          </div>
        )}
        {(result?.errors.length || 0) > 0 && (
          <div className="bg-red-500/5 rounded-lg p-3 max-h-40 overflow-y-auto border border-red-500/10 text-xs">
            <ul className="list-disc list-inside space-y-1 text-red-600/80">
              {result?.errors.map((e, i) => <li key={i}>Linha {e.row}: <strong>{e.name}</strong> — {e.message}</li>)}
            </ul>
          </div>
        )}
        <div className="pt-4 border-t"><Button className="w-full" onClick={onComplete}>Concluir</Button></div>
      </CardContent>
    </Card>
  )
}
