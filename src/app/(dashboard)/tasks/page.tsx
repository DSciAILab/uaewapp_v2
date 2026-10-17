import { getActiveEventId } from '@/lib/services/active-event';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function TasksIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string | string[] }>;
}) {
  const activeEventId = await getActiveEventId();
  const { task } = await searchParams;

  if (activeEventId) {
    // Keep the sidebar deep link (`?task=<slug>`, UAE-88): the Pre Event Tasks
    // links point here from any page without an event in its path, and
    // dropping the slug landed every one of them on the plain list (UAE-93).
    const slug = Array.isArray(task) ? task[0] : task;
    redirect(
      slug
        ? `/events/${activeEventId}/tasks?task=${encodeURIComponent(slug)}`
        : `/events/${activeEventId}/tasks`
    );
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
