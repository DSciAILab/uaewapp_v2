import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function StagingRedirectPage() {
  const supabase = await createClient();

  // Fetch the most recent active event
  const { data: event } = await supabase
    .from('mma_events')
    .select('id')
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .single();

  if (event) {
    redirect(`/public/staging/${event.id}`);
  }

  // Fallback if no active event found or error
  redirect('/dashboard');
}
