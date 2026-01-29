'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music, Play, Pause, ExternalLink, Volume2 } from 'lucide-react';
import { EntranceMusic } from '@/types/music';

interface MusicPlayerProps {
  music: EntranceMusic;
  onClose?: () => void;
}

export function MusicPlayer({ music, onClose }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const getEmbedUrl = () => {
    if (!music.source_url) return null;

    if (music.source_type === 'youtube') {
      // Convert https://www.youtube.com/watch?v=... to https://www.youtube.com/embed/...
      const url = new URL(music.source_url);
      const v = url.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}?autoplay=1`;
      
      // Handle short urls https://youtu.be/...
      if (url.hostname === 'youtu.be') {
        const id = url.pathname.slice(1);
        return `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
    }

    if (music.source_type === 'spotify') {
      // Convert https://open.spotify.com/track/... to https://open.spotify.com/embed/track/...
      if (music.source_url.includes('spotify.com')) {
         return music.source_url.replace('open.spotify.com', 'open.spotify.com/embed');
      }
    }

    return null;
  };

  const embedUrl = getEmbedUrl();

  return (
    <Card className="w-full bg-slate-900 text-white border-slate-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Music className="h-4 w-4 text-primary" />
            Now Previewing
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-slate-800 rounded-lg flex items-center justify-center">
            <Volume2 className="h-8 w-8 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold truncate">{music.enrolled?.person?.full_name || 'Fighter Music'}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] uppercase font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                Type: {music.source_type}
              </span>
              <span className="text-[10px] uppercase font-black text-slate-500">
                Starts at {music.start_time_seconds}s
              </span>
            </div>
          </div>
        </div>

        {embedUrl ? (
          <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-800 bg-black">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="space-y-3">
             <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-1/3 animate-pulse" />
             </div>
             <div className="flex justify-center gap-4">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-full h-12 w-12 border-slate-700 bg-transparent text-white hover:bg-slate-800"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
                </Button>
                {music.source_url && (
                  <Button asChild variant="ghost" size="icon" className="h-12 w-12 text-slate-400">
                    <a href={music.source_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-5 w-5" />
                    </a>
                  </Button>
                )}
             </div>
             <p className="text-[10px] text-center text-slate-500 uppercase font-bold tracking-widest">
               Local preview not available for this source. Open link to listen.
             </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function X({ className, ...props }: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
