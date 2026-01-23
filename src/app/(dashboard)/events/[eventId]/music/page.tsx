'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Music, CheckCircle, Clock, XCircle } from 'lucide-react';
import { MusicTable } from '@/components/music/music-table';
import { MusicForm } from '@/components/music/music-form';
import { EntranceMusic } from '@/types/music';
import { getEventMusic, getMusicStats } from '@/lib/services/music-service';

export default function MusicPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [music, setMusic] = useState<EntranceMusic[]>([]);
  const [editingMusic, setEditingMusic] = useState<EntranceMusic | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0, not_provided: 0, uploaded: 0 });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [musicData, statsData] = await Promise.all([
        getEventMusic(eventId),
        getMusicStats(eventId),
      ]);
      setMusic(musicData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load music:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = (m: EntranceMusic) => {
    setEditingMusic(m);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingMusic(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Entrance Music</h1>
          <p className="text-muted-foreground">Manage fighter walkout music</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Add Music
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.confirmed}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Not Provided</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-gray-600" />
              <span className="text-2xl font-bold">{stats.not_provided}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <MusicTable music={music} onEdit={handleEdit} onRefresh={loadData} />
      )}

      <MusicForm
        eventId={eventId}
        music={editingMusic}
        open={isFormOpen}
        onOpenChange={handleFormClose}
        onSuccess={loadData}
      />
    </div>
  );
}
