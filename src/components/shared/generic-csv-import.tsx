'use client'

import { useState, useCallback, type ReactNode } from 'react'
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
import {
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserX,
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { parseCSV, PLACEHOLDER_HEADER_PREFIX } from '@/lib/csv-parse'

export interface FieldDef {
  value: string
  label: string
}

/**
 * A single non-fatal outcome for one CSV row. `column` / `errorType` are
 * optional detail used by the downloadable report.
 */
export interface ImportIssue {
  row: number
  name: string
  message: string
  column?: string
  errorType?: string
}

export interface ImportResult {
  created: number
  updated: number
  skipped: ImportIssue[]
  errors: ImportIssue[]
}

export interface ResultLabels {
  created?: string
  updated?: string
  skipped?: string
  errors?: string
}

type ProgressFn = (current: number, total: number, message?: string) => void

export interface GenericCSVImportProps<TRow = Record<string, string>> {
  title: string
  subtitle?: string
  fields: FieldDef[]
  requiredField: string
  onImport: (
    rows: TRow[],
    upsertMode: boolean,
    onProgress: ProgressFn,
    options: { checkDuplicates: boolean; mapping: Record<string, string> }
  ) => Promise<ImportResult>
  onComplete: () => void
  showUpsert?: boolean
  /** Initial value of the "update existing" switch. Default: true. */
  defaultUpsert?: boolean
  /** Small hint under the drop zone. */
  uploadHint?: string
  /** Renders a "check duplicates" switch and feeds it to onImport options. */
  showDuplicateCheck?: boolean
  duplicateCheckLabel?: string
  /** Turning upsert on forces duplicate-checking on (people import semantics). */
  upsertRequiresDuplicateCheck?: boolean
  /** Adds a Maximize/Minimize toggle to the mapping step. */
  allowFullscreen?: boolean
  onFullscreenChange?: (fullscreen: boolean) => void
  /** Coerces a mapped cell (dates, numbers…). Defaults to the trimmed string. */
  transformValue?: (field: string, value: string) => unknown
  /** Overrides the stat-card captions on the result step. */
  resultLabels?: ResultLabels
  /** Offers CSV / Markdown report downloads on the result step. */
  enableReportDownload?: boolean
  /** Renders a "download template" action on the upload step. */
  onTemplateDownload?: () => void
  /** Hides the "updated" stat card when the importer never updates. */
  showUpdatedStat?: boolean
}

export function GenericCSVImport<TRow = Record<string, string>>({
  title,
  subtitle,
  fields,
  requiredField,
  onImport,
  onComplete,
  showUpsert = true,
  defaultUpsert = true,
  uploadHint = 'Matching is done by passport name',
  showDuplicateCheck = false,
  duplicateCheckLabel = 'Check for duplicate names in the database',
  upsertRequiresDuplicateCheck = false,
  allowFullscreen = false,
  onFullscreenChange,
  transformValue,
  resultLabels,
  enableReportDownload = false,
  onTemplateDownload,
  showUpdatedStat = true,
}: GenericCSVImportProps<TRow>) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'result'>('upload')
  const [csvData, setCsvData] = useState<Record<string, string>[]>([])
  const [mappings, setMappings] = useState<{ csvColumn: string; dbField: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' })
  const [result, setResult] = useState<ImportResult | null>(null)
  const [upsertMode, setUpsertMode] = useState(defaultUpsert)
  const [checkDuplicates, setCheckDuplicates] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const allFields = [{ value: 'skip', label: '-- Skip --' }, ...fields]

  const labels = {
    created: resultLabels?.created ?? 'Created',
    updated: resultLabels?.updated ?? 'Updated',
    skipped: resultLabels?.skipped ?? 'Not Found',
    errors: resultLabels?.errors ?? 'Errors',
  }

  const ingest = useCallback((text: string) => {
    const { headers, rows } = parseCSV(text)
    setCsvData(rows)
    setMappings(headers.map(col => ({ csvColumn: col, dbField: 'skip' })))
    setStep('mapping')
  }, [])

  const readFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = ev => ingest(ev.target?.result as string)
    reader.readAsText(file)
  }, [ingest])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) readFile(file)
  }, [readFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) readFile(file)
  }, [readFile])

  const toggleFullscreen = () => {
    setIsFullscreen(prev => {
      const next = !prev
      onFullscreenChange?.(next)
      return next
    })
  }

  const transformData = (): TRow[] =>
    csvData.map(row => {
      const transformed: Record<string, unknown> = {}
      mappings.forEach(m => {
        if (m.dbField === 'skip') return
        const raw = row[m.csvColumn]?.trim() || ''
        transformed[m.dbField] = transformValue ? transformValue(m.dbField, raw) : raw
      })
      return transformed as TRow
    })

  const handleImport = async () => {
    setLoading(true)
    try {
      const mapping: Record<string, string> = {}
      mappings.forEach(m => {
        if (m.dbField !== 'skip') mapping[m.dbField] = m.csvColumn
      })

      const res = await onImport(
        transformData(),
        upsertMode,
        (current, total, message) => setProgress({ current, total, message: message || '' }),
        { checkDuplicates, mapping }
      )
      setResult(res)
      setStep('result')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setResult({ created: 0, updated: 0, skipped: [], errors: [{ row: 0, name: 'System', message }] })
      setStep('result')
    } finally {
      setLoading(false)
    }
  }

  const hasRequired = mappings.some(m => m.dbField === requiredField)
  const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

  // === UPLOAD ===
  if (step === 'upload') {
    return (
      <Card className="border-none shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4 px-0 pb-0">
          <Label
            htmlFor="csv-generic"
            className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">Click to select or drag and drop the CSV file</p>
            <p className="text-xs text-muted-foreground mt-1">{uploadHint}</p>
            <Input id="csv-generic" type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
          </Label>
          <div className={onTemplateDownload ? 'flex justify-between' : 'flex justify-end'}>
            {onTemplateDownload && (
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={onTemplateDownload}>
                <Download className="h-4 w-4" /> Download Template
              </Button>
            )}
            <Button variant="outline" onClick={onComplete}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // === MAPPING ===
  if (step === 'mapping') {
    return (
      <Card className="border-none shadow-none flex flex-col h-full bg-transparent">
        <CardHeader className="px-6 pt-6 pb-4 border-b bg-background/50 rounded-t-xl flex flex-row items-start justify-between space-y-0 gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-xl">Map Columns</CardTitle>
            <CardDescription>
              The <strong>{fields.find(f => f.value === requiredField)?.label}</strong> field is required.
            </CardDescription>
          </div>
          {allowFullscreen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-primary shrink-0"
            >
              {isFullscreen ? (
                <><Minimize2 className="h-4 w-4" /> Minimize</>
              ) : (
                <><Maximize2 className="h-4 w-4" /> Maximize</>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6 p-6 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 py-3 bg-muted/80 rounded-t-lg border font-bold text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="flex-1">File Column &amp; Sample</span>
            <span className="w-64 text-right pr-6">System Field</span>
          </div>
          <div
            className="border rounded-lg divide-y overflow-y-auto bg-background/50 flex-1"
            style={{ maxHeight: isFullscreen ? 'calc(100vh - 250px)' : 'min(500px, 60vh)' }}
          >
            {mappings.map((m, idx) => {
              const sample = csvData[0]?.[m.csvColumn] || ''
              const used = mappings.map(mp => mp.dbField).filter(f => f !== 'skip')
              return (
                <div key={`${m.csvColumn}-${idx}`} className="flex items-center gap-4 p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="flex flex-col min-w-0 max-w-[200px]">
                      <span className="text-sm font-bold truncate" title={m.csvColumn}>{m.csvColumn}</span>
                      {m.csvColumn.startsWith(PLACEHOLDER_HEADER_PREFIX) && (
                        <span className="text-[9px] text-amber-600 font-medium">No header</span>
                      )}
                    </div>
                    <span className="text-muted-foreground/30 shrink-0">→</span>
                    {sample ? (
                      <span className="text-[11px] text-muted-foreground truncate italic bg-muted/30 px-2 py-1 rounded border border-dashed max-w-[200px]">
                        e.g. {sample.length > 30 ? `${sample.substring(0, 30)}...` : sample}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/40 italic">(empty)</span>
                    )}
                  </div>
                  <div className="w-56 shrink-0">
                    <Select
                      value={m.dbField}
                      onValueChange={(v) => setMappings(prev => {
                        const next = [...prev]
                        next[idx] = { ...next[idx], dbField: v }
                        return next
                      })}
                    >
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
            <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
            <Button disabled={!hasRequired} onClick={() => setStep('preview')}>Review</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // === PREVIEW ===
  if (step === 'preview') {
    const preview = transformData().slice(0, 8) as Record<string, unknown>[]
    const active = mappings.filter(m => m.dbField !== 'skip')
    return (
      <Card className="border-none shadow-none flex flex-col h-full bg-transparent">
        <CardHeader className="px-6 pt-6 pb-4 border-b bg-background/50 rounded-t-xl">
          <CardTitle className="text-xl flex items-center gap-3">
            {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</> : 'Preview'}
            <Badge variant="outline" className="font-mono bg-primary/10">{csvData.length} rows</Badge>
          </CardTitle>
          {subtitle && <CardDescription className="mt-1">{loading ? 'Please wait...' : subtitle}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6 p-6 flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-6 bg-muted/20 rounded-xl border border-dashed text-center">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold">{Math.round(pct)}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">{progress.message || 'Importing...'}</h3>
                <p className="text-sm text-muted-foreground">Do not close this window.</p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                  <span>{progress.current} of {progress.total}</span>
                  <span className="text-primary">{Math.round(pct)}%</span>
                </div>
                <Progress value={pct} className="h-3" />
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      {active.map((m, i) => (
                        <TableHead key={i} className="font-bold text-[10px] uppercase">
                          {fields.find(f => f.value === m.dbField)?.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, i) => (
                      <TableRow key={i}>
                        {active.map((m, j) => (
                          <TableCell key={j} className="py-2 text-xs truncate max-w-[150px]">
                            {(row[m.dbField] as ReactNode) || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center bg-muted/30 border border-dashed p-4 rounded-xl mt-auto">
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">{csvData.length} records will be processed</p>
                  {showDuplicateCheck && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="dup-check"
                        checked={checkDuplicates}
                        onCheckedChange={(v) => {
                          setCheckDuplicates(v)
                          if (!v && upsertRequiresDuplicateCheck) setUpsertMode(false)
                        }}
                        disabled={loading || (upsertRequiresDuplicateCheck && upsertMode)}
                      />
                      <Label htmlFor="dup-check" className="text-xs font-medium cursor-pointer">{duplicateCheckLabel}</Label>
                    </div>
                  )}
                  {showUpsert && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="upsert-gen"
                        checked={upsertMode}
                        onCheckedChange={(v) => {
                          setUpsertMode(v)
                          if (v && upsertRequiresDuplicateCheck) setCheckDuplicates(true)
                        }}
                        disabled={loading}
                      />
                      <Label htmlFor="upsert-gen" className="text-xs font-medium cursor-pointer">Update existing</Label>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" onClick={() => setStep('mapping')} disabled={loading}>Edit</Button>
                  <Button size="sm" onClick={handleImport} disabled={loading} className="px-6 shadow-md">Import</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  // === RESULT ===
  const downloadReport = (format: 'csv' | 'md') => {
    if (!result) return
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const rows = [
      ...result.errors.map(e => ({ ...e, kind: labels.errors })),
      ...result.skipped.map(s => ({ ...s, kind: labels.skipped })),
    ]

    let content = ''
    if (format === 'csv') {
      const cell = (v: string) => `"${v.replace(/"/g, '""')}"`
      content = 'Row,Name,Column,Type,Message\n'
      rows.forEach(r => {
        content += [
          r.row,
          cell(r.name),
          cell(r.column || '-'),
          cell(r.errorType || r.kind),
          cell(r.message),
        ].join(',') + '\n'
      })
    } else {
      content = `# Import Report - ${new Date().toLocaleString()}\n\n## Summary\n`
      content += `- **${labels.created}:** ${result.created}\n`
      content += `- **${labels.updated}:** ${result.updated}\n`
      content += `- **${labels.skipped}:** ${result.skipped.length}\n`
      content += `- **${labels.errors}:** ${result.errors.length}\n\n`
      if (rows.length > 0) {
        content += `## Issues\n| Row | Name | Column | Type | Message |\n| :--- | :--- | :--- | :--- | :--- |\n`
        rows.forEach(r => {
          content += `| ${r.row} | ${r.name} | ${r.column || '-'} | ${r.errorType || r.kind} | ${r.message} |\n`
        })
      }
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `import-report-${stamp}.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const hasReportRows = (result?.errors.length || 0) + (result?.skipped.length || 0) > 0

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0"><CardTitle>Import Result</CardTitle></CardHeader>
      <CardContent className="space-y-6 px-0 pb-0">
        <div className={`grid grid-cols-2 gap-4 ${showUpdatedStat ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center space-y-1">
            <CheckCircle2 className="mx-auto h-6 w-6 text-green-600" />
            <p className="text-2xl font-bold text-green-700">{result?.created}</p>
            <p className="text-xs font-medium text-green-600/80 uppercase tracking-wider">{labels.created}</p>
          </div>
          {showUpdatedStat && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center space-y-1">
              <RefreshCw className="mx-auto h-6 w-6 text-blue-600" />
              <p className="text-2xl font-bold text-blue-700">{result?.updated}</p>
              <p className="text-xs font-medium text-blue-600/80 uppercase tracking-wider">{labels.updated}</p>
            </div>
          )}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1">
            <UserX className="mx-auto h-6 w-6 text-amber-600" />
            <p className="text-2xl font-bold text-amber-700">{result?.skipped.length}</p>
            <p className="text-xs font-medium text-amber-600/80 uppercase tracking-wider">{labels.skipped}</p>
          </div>
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-1">
            <AlertCircle className="mx-auto h-6 w-6 text-red-600" />
            <p className="text-2xl font-bold text-red-700">{result?.errors.length}</p>
            <p className="text-xs font-medium text-red-600/80 uppercase tracking-wider">{labels.errors}</p>
          </div>
        </div>

        {enableReportDownload && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => downloadReport('csv')} disabled={!hasReportRows}>
              <FileSpreadsheet className="h-4 w-4" /> Download CSV
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => downloadReport('md')} disabled={!hasReportRows}>
              <FileText className="h-4 w-4" /> Download Markdown
            </Button>
          </div>
        )}

        {(result?.skipped.length || 0) > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-bold flex items-center gap-2">
              <UserX className="h-4 w-4 text-amber-600" /> {labels.skipped}
            </p>
            <div className="bg-amber-500/5 rounded-lg p-3 max-h-40 overflow-y-auto border border-amber-500/10 text-xs">
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {result?.skipped.map((s, i) => (
                  <li key={i}>Row {s.row}: <strong>{s.name}</strong> — {s.message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {(result?.errors.length || 0) > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-bold flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" /> {labels.errors}
            </p>
            <div className="bg-red-500/5 rounded-lg p-3 max-h-40 overflow-y-auto border border-red-500/10 text-xs">
              <ul className="list-disc list-inside space-y-1 text-red-600/80">
                {result?.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}: <strong>{e.name}</strong>
                    {e.column ? <span className="font-mono text-[10px] opacity-70"> [{e.column}]</span> : null}
                    {' '}— {e.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="pt-4 border-t"><Button className="w-full" onClick={onComplete}>Finish</Button></div>
      </CardContent>
    </Card>
  )
}
