'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileUp, Loader2, AlertTriangle, FileText } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';

interface MusicCSVImportProps {
  onSuccess: () => void;
}

export function MusicCSVImport({ onSuccess }: MusicCSVImportProps) {
  const params = useParams();
  const eventId = params.eventId as string;
  const [open, setOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<{ success: number; failed: number } | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvContent(text);
      toast.success('CSV loaded from file');
    };
    reader.readAsText(file);
  };

  const processImport = async () => {
    if (!csvContent.trim()) return;
    setIsLoading(true);
    setStats(null);
    
    const supabase = createClient();
    let successCount = 0;
    let failCount = 0;

    // Parse CSV
    const { data } = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
    });

    console.log('[Import] Parsed data:', data);
    console.log('[Import] Accessing eventId:', eventId);

    for (const row of data as any[]) {
      try {
        const fighterId = row['fighter_id'] || row['id'];
        const link1 = row['links_1'] || row['link_1'] || row['links'];
        const link2 = row['links_2'] || row['link_2'];
        const link3 = row['links_3'] || row['link_3'];
        const notes = row['notes'];
        
        console.log('[Import] Processing row:', { fighterId, link1 });

        if (!fighterId) {
          console.warn('[Import] Skipped: No fighterId');
          failCount++;
          continue;
        }
        
        // Lookup Logic
        let enrolledId = null;
        
        // Helper to check UUID format
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str));

        if (isUUID(fighterId)) {
            // 1. Enrollment ID Lookup (only if UUID)
            const { data: enrollmentById } = await supabase.from('mma_enrollments').select('id').eq('id', fighterId).single();
            if (enrollmentById) {
                enrolledId = enrollmentById.id;
                console.log('[Import] Found by Enrollment ID:', enrolledId);
            }

            // 2. Person ID Lookup (only if UUID)
            if (!enrolledId) {
                const { data: enrollmentByPerson } = await supabase.from('mma_enrollments').select('id').eq('event_id', eventId).eq('person_id', fighterId).maybeSingle();
                if (enrollmentByPerson) {
                    enrolledId = enrollmentByPerson.id;
                    console.log('[Import] Found by Person ID:', enrolledId);
                }
            }
        } else {
             console.log('[Import] ID is not UUID, skipping direct UUID lookups.');
        }

        // 3. Custom Fighter ID Lookup
        if (!enrolledId) {
             // Clean the ID in case of whitespace
             const cleanFighterId = String(fighterId).trim();
             console.log('[Import] Trying Lookup by Custom Fighter ID:', cleanFighterId);
             
             const { data: personByFighterId, error: err3 } = await supabase
                .from('mma_people')
                .select('id, compiled_name:name, fighter_id')
                .eq('fighter_id', cleanFighterId)
                .maybeSingle();
             
             if (err3) console.error('[Import] Error finding person by fighter_id:', err3);

             if (personByFighterId) {
                console.log('[Import] Found Person:', personByFighterId);
                const { data: enrollmentByCustomId, error: err4 } = await supabase
                    .from('mma_enrollments')
                    .select('id')
                    .eq('event_id', eventId)
                    .eq('person_id', personByFighterId.id)
                    .maybeSingle();

                if (enrollmentByCustomId) {
                    enrolledId = enrollmentByCustomId.id;
                    console.log('[Import] Found Enrollment via Custom ID:', enrolledId);
                } else {
                    console.warn(`[Import] Person found (${personByFighterId.id}) but NOT enrolled in this event (${eventId}).`);
                }
             } else {
                console.warn(`[Import] Person NOT found with fighter_id: "${cleanFighterId}"`);
             }
        }

        if (!enrolledId) {
            console.warn(`Could not find enrollment for fighter ID: ${fighterId}`);
            failCount++;
            continue;
        }

        // 2. Upsert Music record
        const { error } = await supabase
          .from('mma_entrance_music')
          .upsert({
            event_id: eventId,
            enrolled_id: enrolledId,
            source_type: 'url', // Default to URL for CSV imports
            source_url: link1 || null,
            source_url_2: link2 || null,
            source_url_3: link3 || null,
            notes: notes || null,
            status: link1 ? 'uploaded' : 'pending',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'event_id, enrolled_id'
          });

        if (error) throw error;
        successCount++;
        
      } catch (err) {
        console.error('Row error:', err);
        failCount++;
      }
    }

    setIsLoading(false);
    setStats({ success: successCount, failed: failCount });
    if (successCount > 0) {
      toast.success(`Imported ${successCount} records successfully.`);
      onSuccess();
      // Don't close immediately so they can see stats
    } else {
        toast.error('No records imported. Check IDs.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Music Data</DialogTitle>
          <DialogDescription>
            Paste your CSV/Excel data here. 
            <br />
            Expected columns: <code>Fighter ID, Links 1, Links 2, Links 3, Notes</code>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <Input 
              id="csv-file" 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload}
              className="cursor-pointer" 
            />
          </div>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or paste content
              </span>
            </div>
          </div>

          <Textarea 
            placeholder={`Fighter ID, Links 1, Notes\n123, https://youtube.com/..., walkout fast`}
            className="min-h-[200px] font-mono text-xs"
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
          />
          
          <div className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded flex gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
            <div>
              <p>Ensure "Fighter ID" matches the Person ID or Enrollment ID in the system.</p>
            </div>
          </div>

          {stats && (
            <div className="flex gap-4 text-sm">
                <div className="text-green-600">Success: {stats.success}</div>
                <div className="text-red-500">Failed: {stats.failed}</div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={processImport} disabled={isLoading || !csvContent}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
