'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/database'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true;

    async function getUserData(userId: string) {
      if (!mounted) return;
      try {
        const { data, error } = await supabase
          .from('mma_users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (mounted && data) {
          setUser(data);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    // Initialize session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      if (session?.user) {
        getUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
        } else if (session?.user) {
          getUserData(session.user.id);
        } else {
          setLoading(false);
        }
      }
    )

    return () => {
      mounted = false;
      subscription.unsubscribe();
    }
  }, [supabase])

  return { user, loading }
}
