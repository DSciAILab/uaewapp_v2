'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

import { MetricsGrid } from '@/components/dashboard/metrics-grid';
import { StatusCard } from '@/components/dashboard/status-card';
import { UpcomingDeadlines } from '@/components/dashboard/upcoming-deadlines';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { EnrollmentsTable } from '@/components/tables/enrollments-table';
import { EnrollmentForm } from '@/components/forms/enrollment-form';
import { EventForm } from '@/components/forms/event-form';

import { Settings, Plus, LayoutDashboard, Users, Activity, Swords } from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { useDashboard } from '@/hooks/use-dashboard';
import { useRealtimeContext, RealtimeProvider } from '@/lib/realtime/realtime-provider';

import { getEventById, updateEvent } from '@/lib/services/events';
import { 
  getEnrollmentsByEvent, 
  createEnrollment, 
  updateEnrollment, 
  cancelEnrollment,
  type EnrollmentWithDetails
} from '@/lib/services/enrollments';
import { cancelAssignmentsForEnrollment, countOpenAssignments } from '@/lib/services/task-assignments';
import { Checkbox } from '@/components/ui/checkbox';

import { formatDate } from '@/lib/utils';
import { EventSchema, EnrollmentSchema } from '@/lib/validations/event';

function EventDashboardContent({ eventId }: { eventId: string }) {
  const router = useRouter();
  
  // High-performance cached data fetching via SWR hook
  const { dashboardData, loading: dashLoading, refresh: refreshDash } = useDashboard(eventId);
  
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
  const [event, setEvent] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Modals state
  const [isEventDrawerOpen, setIsEventDrawerOpen] = useState(false);
  const [isEnrollmentDrawerOpen, setIsEnrollmentDrawerOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<EnrollmentWithDetails | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [enrollmentToCancel, setEnrollmentToCancel] = useState<EnrollmentWithDetails | null>(null);
  // How many of this athlete's tasks are still open, and whether to close them
  // along with the enrolment (UAE-26).
  const [openTaskCount, setOpenTaskCount] = useState<number | null>(null);
  const [alsoCancelTasks, setAlsoCancelTasks] = useState(true);

  const { canEdit } = usePermissions();
  const { isConnected } = useRealtimeContext();
  const canEditEvents = canEdit('events');

  const fetchRoster = async () => {
    try {
      const [eventData, enrollData] = await Promise.all([
        getEventById(eventId),
        getEnrollmentsByEvent(eventId),
      ]);
      setEvent(eventData);
      setEnrollments(enrollData);
    } catch (error: any) {
      toast.error('Failed to load roster data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [eventId]);

  const handleUpdateEvent = async (data: EventSchema) => {
    setSaving(true);
    try {
      await updateEvent(eventId, data);
      toast.success('Event updated');
      setIsEventDrawerOpen(false);
      refreshDash();
      fetchRoster();
    } catch (error: any) {
      toast.error('Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const handleEditEnrollment = (enrollment: EnrollmentWithDetails) => {
    setEditingEnrollment(enrollment);
    setIsEnrollmentDrawerOpen(true);
  };

  const handleSubmitEnrollment = async (data: EnrollmentSchema) => {
    setSaving(true);
    try {
      if (editingEnrollment) {
        await updateEnrollment(editingEnrollment.id, data);
        toast.success('Enrollment updated');
      } else {
        await createEnrollment(data);
        toast.success('Person added to event');
      }
      setIsEnrollmentDrawerOpen(false);
      refreshDash();
      fetchRoster();
    } catch (error: any) {
      toast.error('Failed to save enrollment');
    } finally {
      setSaving(false);
    }
  };

  // Ask how much work is attached before the dialog offers to drop it.
  useEffect(() => {
    if (!enrollmentToCancel) {
      setOpenTaskCount(null);
      setAlsoCancelTasks(true);
      return;
    }
    let stale = false;
    countOpenAssignments(enrollmentToCancel.id)
      .then((n) => !stale && setOpenTaskCount(n))
      .catch(() => !stale && setOpenTaskCount(null));
    return () => {
      stale = true;
    };
  }, [enrollmentToCancel]);

  const handleCancelConfirm = async () => {
    if (!enrollmentToCancel) return;
    setSaving(true);
    try {
      await cancelEnrollment(enrollmentToCancel.id);
      let cancelledTasks = 0;
      if (alsoCancelTasks && openTaskCount) {
        // The enrolment is already cancelled at this point; if this fails the
        // athlete is still out, so say what is left rather than claim success.
        try {
          cancelledTasks = await cancelAssignmentsForEnrollment(enrollmentToCancel.id);
        } catch {
          toast.warning('Athlete cancelled, but their tasks were not — cancel them in Tasks.');
        }
      }
      toast.success(
        cancelledTasks
          ? `Enrollment cancelled, and ${cancelledTasks} task${cancelledTasks > 1 ? 's' : ''} with it`
          : 'Enrollment cancelled'
      );
      setCancelDialogOpen(false);
      setEnrollmentToCancel(null);
      refreshDash();
      fetchRoster();
    } catch (error: any) {
      toast.error('Failed to cancel enrollment');
    } finally {
      setSaving(false);
    }
  };

  if (loading || dashLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-sm font-medium animate-pulse">Synchronizing Tactical Data...</p>
        </div>
      </div>
    );
  }

  if (!event || !dashboardData) return null;

  const fighters = enrollments.filter(e => e.role?.code === 'F');
  const staff = enrollments.filter(e => e.role?.code === 'ST');
  const corners = enrollments.filter(e => e.role?.code === 'C');
  const guests = enrollments.filter(e => e.role?.code === 'G');

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <DashboardHeader
        title={event.name}
        description={`${formatDate(event.event_date)}${event.city ? ` • ${event.city}` : ''}`}
      >
        <div className="flex items-center gap-2">
          {isConnected && (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 gap-1.5 py-1 px-3">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Satellite Active
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsEventDrawerOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Config
          </Button>
          <Button size="sm" onClick={() => router.push(`/events/${eventId}/fight-card`)} variant="outline">
            <Swords className="h-4 w-4 mr-2" />
            Fight Card
          </Button>
          <Button size="sm" onClick={() => router.push(`/events/${eventId}/war-room`)} className="bg-slate-900 dark:bg-slate-50">
            <Activity className="h-4 w-4 mr-2" />
            War Room
          </Button>
        </div>
      </DashboardHeader>

      <main className="flex-1 p-6 space-y-8 max-w-[1600px] mx-auto w-full">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-primary" />
              Event Snapshot
            </h3>
          </div>
          <MetricsGrid 
            metrics={dashboardData.metrics} 
            onMetricClick={(type) => {
              if (type === 'people') return;
              router.push(`/events/${eventId}/${type}`);
            }} 
          />
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h3 className="text-lg font-bold mb-4">Module Health</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {dashboardData.modules.map((module) => (
                  <StatusCard key={module.module} status={module} />
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Roster Management
                </h3>
                <Button size="sm" onClick={() => setIsEnrollmentDrawerOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>
              <Tabs defaultValue="all" className="bg-card border rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 pt-4 border-b">
                  <TabsList className="bg-muted/50 p-1 mb-2">
                    <TabsTrigger value="all">All ({enrollments.length})</TabsTrigger>
                    <TabsTrigger value="fighters">Fighters ({fighters.length})</TabsTrigger>
                    <TabsTrigger value="corners">Corners ({corners.length})</TabsTrigger>
                    <TabsTrigger value="staff">Staff ({staff.length})</TabsTrigger>
                    <TabsTrigger value="guests">Guests ({guests.length})</TabsTrigger>
                  </TabsList>
                </div>
                <div className="p-0">
                  <TabsContent value="all" className="m-0 focus-visible:ring-0">
                    <EnrollmentsTable enrollments={enrollments} onEdit={handleEditEnrollment} onCancel={setEnrollmentToCancel} canEdit={canEditEvents} />
                  </TabsContent>
                  <TabsContent value="fighters" className="m-0 focus-visible:ring-0">
                    <EnrollmentsTable enrollments={fighters} onEdit={handleEditEnrollment} onCancel={setEnrollmentToCancel} canEdit={canEditEvents} />
                  </TabsContent>
                  <TabsContent value="corners" className="m-0 focus-visible:ring-0">
                    <EnrollmentsTable enrollments={corners} onEdit={handleEditEnrollment} onCancel={setEnrollmentToCancel} canEdit={canEditEvents} />
                  </TabsContent>
                  <TabsContent value="staff" className="m-0 focus-visible:ring-0">
                    <EnrollmentsTable enrollments={staff} onEdit={handleEditEnrollment} onCancel={setEnrollmentToCancel} canEdit={canEditEvents} />
                  </TabsContent>
                  <TabsContent value="guests" className="m-0 focus-visible:ring-0">
                    <EnrollmentsTable enrollments={guests} onEdit={handleEditEnrollment} onCancel={setEnrollmentToCancel} canEdit={canEditEvents} />
                  </TabsContent>
                </div>
              </Tabs>
            </section>
          </div>

          <div className="space-y-8">
            <QuickActions eventId={eventId} />
            <UpcomingDeadlines deadlines={dashboardData.deadlines} />
          </div>
        </div>
      </main>

      <Sheet open={isEventDrawerOpen} onOpenChange={setIsEventDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Event Configuration</SheetTitle></SheetHeader>
          <div className="mt-6">
            <EventForm event={event} onSubmit={handleUpdateEvent} onCancel={() => setIsEventDrawerOpen(false)} loading={saving} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isEnrollmentDrawerOpen} onOpenChange={setIsEnrollmentDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{editingEnrollment ? 'Edit Enrollment' : 'Add Person'}</SheetTitle></SheetHeader>
          <div className="mt-6">
            <EnrollmentForm eventId={eventId} enrollment={editingEnrollment} onSubmit={handleSubmitEnrollment} onCancel={() => setIsEnrollmentDrawerOpen(false)} loading={saving} />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!enrollmentToCancel} onOpenChange={() => setEnrollmentToCancel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Enrollment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the enrollment for {enrollmentToCancel?.person?.compiled_name}?
              Nothing is deleted — they stay on every screen, marked as cancelled.
            </DialogDescription>
          </DialogHeader>
          {!!openTaskCount && (
            <label className="flex items-start gap-3 rounded-md border bg-muted/30 p-3 text-sm">
              <Checkbox
                checked={alsoCancelTasks}
                onCheckedChange={(v) => setAlsoCancelTasks(v === true)}
                className="mt-0.5"
              />
              <span>
                Also cancel their {openTaskCount} open task{openTaskCount > 1 ? 's' : ''}
                <span className="block text-xs text-muted-foreground">
                  Tasks already done keep their result. Leave this unticked to close them yourself.
                </span>
              </span>
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollmentToCancel(null)}>No, Keep</Button>
            <Button variant="destructive" onClick={handleCancelConfirm} disabled={saving}>Yes, Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EventDashboardPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  
  return (
    <RealtimeProvider eventId={eventId}>
      <EventDashboardContent eventId={eventId} />
    </RealtimeProvider>
  );
}
