'use client';

import { useState, useRef } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { EntranceMusic } from '@/types/music';
import { Download, Loader2, FileAudio, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

interface MusicBulkDownloadProps {
  music: EntranceMusic[];
  eventName?: string;
}

export function MusicBulkDownload({ music, eventName = 'Event' }: MusicBulkDownloadProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);

  const downloadableMusic = music.filter(m => m.source_url || m.source_url_2 || m.source_url_3);
  const totalFiles = downloadableMusic.length;

  const handleDownload = async () => {
    setDownloading(true);
    setProgress(0);
    setStats({ total: totalFiles, success: 0, failed: 0 });
    abortControllerRef.current = new AbortController();

    const zip = new JSZip();
    const folder = zip.folder(`Music_${eventName.replace(/\s+/g, '_')}`);
    
    let processed = 0;
    let localSuccess = 0;
    let localFailed = 0;

    for (const m of downloadableMusic) {
      if (abortControllerRef.current?.signal.aborted) break;

      const fighterName = m.enrolled?.person?.compiled_name || 'Unknown';
      const corner = m.enrolled?.corner || 'Corner';
      
      const clean = (str: string) => str.replace(/[^a-z0-9\s_-]/gi, '').trim().replace(/\s+/g, '_');
      const safeName = clean(fighterName);
      const safeCorner = clean(corner);

      setCurrentFile(`Downloading for: ${fighterName}...`);

      const urls = [
        { url: m.source_url, suffix: 'Track-1' },
        { url: m.source_url_2, suffix: 'Track-2' },
        { url: m.source_url_3, suffix: 'Track-3' },
      ].filter(u => u.url);

      for (const { url, suffix } of urls) {
        if (!url) continue;

        try {
            // Check if it's a youtube link (not a file)
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                // If it's a raw youtube link, we can't download it client-side easily.
                // We'll create a text file with the link instead.
                folder?.file(`${safeCorner}_${safeName}_${suffix}.txt`, url);
            } else {
                // Assuming it's a file (Supabase storage or other direct link)
                const response = await fetch(url, { signal: abortControllerRef.current.signal });
                if (!response.ok) throw new Error(`Failed to fetch ${url}`);
                const blob = await response.blob();
                
                // Try to guess extension
                let ext = 'mp3';
                const type = blob.type;
                if (type === 'audio/mpeg') ext = 'mp3';
                else if (type === 'audio/wav') ext = 'wav';
                else if (type === 'video/mp4') ext = 'mp4';
                
                folder?.file(`${safeCorner}_${safeName}_${suffix}.${ext}`, blob);
            }
            localSuccess++;
        } catch (error) {
            console.error(`Error downloading ${fighterName}:`, error);
            localFailed++;
            // Create an error text file
            folder?.file(`${safeCorner}_${safeName}_${suffix}_ERROR.txt`, `Failed to download: ${url}\nError: ${error}`);
        }
      }

      processed++;
      setProgress((processed / totalFiles) * 100);
      setStats(prev => ({ ...prev, success: localSuccess, failed: localFailed }));
    }

    if (!abortControllerRef.current?.signal.aborted) {
        setCurrentFile('Generating ZIP file...');
        try {
            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `${eventName.replace(/\s+/g, '_')}_Music.zip`);
            toast.success('Download complete!');
            setOpen(false);
        } catch (err) {
            toast.error('Failed to generate ZIP');
        }
    }

    setDownloading(false);
    setCurrentFile('');
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    setDownloading(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !downloading && setOpen(val)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download All
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Download Event Music</DialogTitle>
          <DialogDescription>
            Download all entrance music as a ZIP file.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
            {!downloading ? (
                <div className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between items-center bg-muted/50 p-3 rounded">
                        <span className="flex items-center gap-2">
                            <FileAudio className="h-4 w-4 text-muted-foreground" />
                            Total Tracks Found:
                        </span>
                        <span className="font-bold">{totalFiles}</span>
                    </div>
                    {totalFiles > 0 && (
                        <div className="flex gap-2 items-start text-muted-foreground bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded text-xs">
                             <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                             <p>
                                Direct files (MP3/WAV) will be downloaded. YouTube links will be saved as text files containing the link.
                             </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                    
                    <div className="bg-zinc-950 text-green-400 font-mono text-xs p-3 rounded h-24 overflow-y-auto flex flex-col-reverse">
                        <div>{currentFile}</div>
                        {stats.success > 0 && <div>Downloaded: {stats.success} files</div>}
                        {stats.failed > 0 && <div className="text-red-400">Failed: {stats.failed} files</div>}
                    </div>
                </div>
            )}
        </div>

        <DialogFooter>
          {downloading ? (
            <Button variant="destructive" onClick={handleCancel}>Cancel</Button>
          ) : (
            <>
                <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
                <Button onClick={handleDownload} disabled={totalFiles === 0}>
                    Start Download
                </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
