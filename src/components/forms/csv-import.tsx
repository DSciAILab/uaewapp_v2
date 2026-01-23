'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { CSVMapping, PersonFormData } from '@/types/database'

interface CSVImportProps {
  onImport: (data: PersonFormData[]) => Promise<{ success: number; errors: string[] }>
  onCancel: () => void
}

const DB_FIELDS: { value: keyof PersonFormData | 'skip'; label: string }[] = [
  { value: 'skip', label: '-- Ignorar --' },
  { value: 'name', label: 'Nome' },
  { value: 'surname', label: 'Sobrenome' },
  { value: 'event_name', label: 'Nome de Guerra' },
  { value: 'fighter_id', label: 'Fighter ID' },
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

export function CSVImport({ onImport, onCancel }: CSVImportProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'result'>('upload')
  const [csvData, setCsvData] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<CSVMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null)

  const parseCSV = (text: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length === 0) return { headers: [], rows: [] }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = values[i] || '' })
      return row
    })
    return { headers, rows }
  }

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const { headers: h, rows } = parseCSV(text)
      setHeaders(h)
      setCsvData(rows)
      setMappings(h.map(col => ({ csvColumn: col, dbField: 'skip' })))
      setStep('mapping')
    }
    reader.readAsText(file)
  }, [])

  const updateMapping = (csvColumn: string, dbField: keyof PersonFormData | 'skip') => {
    setMappings(prev => prev.map(m => m.csvColumn === csvColumn ? { ...m, dbField } : m))
  }

  const transformData = (): PersonFormData[] => {
    return csvData.map(row => {
      const transformed: Partial<PersonFormData> = {}
      mappings.forEach(m => {
        if (m.dbField !== 'skip') {
          const value = row[m.csvColumn]
          if (m.dbField === 'fighter_id' || m.dbField === 'height' || m.dbField === 'reach') {
            (transformed as any)[m.dbField] = value ? Number(value) : undefined
          } else {
            (transformed as any)[m.dbField] = value || undefined
          }
        }
      })
      return transformed as PersonFormData
    })
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const data = transformData()
      const res = await onImport(data)
      setResult(res)
      setStep('result')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'upload') {
    return (
      <Card>
        <CardHeader><CardTitle>Importar CSV</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <Label htmlFor="csv-file" className="cursor-pointer">
              <p className="mt-2 text-sm">Clique para selecionar ou arraste o arquivo CSV</p>
            </Label>
            <Input id="csv-file" type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </div>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        </CardContent>
      </Card>
    )
  }

  if (step === 'mapping') {
    return (
      <Card>
        <CardHeader><CardTitle>Mapear Colunas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Mapeie cada coluna do CSV para um campo do sistema.</p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {mappings.map(m => (
              <div key={m.csvColumn} className="flex items-center gap-4">
                <span className="w-40 text-sm font-medium truncate">{m.csvColumn}</span>
                <Select value={m.dbField} onValueChange={(v) => updateMapping(m.csvColumn, v as any)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DB_FIELDS.map(f => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button>
            <Button onClick={() => setStep('preview')}>Próximo</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'preview') {
    const preview = transformData().slice(0, 5)
    return (
      <Card>
        <CardHeader><CardTitle>Pré-visualização ({csvData.length} registros)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Sobrenome</TableHead>
                <TableHead>Nacionalidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.name || '-'}</TableCell>
                  <TableCell>{row.surname || '-'}</TableCell>
                  <TableCell>{row.nationality || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('mapping')}>Voltar</Button>
            <Button onClick={handleImport} disabled={loading}>{loading ? 'Importando...' : 'Importar'}</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle>Resultado da Importação</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span>{result?.success} registros importados com sucesso</span>
        </div>
        {result?.errors && result.errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              <span>{result.errors.length} erros encontrados</span>
            </div>
            <ul className="text-sm text-red-500 max-h-40 overflow-y-auto">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}
        <Button onClick={onCancel}>Fechar</Button>
      </CardContent>
    </Card>
  )
}
