'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Upload, Download, FileUp, ChevronDown } from 'lucide-react'

interface CSVImportDropdownProps {
  onImportClick: () => void
  onTemplateDownload: () => void
  label?: string
  disabled?: boolean
}

export function CSVImportDropdown({
  onImportClick,
  onTemplateDownload,
  label = 'CSV',
  disabled = false,
}: CSVImportDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={disabled}>
          <Upload className="h-4 w-4" />
          {label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onTemplateDownload} className="gap-2 cursor-pointer">
          <Download className="h-4 w-4" />
          Baixar Template
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImportClick} className="gap-2 cursor-pointer">
          <FileUp className="h-4 w-4" />
          Importar CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function downloadCSVTemplate(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
