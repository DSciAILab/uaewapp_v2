'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CalendarX2, Loader2, RefreshCw, UserSearch } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { AthleteStatsForm } from '@/components/operations/athlete-stats-form';
import { TasksList } from '@/components/operations/tasks-list';
import { getEventTasks } from '@/lib/services/task-service';
import type { EventTask } from '@/types/task';

/**
 * Empty/again-state shell shared by the "no event", "no athlete" and error
 * cases so each one reads with the same weight instead of one being a toast
 * and another a full page.
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  status = 'neutral',
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  status?: 'neutral' | 'critical';
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border/60 bg-surface-1/30 px-6 py-16 text-center">
      <Icon
        className={
          status === 'critical'
            ? 'h-6 w-6 text-[var(--status-critical-fg,currentColor)]'
            : 'h-6 w-6 text-muted-foreground'
        }
      />
      <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

function OperationsTasksTab({ eventId }: { eventId: string }) {
  const [tasks, setTasks] = useState<EventTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setTasks(await getEventTasks(eventId));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to fetch event tasks');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
        <span className="label-mono">Loading tasks</span>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        status="critical"
        title="Could not load tasks"
        description={error}
        action={
          <Button variant="outline" size="sm" onClick={() => void loadTasks()}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        }
      />
    );
  }

  return <TasksList tasks={tasks} onRefresh={() => void loadTasks()} />;
}

function OperationsContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');
  const personId = searchParams.get('personId');
  const enrolledId = searchParams.get('enrolledId');

  // No event means there is nothing to scope tasks or stats to. Querying a
  // literal placeholder id here only produced a silent empty result.
  if (!eventId) {
    return (
      <>
        <DashboardHeader title="Operations" description="No event selected" />
        <div className="container mx-auto px-6 py-6">
          <EmptyState
            icon={CalendarX2}
            title="Select an Event"
            description="Open an event and pick an athlete from its enrollment list to manage operations."
          />
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Operations"
        description={`Event ${eventId}`}
      />

      <div className="container mx-auto px-6 py-6">
        <Tabs defaultValue={personId && enrolledId ? 'stats' : 'tasks'} className="space-y-4">
          <TabsList>
            <TabsTrigger value="stats">Athlete Stats</TabsTrigger>
            <TabsTrigger value="tasks">Operational Tasks</TabsTrigger>
          </TabsList>

          {/* Stats are athlete-scoped; tasks are event-scoped, so the athlete
              guard belongs to this tab rather than to the whole page. */}
          <TabsContent value="stats">
            {personId && enrolledId ? (
              <AthleteStatsForm personId={personId} />
            ) : (
              <EmptyState
                icon={UserSearch}
                title="Select an Athlete"
                description="Athlete stats need an athlete. Navigate to Event -> Enrollments -> Operations to open one."
              />
            )}
          </TabsContent>

          <TabsContent value="tasks">
            <OperationsTasksTab eventId={eventId} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

export default function OperationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none text-muted-foreground" />
        </div>
      }
    >
      <OperationsContent />
    </Suspense>
  );
}
