'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatsTable } from '@/components/stats/stats-table';
import { StatsForm } from '@/components/stats/stats-form';
import { CoachStatsForm } from '@/components/operations/coach-stats-form';
import { StatsCard } from '@/components/stats/stats-card';
import { StatsHistory } from '@/components/stats/stats-history';
import { UniformsTab } from '@/components/stats/uniforms-tab';
import { FighterStats, EventWeighIn, CoachData } from '@/types/stats';
import { getEventFighterStats, getEventWeighIns, getEventCoachData } from '@/lib/services/stats-service';

export default function StatsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [stats, setStats] = useState<FighterStats[]>([]);
  const [editingStats, setEditingStats] = useState<FighterStats | null>(null);
  
  const [coachStats, setCoachStats] = useState<CoachData[]>([]);
  const [editingCoach, setEditingCoach] = useState<CoachData | null>(null);
  
  const [activeTab, setActiveTab] = useState('list');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [weighIns, setWeighIns] = useState<EventWeighIn[]>([]);
  const [isLoadingWeighIns, setIsLoadingWeighIns] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Parallel fetch
      const [fighterData, coachData] = await Promise.all([
        getEventFighterStats(eventId),
        getEventCoachData(eventId)
      ]);
      setStats(fighterData);
      setCoachStats(coachData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  const loadWeighIns = useCallback(async () => {
    setIsLoadingWeighIns(true);
    try {
      const data = await getEventWeighIns(eventId);
      setWeighIns(data);
    } catch (error) {
      console.error('Failed to load weigh-ins:', error);
    } finally {
      setIsLoadingWeighIns(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadWeighIns();
    }
  }, [activeTab, loadWeighIns]);

  const handleEdit = (s: FighterStats) => {
    setEditingStats(s);
    setEditingCoach(null);
    setIsFormOpen(true);
  };
  
  const handleEditCoach = (c: CoachData) => {
    setEditingCoach(c);
    setEditingStats(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingStats(null);
    setEditingCoach(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Event Statistics</h1>
          <p className="text-muted-foreground">Manage stats, uniforms, and physical data for athletes and coaches</p>
        </div>
        <div className="flex gap-2">
          {activeTab !== 'history' && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'cards')}>
              <TabsList>
                <TabsTrigger value="table">Table</TabsTrigger>
                <TabsTrigger value="cards">Cards</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Athletes</TabsTrigger>
          <TabsTrigger value="uniforms">Uniforms</TabsTrigger>
          <TabsTrigger value="coaches">Coaches</TabsTrigger>
          <TabsTrigger value="history">Weight History</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          {isLoading ? (
            <div className="text-center py-8">Loading stats...</div>
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
        </TabsContent>
        
        <TabsContent value="uniforms" className="mt-6">
           <UniformsTab eventId={eventId} />
        </TabsContent>
        
        <TabsContent value="coaches" className="mt-6">
           {isLoading ? (
            <div className="text-center py-8">Loading coach data...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coachStats.length === 0 && <div className="col-span-3 text-center py-8 text-muted-foreground">No coach data found</div>}
              {coachStats.map((c) => (
                <Card key={c.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleEditCoach(c)}>
                  <CardHeader>
                    <CardTitle>{c.person?.full_name}</CardTitle>
                    <CardDescription>{c.person?.nationality}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                       <p><span className="font-medium">Uniform:</span> {c.uniform_size || '-'}</p>
                       <p><span className="font-medium">Shoes:</span> {c.shoe_size || '-'}</p>
                       <p><span className="font-medium">Height:</span> {c.height_cm ? `${c.height_cm}cm` : '-'}</p>
                       <p><span className="font-medium">Weight:</span> {c.weight_kg ? `${c.weight_kg}kg` : '-'}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <StatsHistory eventId={eventId} />
        </TabsContent>
      </Tabs>

      {/* Dialog/Sheet would be better here but reusing existing pattern if it's a modal */}
      {/* Assuming StatsForm is a wrapper around AthleteStatsForm in a Dialog */}
      
      {isFormOpen && editingStats && (
        <StatsForm
          personId={editingStats.person_id}
          personName={editingStats.person?.full_name || ''}
          stats={editingStats}
          open={isFormOpen}
          onOpenChange={handleFormClose}
          onSuccess={loadData}
        />
      )}
      
      {isFormOpen && editingCoach && (
         <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Edit Coach: {editingCoach.person?.full_name}</DialogTitle>
             </DialogHeader>
             <CoachStatsForm 
                personId={editingCoach.person_id}
                initialData={editingCoach}
                onSuccess={() => {
                  loadData();
                  handleFormClose();
                }}
             />
           </DialogContent>
         </Dialog>
      )}
    </div>
  );
}

