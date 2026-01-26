'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EntranceMusic, EntranceMusicFormData, MusicStatus, MusicSource } from '@/types/music';
import { createAthleteMusic, updateAthleteMusic } from '@/lib/services/music-service';
import { getEnrollmentsByEvent } from '@/lib/services/enrollments';
import { toast } from 'sonner';

const musicSchema = z.object({
  enrolled_id: z.string().min(1, 'Please select a fighter'),
  song_title: z.string().min(1, 'Song title is required'),
  artist: z.string().min(1, 'Artist is required'),
  source_type: z.enum(['url', 'upload', 'spotify', 'youtube']),
  source_url: z.string().optional(),
  start_time_seconds: z.coerce.number().min(0),
  duration_seconds: z.coerce.number().min(1).optional(),
  status: z.enum(['pending', 'confirmed', 'not_provided', 'uploaded']),
  walkout_order: z.coerce.number().min(1).optional(),
  notes: z.string().optional(),
});

interface MusicFormProps {
  eventId: string;
  music?: EntranceMusic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MusicForm({ eventId, music, open, onOpenChange, onSuccess }: MusicFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [availableEnrolled, setAvailableEnrolled] = useState<Array<{
    id: string;
    person: { id: string; full_name: string; role: string };
  }>>([]);

  const isEditing = !!music;

  const form = useForm<EntranceMusicFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(musicSchema) as any,
    defaultValues: {
      enrolled_id: '',
      song_title: '',
      artist: '',
      source_type: 'url',
      source_url: '',
      start_time_seconds: 0,
      duration_seconds: undefined,
      status: 'pending',
      walkout_order: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    if (open && !isEditing) {
      // Fetch all enrollments, filter in component if needed or create specialized service method
      getEnrollmentsByEvent(eventId).then(enrollments => {
        // Simple mapping for now, ideally we filter out those who already have music
        setAvailableEnrolled(enrollments.map(e => ({
          id: e.id,
          person: {
            id: e.person.id,
            full_name: e.person.compiled_name || `${e.person.name} ${e.person.surname}`,
            role: 'Participant' // Default or derive from e.role
          }
        })));
      }).catch(console.error);
    }
  }, [open, eventId, isEditing]);

  useEffect(() => {
    if (music) {
      form.reset({
        enrolled_id: music.enrolled_id,
        song_title: music.song_title,
        artist: music.artist,
        source_type: music.source_type,
        source_url: music.source_url || '',
        start_time_seconds: music.start_time_seconds,
        duration_seconds: music.duration_seconds || undefined,
        status: music.status,
        walkout_order: music.walkout_order || undefined,
        notes: music.notes || '',
      });
    } else {
      form.reset({
        enrolled_id: '',
        song_title: '',
        artist: '',
        source_type: 'url',
        source_url: '',
        start_time_seconds: 0,
        duration_seconds: undefined,
        status: 'pending',
        walkout_order: undefined,
        notes: '',
      });
    }
  }, [music, form]);

  const onSubmit = async (data: EntranceMusicFormData) => {
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateAthleteMusic(music.id, data);
        toast.success('Music updated');
      } else {
        await createAthleteMusic(eventId, data);
        toast.success('Music added');
      }
      onSuccess();
      onOpenChange(false);
    } catch (_error) {
      toast.error('Failed to save entrance music');
    } finally {
      setIsLoading(false);
    }
  };

  const sourceTypes: { value: MusicSource; label: string }[] = [
    { value: 'url', label: 'URL Link' },
    { value: 'spotify', label: 'Spotify' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'upload', label: 'File Upload' },
  ];

  const statusOptions: { value: MusicStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'not_provided', label: 'Not Provided' },
    { value: 'uploaded', label: 'Uploaded' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Entrance Music' : 'Add Entrance Music'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isEditing && (
              <FormField
                control={form.control}
                name="enrolled_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fighter *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select fighter" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {availableEnrolled.map((e) => {
                          const personName = e.person.full_name;
                          return (
                            <SelectItem key={e.id} value={e.id}>{personName || 'Unknown'}</SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="song_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Song Title *</FormLabel>
                    <FormControl><Input placeholder="Enter song title" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="artist"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Artist *</FormLabel>
                    <FormControl><Input placeholder="Enter artist name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {sourceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="source_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source URL</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                  <FormDescription>Link to the music (Spotify, YouTube, etc.)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="start_time_seconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time (sec)</FormLabel>
                    <FormControl><Input type="number" min={0} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration_seconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (sec)</FormLabel>
                    <FormControl><Input type="number" min={1} placeholder="Auto" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="walkout_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Walkout Order</FormLabel>
                    <FormControl><Input type="number" min={1} placeholder="#" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Add Music'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
