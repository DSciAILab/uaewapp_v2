
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { StagingTable } from '@/components/staging/staging-table';
import { getStagingData } from '@/lib/services/staging-service';
import { StagingRow } from '@/types/staging';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function StagingPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [data, setData] = useState<StagingRow[]>([]);
  const [eventName, setEventName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getStagingData(eventId);
      setData(result);
      if (result.length > 0) {
        setEventName(result[0].event_name || 'Event Results');
      } else {
        // Fallback fetch for event name if table is empty
        // We can do this in a real app, for now let's just show 'Physical Staging'
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/public/staging/${eventId}`;
    navigator.clipboard.writeText(url);
    toast.success('Public link copied to clipboard');
  };

  const handleOpenPublic = () => {
    window.open(`/public/staging/${eventId}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {eventName ? `${eventName} - Pre-Departure Check` : 'Pre-Departure Check'}
          </h2>
          <p className="text-muted-foreground">
            Manage physical checks, coach credentials, and bus assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink} title="Copy Public Link">
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenPublic}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Public Monitor
            </Button>
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
            </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
           <div className="text-muted-foreground">Loading staging data...</div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/10 border-dashed">
           <p className="font-medium text-lg">No athletes found for this event.</p>
           <p className="text-muted-foreground text-sm">Ensure athletes are enrolled in the system.</p>
        </div>
      ) : (
        <StagingTable data={data} eventId={eventId} />
      )}
    </div>
  );
}
