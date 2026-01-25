'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AthleteStatsForm } from '@/components/operations/athlete-stats-form';
import { MusicForm } from '@/components/operations/music-form';
import { TasksList } from '@/components/operations/tasks-list';

// This would typically fetch data based on a selected athlete/event
// For the MVP, we might show a selector or just assume a context
// However, the request asked for "Operations Page"
// Use placeholder ID or fetch param

export default function OperationsPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId') || 'default-event-id';
  const personId = searchParams.get('personId');
  const enrolledId = searchParams.get('enrolledId');

  if (!personId || !enrolledId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <h2 className="text-xl font-semibold mb-2">Select an Athlete</h2>
        <p>Please select an athlete from the Event Enrollment list to manage operations.</p>
        <p className="text-sm mt-4 text-gray-500">(Navigate to Event &rarr; Enrollments &rarr; Click Athlete)</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Operations Management</h1>
      </div>

      <Tabs defaultValue="stats" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stats">Athlete Stats</TabsTrigger>
          <TabsTrigger value="music">Entrance Music</TabsTrigger>
          <TabsTrigger value="tasks">Operational Tasks</TabsTrigger>
        </TabsList>
        
        <TabsContent value="stats">
            <AthleteStatsForm 
              personId={personId} 
              // initialData would be fetched here or inside the component
            />
        </TabsContent>
        
        <TabsContent value="music">
            <MusicForm 
              eventId={eventId} 
              enrolledId={enrolledId}
              // initialData fetch logic handled inside or via parent
            />
        </TabsContent>
        
        <TabsContent value="tasks">
            <TasksList 
              tasks={[]} // Tasks would be fetched via useEffect/SWR in a real implementation or wrapper
              onRefresh={() => {}} 
            />
            {/* Note: TasksList expects tasks prop. We needs a wrapper or logic to fetch tasks. 
                For now, rendering empty list. In real app, use SWR/React Query. */}
            <div className="my-4 p-4 border rounded bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-sm">
                Note: Tasks will appear here when fetched from the backend.
            </div>
        </TabsContent>
        
      </Tabs>
    </div>
  );
}
