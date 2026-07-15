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
import { Upload, AlertCircle, CheckCircle2, Loader2, Copy, Download, FileText, FileSpreadsheet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { CSVMapping, PersonFormData } from '@/types/database'
import type { ImportError } from '@/lib/services/people'

interface CSVImportProps {
  onImport: (data: PersonFormData[], onProgress: (current: number, total: number, message?: string) => void, checkDuplicates?: boolean, mapping?: Record<string, string>, upsertMode?: boolean) => Promise<{ success: number; updated: number; errors: ImportError[]; duplicates: string[] }>
  onCancel: () => void
}

const DB_FIELDS: { value: keyof PersonFormData | 'skip'; label: string }[] = [
  { value: 'skip', label: '-- Ignorar --' },
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

export function CSVImport({ onImport, onCancel }: CSVImportProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'result'>('upload')
  const [csvData, setCsvData] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<CSVMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' })
  const [result, setResult] = useState<{ success: number; updated: number; errors: ImportError[]; duplicates: string[] } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [checkDuplicates, setCheckDuplicates] = useState(true)
  const [upsertMode, setUpsertMode] = useState(false)

  const parseCSV = (text: string): { headers: string[]; rows: Record<string, string>[] } => {
    const cleanedText = text.replace(/^\uFEFF/, '').replace(/\0/g, '')
    const rawLines = cleanedText.split(/\r?\n/).filter(l => l.trim().length > 0)
    if (rawLines.length === 0) return { headers: [], rows: [] }

    // Enhanced Delimiter Detection
    const candidates = [',', ';', '\t', '|']
    let delimiter = ','
    let maxFields = 0
    
    // Check first 5 lines for consistency
    candidates.forEach(cand => {
      const lineFields = rawLines[0].split(cand).length
      if (lineFields > maxFields) {
        maxFields = lineFields
        delimiter = cand
      }
    })

    // Regex for CSV parsing (handles quotes and escaped quotes)
    const getFields = (line: string, delim: string) => {
      const fields: string[] = []
      let currentField = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        const nextChar = line[i+1]
        
        if (char === '"' && inQuotes && nextChar === '"') {
          currentField += '"'
          i++
        } else if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === delim && !inQuotes) {
          fields.push(currentField.trim())
          currentField = ''
        } else {
          currentField += char
        }
      }
      fields.push(currentField.trim())
      return fields
    }

    const rawHeaders = getFields(rawLines[0], delimiter)
    const uniqueHeaders: string[] = []
    const headerCounts: Record<string, number> = {}

    rawHeaders.forEach((h, i) => {
      let name = h.trim() || `Coluna_${i + 1}`
      if (headerCounts[name]) {
        headerCounts[name]++
        name = `${name}_${headerCounts[name]}`
      } else {
        headerCounts[name] = 1
      }
      uniqueHeaders.push(name)
    })

    const rows = rawLines.slice(1).map(line => {
      const fields = getFields(line, delimiter)
      const row: Record<string, string> = {}
      uniqueHeaders.forEach((header, i) => {
        row[header] = fields[i] || ''
      })
      return row
    })

    return { headers: uniqueHeaders, rows }
  }

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const { headers: h, rows = [] } = parseCSV(text)
      setHeaders(h)
      setCsvData(rows)
      setMappings(h.map(col => ({ csvColumn: col, dbField: 'skip' })))
      setStep('mapping')
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.endsWith('.csv')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        const { headers: h, rows = [] } = parseCSV(text)
        setHeaders(h)
        setCsvData(rows)
        setMappings(h.map(col => ({ csvColumn: col, dbField: 'skip' })))
        setStep('mapping')
      }
      reader.readAsText(file)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const updateMapping = (index: number, dbField: keyof PersonFormData | 'skip') => {
    setMappings(prev => {
      const newMappings = [...prev]
      newMappings[index] = { ...newMappings[index], dbField }
      return newMappings
    })
  }

  const transformData = (): PersonFormData[] => {
    return csvData.map(row => {
      const transformed: Partial<PersonFormData> = {}
      mappings.forEach(m => {
        if (m.dbField !== 'skip') {
          const value = row[m.csvColumn]?.trim()
          
          if (!value) {
             (transformed as any)[m.dbField] = null
             return
          }

          if (m.dbField === 'appadmin_fighter_id') {
            (transformed as any)[m.dbField] = value
          } else if (m.dbField === 'height' || m.dbField === 'reach') {
            // Remove non-numeric chars except dot/comma
            const numericValue = value.replace(/[^\d.,-]/g, '').replace(',', '.')
            if (numericValue) {
               (transformed as any)[m.dbField] = Number(numericValue)
            } else {
               (transformed as any)[m.dbField] = null
            }
          } else if (m.dbField === 'dob' || m.dbField === 'passport_expiry') {
            // Date Parsing Logic
            if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(value)) {
              // Handle DD/MM/YYYY or MM/DD/YYYY
              const parts = value.split(/[\/\-]/).map(Number)
              // Assume DD/MM/YYYY format (European)
              const [day, month, year] = parts
              const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              ;(transformed as any)[m.dbField] = formattedDate
            } else if (/^\d+(\.\d+)?$/.test(value)) {
              // Handle Excel Serial Date (e.g. "47278" or "47278.5")
              const serial = parseFloat(value)
              
              // Excel's epoch is December 30, 1899 (not January 1, 1900)
              // This accounts for Excel's leap year bug where 1900 is incorrectly treated as a leap year
              const excelEpoch = new Date(Date.UTC(1899, 11, 30))
              const milliseconds = serial * 86400 * 1000
              const date = new Date(excelEpoch.getTime() + milliseconds)
              
              if (!isNaN(date.getTime()) && serial > 0 && serial < 100000) {
                // Format as YYYY-MM-DD
                const year = date.getUTCFullYear()
                const month = String(date.getUTCMonth() + 1).padStart(2, '0')
                const day = String(date.getUTCDate()).padStart(2, '0')
                const formatted = `${year}-${month}-${day}`
                ;(transformed as any)[m.dbField] = formatted
              } else {
                // Invalid serial number, set to null
                ;(transformed as any)[m.dbField] = null
              }
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
              // Already in YYYY-MM-DD format
              ;(transformed as any)[m.dbField] = value
            } else {
              // Try to parse as ISO date or set to null
              const attemptDate = new Date(value)
              if (!isNaN(attemptDate.getTime())) {
                const formatted = attemptDate.toISOString().split('T')[0]
                ;(transformed as any)[m.dbField] = formatted
              } else {
                ;(transformed as any)[m.dbField] = null
              }
            }
          } else {
            (transformed as any)[m.dbField] = String(value)
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
      
      // Build mapping from dbField to csvColumn title
      const mapping: Record<string, string> = {}
      mappings.forEach(m => {
        if (m.dbField !== 'skip') mapping[m.dbField.toString()] = m.csvColumn
      })

      const res = await onImport(data, (current, total, message) => {
        setProgress({ current, total, message: message || '' })
      }, checkDuplicates, mapping, upsertMode)
      setResult(res)
      setStep('result')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'upload') {
    return (
      <Card className="border-none shadow-none">
        <CardHeader className="px-0 pt-0"><CardTitle>Importar CSV</CardTitle></CardHeader>
        <CardContent className="space-y-4 px-0 pb-0">
          <Label
            htmlFor="csv-file"
            className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">Clique para selecionar ou arraste o arquivo CSV</p>
            <p className="text-xs text-muted-foreground mt-1">Formato suportado: .csv (codificação UTF-8)</p>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </Label>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'mapping') {
    return (
      <Card className="border-none shadow-none flex flex-col h-full bg-transparent">
        <CardHeader className="px-6 pt-6 flex flex-row items-center justify-between space-y-0 pb-6 border-b bg-background/50 rounded-t-xl">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl font-bold tracking-tight">Mapear Colunas do CSV</CardTitle>
            <CardDescription className="text-sm">
              Relacione as colunas encontradas no seu arquivo com os campos do banco de dados.
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-primary"
          >
            {isFullscreen ? (
              <><Upload className="h-4 w-4 rotate-180" /> Reduzir</>
            ) : (
              <><Upload className="h-4 w-4" /> Maximizar</>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 p-6 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/80 rounded-t-lg border font-bold text-[10px] uppercase tracking-widest text-muted-foreground shadow-sm">
            <span className="flex-1">Coluna no Arquivo & Amostra</span>
            <span className="w-64 text-right pr-6">Campo no Sistema</span>
          </div>

          <div 
            className="border rounded-lg divide-y overflow-y-auto scrollbar-thin bg-background/50 flex-1" 
            style={{ maxHeight: isFullscreen ? 'calc(100vh - 250px)' : 'min(500px, 60vh)' }}
          >
            {mappings.map((m, idx) => {
              const sampleValue = csvData[0]?.[m.csvColumn] || ''
              const usedFields = mappings.map(map => map.dbField).filter(f => f !== 'skip')
              
              return (
                <div key={`${m.csvColumn}-${idx}`} className="flex items-center gap-4 p-3 hover:bg-muted/30 transition-colors group">
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="flex flex-col min-w-0 max-w-[200px]">
                      <span className="text-sm font-bold truncate text-foreground leading-tight" title={m.csvColumn}>
                        {m.csvColumn}
                      </span>
                      {m.csvColumn.startsWith('Coluna_') && (
                        <span className="text-[9px] text-amber-600 font-medium">Sem cabeçalho</span>
                      )}
                    </div>
                    
                    <span className="text-muted-foreground/30 shrink-0">→</span>
                    
                    <div className="flex-1 min-w-0">
                      {sampleValue ? (
                        <div className="text-[11px] text-muted-foreground truncate italic bg-muted/30 px-2 py-1 rounded border border-dashed border-muted-foreground/20 group-hover:border-muted-foreground/40 transition-colors">
                          <span className="opacity-50 mr-1">Ex:</span>
                          <span className="text-foreground/70">{sampleValue.length > 40 ? sampleValue.substring(0, 40) + '...' : sampleValue}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40 italic pl-2">(vazio)</span>
                      )}
                    </div>
                  </div>

                  <div className="w-56 shrink-0">
                    <Select value={m.dbField} onValueChange={(v) => updateMapping(idx, v as any)}>
                      <SelectTrigger className="w-full bg-background border-muted-foreground/20 hover:border-primary/50 transition-colors h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DB_FIELDS.map(f => {
                          const isAlreadyMapped = f.value !== 'skip' && 
                            (usedFields as string[]).includes(f.value) && 
                            f.value !== m.dbField
                          
                          if (isAlreadyMapped) return null
                          
                          return (
                            <SelectItem key={f.value} value={f.value} className="text-xs">
                              {f.label}
                            </SelectItem>
                          )
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
            <Button className="min-w-[120px]" onClick={() => setStep('preview')}>
              Revisar Dados
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'preview') {
    const preview = transformData().slice(0, 10)
    const activeMappings = mappings.filter(m => m.dbField !== 'skip')
    const progressValue = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

    return (
      <Card className="border-none shadow-none flex flex-col h-full bg-transparent">
        <CardHeader className="px-6 pt-6 flex flex-row items-center justify-between space-y-0 pb-6 border-b bg-background/50 rounded-t-xl">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center justify-between text-xl font-bold tracking-tight">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processando...</span>
                </div>
              ) : 'Pré-visualização dos Dados'}
              <Badge variant="outline" className="font-mono bg-primary/10 border-primary/20 text-primary">
                {csvData.length} registros
              </Badge>
            </CardTitle>
            <CardDescription className="text-sm">
              {loading 
                ? 'Aguarde enquanto autenticamos e salvamos os dados no servidor.'
                : 'Verifique se os dados abaixo estão corretos antes de iniciar a importação.'}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6 flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-8 bg-muted/20 rounded-xl border border-dashed text-center">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold">{Math.round(progressValue)}%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight">
                  {progress.message || 'Importando Dados...'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Isso pode levar alguns minutos. Não feche esta janela.
                </p>
              </div>

              <div className="w-full max-w-sm space-y-3">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span>{progress.current} de {progress.total}</span>
                  <span className="text-primary">{Math.round(progressValue)}%</span>
                </div>
                <Progress value={progressValue} className="h-3 shadow-sm" />
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
                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                    <p className="text-xs">
                      {csvData.length} registros serão processados.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 pl-8">
                    <Switch id="dup-check" checked={checkDuplicates} onCheckedChange={(v) => { setCheckDuplicates(v); if (!v) setUpsertMode(false); }} disabled={loading || upsertMode} />
                    <Label htmlFor="dup-check" className="text-xs font-medium cursor-pointer">
                      Verificar nomes duplicados no banco
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 pl-8">
                    <Switch id="upsert-mode" checked={upsertMode} onCheckedChange={(v) => { setUpsertMode(v); if (v) setCheckDuplicates(true); }} disabled={loading} />
                    <Label htmlFor="upsert-mode" className="text-xs font-medium cursor-pointer">
                      Atualizar dados de pessoas existentes
                    </Label>
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  <Button variant="outline" size="sm" onClick={() => setStep('mapping')} disabled={loading}>
                    Editar Mapeamento
                  </Button>
                  <Button size="sm" onClick={handleImport} disabled={loading} className="px-6 shadow-md">
                    Iniciar Importação
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  const downloadReport = (format: 'csv' | 'md') => {
    if (!result) return;

    const now = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `import-report-${now}.${format}`;
    let content = '';

    if (format === 'csv') {
      content = 'People Full Name,Coluna Planilha,Erro,Mensagem\n';
      result.errors.forEach(e => {
        content += `"${e.fullName.replace(/"/g, '""')}","${(e.csvColumnTitle || e.column).replace(/"/g, '""')}","${e.errorType.replace(/"/g, '""')}","${e.message.replace(/"/g, '""')}"\n`;
      });
      
      // Duplicates also as errors for full coverage
      result.duplicates.forEach(d => {
        content += `"${d.replace(/"/g, '""')}",Surname/Name,Duplicado,"Este registro já existe no banco de dados"\n`;
      });
    } else {
      content = `# Relatório de Importação - ${new Date().toLocaleString()}\n\n`;
      content += `## Resumo\n`;
      content += `- **Sucesso:** ${result.success}\n`;
      content += `- **Duplicados:** ${result.duplicates.length}\n`;
      content += `- **Erros:** ${result.errors.length}\n\n`;
      
      if (result.errors.length > 0) {
        content += `## Erros Encontrados\n`;
        content += `| Atleta | Coluna Planilha | Tipo Erro | Mensagem |\n`;
        content += `| :--- | :--- | :--- | :--- |\n`;
        result.errors.forEach(e => {
          content += `| ${e.fullName} | ${e.csvColumnTitle || e.column} | ${e.errorType} | ${e.message} |\n`;
        });
        content += `\n`;
      }
      
      if (result.duplicates.length > 0) {
        content += `## Registros Duplicados\n`;
        result.duplicates.forEach(d => content += `- ${d}\n`);
      }
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0"><CardTitle>Resultado da Importação</CardTitle></CardHeader>
      <CardContent className="space-y-6 px-0 pb-0">
        <div className={`grid grid-cols-1 gap-4 ${(result?.updated ?? 0) > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center space-y-1">
            <CheckCircle2 className="mx-auto h-6 w-6 text-green-600" />
            <p className="text-2xl font-bold text-green-700">{result?.success}</p>
            <p className="text-xs font-medium text-green-600/80 uppercase tracking-wider">Novos</p>
          </div>

          {(result?.updated ?? 0) > 0 && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center space-y-1">
              <CheckCircle2 className="mx-auto h-6 w-6 text-blue-600" />
              <p className="text-2xl font-bold text-blue-700">{result?.updated}</p>
              <p className="text-xs font-medium text-blue-600/80 uppercase tracking-wider">Atualizados</p>
            </div>
          )}
          
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1">
            <Copy className="mx-auto h-6 w-6 text-amber-600" />
            <p className="text-2xl font-bold text-amber-700">{result?.duplicates.length}</p>
            <p className="text-xs font-medium text-amber-600/80 uppercase tracking-wider">{upsertMode ? 'Sem Alteração' : 'Duplicados'}</p>
          </div>

          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-1">
            <AlertCircle className="mx-auto h-6 w-6 text-red-600" />
            <p className="text-2xl font-bold text-red-700">{result?.errors.length}</p>
            <p className="text-xs font-medium text-red-600/80 uppercase tracking-wider">Erros</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 gap-2" 
            onClick={() => downloadReport('csv')}
            disabled={!result}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Baixar CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 gap-2" 
            onClick={() => downloadReport('md')}
            disabled={!result}
          >
            <FileText className="h-4 w-4" />
            Baixar Markdown
          </Button>
        </div>

        {(result?.duplicates.length || 0) > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-bold flex items-center gap-2">
              <Copy className="h-4 w-4 text-amber-600" />
              Registros Ignorados (Já existem no banco)
            </p>
            <div className="bg-muted/30 rounded-lg p-3 max-h-32 overflow-y-auto border border-dashed text-xs">
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {result?.duplicates.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          </div>
        )}

        {(result?.errors.length || 0) > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-bold flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              Detalhes dos Erros
            </p>
            <div className="bg-red-500/5 rounded-lg p-3 max-h-48 overflow-y-auto border border-red-500/10 text-[10px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-transparent border-red-500/10">
                    <TableHead className="h-6 text-red-600 font-bold uppercase py-1">Atleta</TableHead>
                    <TableHead className="h-6 text-red-600 font-bold uppercase py-1">Coluna CSV</TableHead>
                    <TableHead className="h-6 text-red-600 font-bold uppercase py-1">Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result?.errors.map((e, i) => (
                    <TableRow key={i} className="border-red-500/5">
                      <TableCell className="py-1 line-clamp-1">{e.fullName}</TableCell>
                      <TableCell className="py-1 font-mono text-[9px]">{e.csvColumnTitle || e.column}</TableCell>
                      <TableCell className="py-1 text-red-600/70 font-medium">
                        {e.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <Button className="w-full" onClick={onCancel}>Concluir e Voltar</Button>
        </div>
      </CardContent>
    </Card>
  )
}
