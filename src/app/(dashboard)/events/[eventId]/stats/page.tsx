'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsTable } from '@/components/stats/stats-table';
import { StatsForm } from '@/components/stats/stats-form';
import { StatsCard } from '@/components/stats/stats-card';
import { FighterStats } from '@/types/stats';
import { getEventFighterStats } from '@/lib/services/stats-service';

export default function StatsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [stats, setStats] = useState<FighterStats[]>([]);
  const [editingStats, setEditingStats] = useState<FighterStats | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getEventFighterStats(eventId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = (s: FighterStats) => {
    setEditingStats(s);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingStats(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fighter Stats</h1>
          <p className="text-muted-foreground">Manage fighter statistics and records</p>
        </div>
        <div className="flex gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'cards')}>
            <TabsList>
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="cards">Cards</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : viewMode === 'table' ? (
        <StatsTable stats={stats} onEdit={handleEdit} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.id} className="cursor-pointer" onClick={() => handleEdit(s)}>
              <StatsCard stats={s} />
            </div>
          ))}
        </div>
      )}

      {editingStats && (
        <StatsForm
          personId={editingStats.person_id}
          personName={editingStats.person?.full_name || ''}
          stats={editingStats}
          open={isFormOpen}
          onOpenChange={handleFormClose}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
