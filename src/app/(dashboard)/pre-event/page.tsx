import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function PreEventIndexPage() {
  const supabase = await createClient();
  
  const { data: activeEvent } = await supabase
    .from('mma_events')
    .select('id')
    .eq('status', 'active')
    .single();
    
  if (activeEvent) {
    redirect(`/events/${activeEvent.id}/pre-event`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-muted">
              <ShieldCheck className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <CardTitle>Pre-Event Requirements</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Please select an event to manage pre-event requirements.
          </p>
          <Link href="/events">
            <Button className="w-full">Go to Events</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
