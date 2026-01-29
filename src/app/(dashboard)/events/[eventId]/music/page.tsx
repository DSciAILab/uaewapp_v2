'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Music, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { MusicTable } from '@/components/music/music-table';
import { MusicForm } from '@/components/music/music-form';
import { MusicPlayer } from '@/components/music/music-player';
import { EntranceMusic, MusicStatus } from '@/types/music';
import { getEventMusic } from '@/lib/services/music-service';

export default function MusicPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [music, setMusic] = useState<EntranceMusic[]>([]);
  const [editingMusic, setEditingMusic] = useState<EntranceMusic | null>(null);
  const [previewMusic, setPreviewMusic] = useState<EntranceMusic | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadMusic = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getEventMusic(eventId);
      setMusic(data);
    } catch (error) {
      console.error('Failed to load music:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadMusic();
  }, [loadMusic]);

  const handleEdit = (m: EntranceMusic) => {
    setEditingMusic(m);
    setIsFormOpen(true);
  };

  const handlePreview = (m: EntranceMusic) => {
    setPreviewMusic(m);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingMusic(null);
  };

  const stats = {
    total: music.length,
    confirmed: music.filter((m) => m.status === 'confirmed').length,
    pending: music.filter((m) => m.status === 'pending').length,
    missing: music.filter((m) => !m.source_url).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Entrance Music</h1>
          <p className="text-muted-foreground">Manage fighter walkout songs and order</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Add Music
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Athletes</CardTitle>
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
              <Clock className="h-5 w-5 text-gray-400" />
              <span className="text-2xl font-bold">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Missing Link</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{stats.missing}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="text-center py-8">Loading music...</div>
              ) : (
                <MusicTable 
                  music={music} 
                  onEdit={handleEdit} 
                  onRefresh={loadMusic}
                  onPreview={handlePreview}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {previewMusic && (
            <MusicPlayer music={previewMusic} onClose={() => setPreviewMusic(null)} />
          )}
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Walkout Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Music must be confirmed 24h before event.</li>
                <li>• Maximum duration is 60 seconds per fighter.</li>
                <li>• Walkout order is strictly followed.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <MusicForm
        eventId={eventId}
        music={editingMusic}
        open={isFormOpen}
        onOpenChange={handleFormClose}
        onSuccess={loadMusic}
      />
    </div>
  );
}
