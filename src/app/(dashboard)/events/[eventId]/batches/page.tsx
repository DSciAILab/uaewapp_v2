'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar, LayoutGrid, Scale, Users, CheckCircle } from 'lucide-react';
import { BatchCard } from '@/components/batches/batch-card';
import { BatchForm } from '@/components/batches/batch-form';
import { BatchAssignment } from '@/components/batches/batch-assignment';
import { BatchTimeline } from '@/components/batches/batch-timeline';
import { Batch, BatchFilters, BatchType, BATCH_TYPE_LABELS } from '@/types/batch';
import { getEventBatches, getBatchById, getBatchTimeline, getBatchStats } from '@/lib/services/batch-service';

export default function BatchesPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [timeline, setTimeline] = useState<{ date: string; batches: Batch[] }[]>([]);
  const [filters, setFilters] = useState<BatchFilters>({});
  const [stats, setStats] = useState({
    total: 0,
    by_type: {} as Record<BatchType, number>,
    by_status: {} as Record<string, number>,
    total_participants: 0,
    checked_in: 0,
    completed: 0,
  });
  
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [assignmentBatch, setAssignmentBatch] = useState<Batch | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [batchesData, timelineData, statsData] = await Promise.all([
        getEventBatches(eventId, filters),
        getBatchTimeline(eventId),
        getBatchStats(eventId),
      ]);
      setBatches(batchesData);
      setTimeline(timelineData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load batches:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBatchClick = async (batchId: string) => {
    const batch = await getBatchById(batchId);
    if (batch) {
      setAssignmentBatch(batch);
    }
  };

  const handleEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingBatch(null);
  };

  const handleAssignmentClose = () => {
    setAssignmentBatch(null);
  };

  const batchTypes = Object.entries(BATCH_TYPE_LABELS) as [BatchType, string][];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch Management</h1>
          <p className="text-muted-foreground">Organize participants into scheduled batches</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />New Batch
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.total_participants}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Checked In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold">{stats.checked_in}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.completed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Select
            value={filters.batch_type || 'all'}
            onValueChange={(v) => setFilters({ ...filters, batch_type: v === 'all' ? undefined : v as BatchType })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {batchTypes.map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'timeline')}>
          <TabsList>
            <TabsTrigger value="grid" className="flex items-center gap-1">
              <LayoutGrid className="h-4 w-4" />Grid
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />Timeline
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading batches...</div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              onEdit={handleEditBatch}
              onClick={handleBatchClick}
            />
          ))}
          {batches.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
              No batches found
            </div>
          )}
        </div>
      ) : (
        <BatchTimeline
          timeline={timeline}
          onEdit={handleEditBatch}
          onClick={handleBatchClick}
        />
      )}

      {/* Batch Form */}
      <BatchForm
        eventId={eventId}
        batch={editingBatch}
        open={isFormOpen}
        onOpenChange={handleFormClose}
        onSuccess={loadData}
      />

      {/* Batch Assignment */}
      {assignmentBatch && (
        <BatchAssignment
          eventId={eventId}
          batch={assignmentBatch}
          open={!!assignmentBatch}
          onOpenChange={handleAssignmentClose}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
