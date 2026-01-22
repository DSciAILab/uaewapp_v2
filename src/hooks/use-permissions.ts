'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './use-user'
import type { UserPermission, PermissionLevel } from '@/types/database'

export function usePermissions() {
  const { user } = useUser()
  const [permissions, setPermissions] = useState<UserPermission[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchPermissions() {
      if (!user) {
        setPermissions([])
        setLoading(false)
        return
      }

      // Admin tem acesso total
      if (user.user_type === 'admin') {
        setLoading(false)
        return
      }

      try {
        const { data } = await supabase
          .from('mma_user_permissions')
          .select(`
            *,
            area:mma_permission_areas(*)
          `)
          .eq('user_id', user.id)

        setPermissions(data || [])
      } catch (error) {
        console.error('Error fetching permissions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [user])

  const hasPermission = (areaCode: string, level: PermissionLevel = 'view'): boolean => {
    if (!user) return false
    if (user.user_type === 'admin') return true

    const permission = permissions.find(p => p.area?.code === areaCode)
    if (!permission) return false

    if (level === 'view') return true
    return permission.permission === 'edit'
  }

  const canView = (areaCode: string): boolean => hasPermission(areaCode, 'view')
  const canEdit = (areaCode: string): boolean => hasPermission(areaCode, 'edit')

  return {
    permissions,
    loading,
    hasPermission,
    canView,
    canEdit,
    isAdmin: user?.user_type === 'admin',
  }
}
