import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function TasksIndexPage() {
  const supabase = await createClient();
  
  const { data: activeEvent } = await supabase
    .from('mma_events')
    .select('id')
    .eq('status', 'active')
    .single();
    
  if (activeEvent) {
    redirect(`/events/${activeEvent.id}/tasks`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-muted">
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <CardTitle>Operational Tasks</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Please select an event to manage tasks.
          </p>
          <Link href="/events">
            <Button className="w-full">Go to Events</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
