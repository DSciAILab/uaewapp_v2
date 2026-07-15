'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Upload, Download, FileUp, ChevronDown } from 'lucide-react'

export interface ImportDropdownExtraItem {
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
  title?: string
}

interface CSVImportDropdownProps {
  onImportClick: () => void
  onTemplateDownload: () => void
  label?: string
  disabled?: boolean
  extraItems?: ImportDropdownExtraItem[]
}

export function CSVImportDropdown({
  onImportClick,
  onTemplateDownload,
  label = 'Import',
  disabled = false,
  extraItems,
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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onTemplateDownload} className="gap-2 cursor-pointer">
          <Download className="h-4 w-4" />
          Baixar Template
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImportClick} className="gap-2 cursor-pointer">
          <FileUp className="h-4 w-4" />
          Importar CSV
        </DropdownMenuItem>
        {extraItems && extraItems.length > 0 && <DropdownMenuSeparator />}
        {extraItems?.map((item, i) => (
          <DropdownMenuItem
            key={i}
            onClick={item.onClick}
            disabled={item.disabled}
            title={item.title}
            className="gap-2 cursor-pointer"
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
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
