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
  source_type: z.enum(['url', 'upload', 'spotify', 'youtube']),
  source_url: z.string().optional(),
  start_time_seconds: z.coerce.number().min(0).default(0),
  source_url_2: z.string().optional(),
  start_time_2: z.coerce.number().min(0).optional(),
  source_url_3: z.string().optional(),
  start_time_3: z.coerce.number().min(0).optional(),
  status: z.enum(['pending', 'confirmed', 'not_provided', 'uploaded']),
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
    corner?: string;
    person: { id: string; full_name: string; role: string; fighter_id?: string; event_name?: string };
  }>>([]);

  const isEditing = !!music;

  const form = useForm<EntranceMusicFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(musicSchema) as any,
    defaultValues: {
      enrolled_id: '',
      source_type: 'url',
      source_url: '',
      start_time_seconds: 0,
      source_url_2: '',
      start_time_2: 0,
      source_url_3: '',
      start_time_3: 0,
      status: 'pending',
      notes: '',
    },
  });

  useEffect(() => {
    if (open && !isEditing) {
      getEnrollmentsByEvent(eventId).then(enrollments => {
        // Filter: only show those whose role code is 'F' (Fighter)
        setAvailableEnrolled(enrollments
          .filter(e => e.role?.code === 'F')
          .map(e => ({
            id: e.id,
            corner: e.corner || undefined,
            person: {
              id: e.person.id,
              full_name: e.person.compiled_name || `${e.person.name} ${e.person.surname}`,
              role: e.role?.name || 'Fighter',
              fighter_id: e.person.fighter_id || undefined,
              event_name: e.person.event_name || undefined
            }
          })));
      }).catch(console.error);
    }
  }, [open, eventId, isEditing]);

  useEffect(() => {
    if (music) {
      form.reset({
        enrolled_id: music.enrolled_id,
        source_type: music.source_type,
        source_url: music.source_url || '',
        start_time_seconds: music.start_time_seconds || 0,
        source_url_2: music.source_url_2 || '',
        start_time_2: music.start_time_2 || 0,
        source_url_3: music.source_url_3 || '',
        start_time_3: music.start_time_3 || 0,
        status: music.status,
        notes: music.notes || '',
      });
    } else {
      form.reset({
        enrolled_id: '',
        source_type: 'url',
        source_url: '',
        start_time_seconds: 0,
        source_url_2: '',
        start_time_2: 0,
        source_url_3: '',
        start_time_3: 0,
        status: 'pending',
        notes: '',
      });
    }
  }, [music, form, open]);

  const onSubmit = async (data: EntranceMusicFormData) => {
    setIsLoading(true);
    try {
      if (isEditing && music) {
        await updateAthleteMusic(music.id, data);
        toast.success('Music updated');
      } else {
        await createAthleteMusic(eventId, data);
        toast.success('Music added');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to save entrance music');
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions: { value: MusicStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'not_provided', label: 'Not Provided' },
    { value: 'uploaded', label: 'Uploaded' },
  ];

  const handleDownload = async (url: string | undefined, index: number) => {
    if (!url) return;
    try {
      setIsLoading(true);
      toast.info('Starting download... check your downloads folder');
      
      const res = await fetch('/api/public/music/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, action: 'download' })
      });

      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Download failed');
      }

      // Create blob link to trigger download
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;

      // Custom Filename Construction
      let filename = 'audio.mp3';
      
      const enrolledId = form.getValues('enrolled_id');
      const selectedEnrolled = availableEnrolled.find(e => e.id === enrolledId);
      
      if (selectedEnrolled) {
        const corner = selectedEnrolled.corner || 'Corner';
        const fighterId = selectedEnrolled.person.fighter_id || 'ID';
        const eventName = selectedEnrolled.person.event_name || 'Event';
        const name = selectedEnrolled.person.full_name || 'Fighter';
        
        const clean = (str: string) => str.replace(/[^a-z0-9\s_-]/gi, '').trim().replace(/\s+/g, '_');
        
        filename = `${clean(corner)}_${clean(name)}_Track-${index}.mp3`;
      } else if (music && music.enrolled) {
         const corner = music.enrolled.corner || 'Corner';
         const p = music.enrolled.person as any;
         const fighterId = p?.fighter_id || 'ID';
         const eventName = p?.event_name || 'Event';
         const name = p?.full_name || 'Fighter';
         
         const clean = (str: string) => str.replace(/[^a-z0-9\s_-]/gi, '').trim().replace(/\s+/g, '_');
         filename = `${clean(corner)}_${clean(name)}_Track-${index}.mp3`;
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      toast.success('Download started!');
    } catch (e: any) {
        console.error(e);
        toast.error(e.message || 'Download failed');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                    <FormLabel>Fighter (Enrolled) *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select fighter" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {availableEnrolled.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.person.full_name}</SelectItem>
                        ))}
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
               <FormField
                control={form.control}
                name="source_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type (Global)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="url">URL Link</SelectItem>
                        <SelectItem value="spotify">Spotify</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="upload">Upload</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 border rounded-lg p-3 bg-muted/30">
              <h3 className="text-sm font-semibold">Source Link 1</h3>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-8">
                  <FormField
                    control={form.control}
                    name="source_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                            <Input placeholder="URL 1 (YouTube, Spotify, etc)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-4 flex gap-1">
                     <FormField
                        control={form.control}
                        name="start_time_seconds"
                        render={({ field }) => (
                            <FormItem>
                            <FormControl><Input type="number" placeholder="Start (s)" className="w-full" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
              </div>

               {/* Admin Helper Tools 1 */}
               <div className="flex gap-2">
                 {(form.watch('source_url')?.includes('youtube.com') || form.watch('source_url')?.includes('youtu.be')) && (
                    <>
                        <Button 
                            type="button" 
                            variant="secondary" 
                            size="sm"
                            className="text-xs h-7"
                            onClick={async () => {
                                const url = form.getValues('source_url');
                                if (!url) return;
                                try {
                                    setIsLoading(true);
                                    const res = await fetch('/api/public/music/convert', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ url, action: 'check' })
                                    });
                                    const data = await res.json();
                                    if (data.error) throw new Error(data.error);
                                    toast.success(`Found: ${data.title}`);
                                } catch (e: any) {
                                    toast.error(e.message);
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                        >
                            Verify Link
                        </Button>
                        <Button 
                            type="button" 
                            variant="destructive" 
                            size="sm"
                            className="text-xs h-7 bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => handleDownload(form.getValues('source_url'), 1)}
                        >
                            Download MP3
                        </Button>
                    </>
                 )}
               </div>

            </div>

            <div className="space-y-4 border rounded-lg p-3 bg-muted/30">
              <h3 className="text-sm font-semibold">Source Link 2</h3>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-8">
                  <FormField
                    control={form.control}
                    name="source_url_2"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl><Input placeholder="URL 2" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-4">
                    <FormField
                    control={form.control}
                    name="start_time_2"
                    render={({ field }) => (
                        <FormItem>
                        <FormControl><Input type="number" placeholder="Start (s)" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
              </div>
                {/* Admin Helper Tools 2 */}
               <div className="flex gap-2">
                 {(form.watch('source_url_2')?.includes('youtube.com') || form.watch('source_url_2')?.includes('youtu.be')) && (
                    <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm"
                        className="text-xs h-7 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleDownload(form.getValues('source_url_2'), 2)}
                    >
                        Download MP3
                    </Button>
                 )}
               </div>
            </div>

            <div className="space-y-4 border rounded-lg p-3 bg-muted/30">
              <h3 className="text-sm font-semibold">Source Link 3</h3>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-8">
                  <FormField
                    control={form.control}
                    name="source_url_3"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl><Input placeholder="URL 3" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-4">
                <FormField
                  control={form.control}
                  name="start_time_3"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl><Input type="number" placeholder="Start (s)" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>
              </div>
                {/* Admin Helper Tools 3 */}
               <div className="flex gap-2">
                 {(form.watch('source_url_3')?.includes('youtube.com') || form.watch('source_url_3')?.includes('youtu.be')) && (
                    <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm"
                        className="text-xs h-7 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleDownload(form.getValues('source_url_3'), 3)}
                    >
                        Download MP3
                    </Button>
                 )}
               </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Instructions..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-background py-2 border-t">
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
