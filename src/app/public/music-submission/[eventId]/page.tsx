'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Search, Music, AlertCircle, CheckCircle, Loader2, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

// ... (previous imports and initial component structure remains the same)

export default function MusicSubmissionPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [step, setStep] = useState<'search' | 'submit'>('search');
  const [selectedFighter, setSelectedFighter] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Submission Form State
  const [submissionType, setSubmissionType] = useState<'upload' | 'youtube' | 'spotify'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  // NEW: State for the "uploaded" YouTube file URL
  const [youtubeFileUrl, setYoutubeFileUrl] = useState<string | null>(null);

  const [startTime, setStartTime] = useState(0);

  // Search Fighters (same as before)
  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    setIsSearching(true);
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('mma_enrollments')
        .select(`
          id,
          person:mma_people(id, compiled_name:compiled_name, academy:other_academy)
        `)
        .eq('event_id', eventId)
        .ilike('person.compiled_name', `%${searchQuery}%`)
        .limit(10);
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search fighters');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectFighter = (fighter: any) => {
    setSelectedFighter(fighter);
    setStep('submit');
  };

  // NEW: Check vs Upload
  const handleYoutubeAction = async (action: 'check' | 'upload') => {
    if (!youtubeUrl) return;
    setLoading(true);
    try {
      const response = await fetch('/api/public/music/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl, action })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      if (action === 'check') {
          setPreviewData(data);
          toast.success('Video found!');
      } else if (action === 'upload') {
          setYoutubeFileUrl(data.publicUrl);
          toast.success('Audio downloaded & saved!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process video');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const supabase = createClient();
    
    try {
      let finalUrl = '';
      
      if (submissionType === 'upload' && file) {
        // Handle MP3 Upload
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedFighter.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('music')
          .upload(fileName, file);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('music')
          .getPublicUrl(fileName);
          
        finalUrl = publicUrl;
      } else if (submissionType === 'youtube') {
        // If we have a converted file, use that. Otherwise use the raw link (fallback)
        finalUrl = youtubeFileUrl || youtubeUrl;
      }

      // Check if entry exists
      const { data: existing } = await supabase
        .from('mma_entrance_music')
        .select('id')
        .eq('enrolled_id', selectedFighter.id)
        .single();

      const payload = {
        event_id: eventId,
        enrolled_id: selectedFighter.id,
        source_type: submissionType,
        source_url: finalUrl,
        // If we have a file URL from YouTube conversion, save it as source_url
        // We might want to save the original link too, but sticking to existing schema
        start_time_seconds: startTime,
        status: finalUrl ? 'uploaded' : 'pending',
        updated_at: new Date().toISOString()
      };

      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from('mma_entrance_music')
          .update(payload)
          .eq('id', existing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('mma_entrance_music')
          .insert(payload);
        error = insertError;
      }

      if (error) throw error;
      toast.success('Music submitted successfully!');
      // Reset
      setStep('search'); 
      setSelectedFighter(null);
      setFile(null);
      setYoutubeUrl('');
      setPreviewData(null);
      setYoutubeFileUrl(null);
      
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error('Failed to submit music');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Entrance Music</h1>
        <p className="text-muted-foreground">Search for your name and upload your walkout song.</p>
      </div>

      {step === 'search' && (
        <Card>
          <CardHeader>
            <CardTitle>Find Your Profile</CardTitle>
            <CardDescription>Enter your fighter name to begin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Search fighter name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            <div className="space-y-2 mt-4">
              {searchResults.map((result) => (
                <div 
                  key={result.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                  onClick={() => handleSelectFighter(result)}
                >
                  <div>
                    <div className="font-semibold">{result.person.compiled_name}</div>
                    <div className="text-sm text-muted-foreground">{result.person.academy || 'No Academy'}</div>
                  </div>
                  <Button variant="ghost" size="sm">Select</Button>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery.length > 2 && !isSearching && (
                 <div className="text-center text-muted-foreground py-4">No fighters found.</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'submit' && selectedFighter && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upload Music</CardTitle>
                <CardDescription>for {selectedFighter.person.compiled_name}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep('search')}>Change Fighter</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="upload" onValueChange={(v) => setSubmissionType(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload File</TabsTrigger>
                <TabsTrigger value="youtube">YouTube Link</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4 pt-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="music-file">MP3 / Audio File</Label>
                  <Input 
                    id="music-file" 
                    type="file" 
                    accept="audio/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">Max size: 10MB. MP3 preferred.</p>
                </div>
              </TabsContent>

              <TabsContent value="youtube" className="space-y-4 pt-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Paste YouTube URL..." 
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                  />
                  <Button onClick={() => handleYoutubeAction('check')} disabled={loading} variant="secondary" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                {previewData && (
                   <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-md space-y-3">
                      <div className="flex gap-3 text-sm">
                        <img src={previewData.thumbnail} className="w-16 h-16 object-cover rounded bg-zinc-200" />
                        <div className="flex-1 overflow-hidden">
                            <div className="font-medium truncate">{previewData.title}</div>
                            <div className="text-muted-foreground">{previewData.author}</div>
                            
                            {youtubeFileUrl ? (
                                <div className="text-xs mt-2 text-green-600 flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> Audio Saved & Ready
                                </div>
                            ) : (
                                <Button 
                                    size="sm" 
                                    variant="default" 
                                    className="mt-2 w-full gap-2"
                                    onClick={() => handleYoutubeAction('upload')}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                                    Download & Save as MP3
                                </Button>
                            )}
                        </div>
                      </div>
                   </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label>Start Time (Seconds)</Label>
              <div className="flex items-center gap-4">
                <Input 
                   type="number" 
                   min="0"
                   value={startTime}
                   onChange={(e) => setStartTime(Number(e.target.value))}
                   className="w-24" 
                />
                <span className="text-sm text-muted-foreground">
                   When should the music start? (e.g. 0 for beginning, 30 for drop)
                </span>
              </div>
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={loading || (!file && !youtubeUrl)}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting and Processing...
                </>
              ) : (
                'Submit Music'
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
