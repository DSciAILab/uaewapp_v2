import { getActiveEventId } from '@/lib/services/active-event';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function BatchesIndexPage() {
  const activeEventId = await getActiveEventId();

  if (activeEventId) {
    redirect(`/events/${activeEventId}/batches`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-muted">
              <Layers className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <CardTitle>Batch Management</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Please select an event to manage batches.
          </p>
          <Link href="/events">
            <Button className="w-full">Go to Events</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
