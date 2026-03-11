import { useUser } from '@/hooks/use-user'

// Alias hook to maintain compatibility with Sprint 05-08 components
export function useAuth() {
  return useUser()
}
