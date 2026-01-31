import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function StagingRedirectPage() {
  const supabase = await createClient();

  // Fetch the most recent active event
  const { data: event } = await supabase
    .from('mma_events')
    .select('id')
    .eq('status', 'active')
    .order('event_date', { ascending: false })
    .limit(1)
    .single();

  if (event) {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Authenticated users go to Operations
      redirect(`/events/${event.id}/staging`);
    } else {
      // Unauthenticated users (TVs) go to Public View
      redirect(`/public/staging/${event.id}`);
    }
  }

  // Fallback if no active event found or error
  redirect('/dashboard');
}
