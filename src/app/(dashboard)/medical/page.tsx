import { getActiveEventId } from '@/lib/services/active-event';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// The sidebar links to the bare "/medical" whenever no event is in the current
// path (eventId is parsed off the URL). Medical only exists event-scoped, so
// without this index the bare link 404s. Mirror the pre-event index: redirect
// to the active event, or prompt for one.
export default async function MedicalIndexPage() {
  const activeEventId = await getActiveEventId();

  if (activeEventId) {
    redirect(`/events/${activeEventId}/medical`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-muted">
              <Stethoscope className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <CardTitle>Medical</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Please select an event to manage medical status.
          </p>
          <Link href="/events">
            <Button className="w-full">Go to Events</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
