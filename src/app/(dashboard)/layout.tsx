import { DashboardShell } from '@/components/layout/dashboard-shell'
import { FirstLoginDialog } from '@/components/auth/first-login-dialog'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <FirstLoginDialog />
      <DashboardShell>{children}</DashboardShell>
    </>
  )
}
