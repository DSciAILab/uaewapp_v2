'use client'

import { Header } from './header'
import { openCommandPalette } from './dashboard-shell'

interface DashboardHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function DashboardHeader({ title, description, actions }: DashboardHeaderProps) {
  return (
    <Header
      title={title}
      description={description}
      actions={actions}
      onCommandPalette={openCommandPalette}
    />
  )
}
