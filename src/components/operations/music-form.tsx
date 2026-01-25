'use client';

import { useState, useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { 
  createAthleteMusic, 
  updateAthleteMusic 
} from '@/lib/services/music-service';
import { EntranceMusic, MusicSource, MusicStatus } from '@/types/music';

const musicSchema = z.object({
  songs: z.array(z.object({
    id: z.string().optional(),
    song_title: z.string().min(1, 'Title is required'),
    artist: z.string().min(1, 'Artist is required'),
    source_type: z.enum(['url', 'upload', 'spotify', 'youtube'] as const),
    source_url: z.string().url('Invalid URL').optional().or(z.literal('')),
    walkout_order: z.coerce.number().min(1).default(1),
    status: z.enum(['pending', 'confirmed', 'not_provided', 'uploaded'] as const).default('pending'),
    start_time_seconds: z.coerce.number().min(0).default(0),
  }))
});

type MusicFormValues = z.infer<typeof musicSchema>;

interface MusicFormProps {
  eventId: string;
  enrolledId: string;
  initialData?: EntranceMusic[];
  onSuccess?: () => void;
}

export function MusicForm({ eventId, enrolledId, initialData = [], onSuccess }: MusicFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<MusicFormValues>({
    resolver: zodResolver(musicSchema) as any,
    defaultValues: {
      songs: initialData.length > 0 ? initialData.map(s => ({
        id: s.id,
        song_title: s.song_title,
        artist: s.artist,
        source_type: s.source_type,
        source_url: s.source_url || '',
        walkout_order: s.walkout_order || 1,
        status: s.status,
        start_time_seconds: s.start_time_seconds || 0,
      })) : [
        { 
          song_title: '', 
          artist: '', 
          source_type: 'youtube', 
          source_url: '', 
          walkout_order: 1, 
          status: 'pending',
          start_time_seconds: 0
        }
      ]
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control as any,
    name: "songs"
  });

  function onSubmit(values: MusicFormValues) {
    startTransition(async () => {
      try {
        const promises = values.songs.map(song => {
          const payload = {
            enrolled_id: enrolledId,
            song_title: song.song_title,
            artist: song.artist,
            source_type: song.source_type as MusicSource,
            source_url: song.source_url || undefined,
            walkout_order: song.walkout_order,
            status: song.status as MusicStatus,
            start_time_seconds: song.start_time_seconds,
          };
          
          if (song.id) {
            return updateAthleteMusic(song.id, payload);
          } else {
            return createAthleteMusic(eventId, payload);
          }
        });
        
        await Promise.all(promises);
        toast.success('Music updated successfully');
        onSuccess?.();
      } catch (error) {
        toast.error('Failed to update music');
        console.error(error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrance Music</CardTitle>
        <CardDescription>
          Add up to 3 songs for walkout and victory.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-muted/20 relative">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-sm">Song #{index + 1}</h4>
                  {fields.length > 1 && (
                     <Button 
                       type="button" 
                       variant="ghost" 
                       size="icon" 
                       className="h-8 w-8 text-destructive hover:text-destructive/90"
                       onClick={() => remove(index)}
                     >
                       <Trash2 className="h-4 w-4" />
                     </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control as any}
                    name={`songs.${index}.song_title`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Song Title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control as any}
                    name={`songs.${index}.artist`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Artist</FormLabel>
                        <FormControl>
                          <Input placeholder="Artist Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <FormField
                    control={form.control as any}
                    name={`songs.${index}.source_type`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="spotify">Spotify</SelectItem>
                            <SelectItem value="url">Direct Link</SelectItem>
                            <SelectItem value="upload">Upload</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control as any}
                    name={`songs.${index}.walkout_order`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control as any}
                    name={`songs.${index}.start_time_seconds`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time (s)</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name={`songs.${index}.source_url`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}

            {fields.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => append({ 
                  song_title: '', 
                  artist: '', 
                  source_type: 'youtube', 
                  source_url: '', 
                  walkout_order: fields.length + 1,
                  status: 'pending',
                  start_time_seconds: 0
                })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Song
              </Button>
            )}

            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Music
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
