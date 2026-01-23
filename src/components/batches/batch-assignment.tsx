'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, UserPlus, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Batch, BatchParticipant, BatchParticipantStatus } from '@/types/batch';
import { 
  getBatchParticipants, 
  addParticipantToBatch, 
  removeParticipantFromBatch, 
  updateParticipantStatus,
  getAvailableEnrolledForBatch 
} from '@/lib/services/batch-service';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BatchAssignmentProps {
  eventId: string;
  batch: Batch;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function BatchAssignment({ eventId, batch, open, onOpenChange, onRefresh }: BatchAssignmentProps) {
  const [participants, setParticipants] = useState<BatchParticipant[]>([]);
  const [available, setAvailable] = useState<Array<{ id: string; person: any }>>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [parts, avail] = await Promise.all([
        getBatchParticipants(batch.id),
        getAvailableEnrolledForBatch(eventId, batch.id)
      ]);
      setParticipants(parts);
      setAvailable(avail);
    } catch (error) {
      toast.error('Failed to load participants');
    } finally {
      setIsLoading(false);
    }
  }, [batch.id, eventId]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  const handleAdd = async (enrolledId: string) => {
    try {
      await addParticipantToBatch(batch.id, { enrolled_id: enrolledId });
      toast.success('Participant added');
      loadData();
      onRefresh();
    } catch (error) {
      toast.error('Failed to add participant');
    }
  };

  const handleRemove = async (participantId: string) => {
    try {
      await removeParticipantFromBatch(participantId);
      toast.success('Participant removed');
      loadData();
      onRefresh();
    } catch (error) {
      toast.error('Failed to remove participant');
    }
  };

  const handleStatusChange = async (participantId: string, status: BatchParticipantStatus) => {
    try {
      await updateParticipantStatus(participantId, status);
      toast.success(`Marked as ${status}`);
      loadData();
      onRefresh();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredAvailable = available.filter(e => 
    e.person.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusIcon = (status: BatchParticipantStatus) => {
    switch (status) {
      case 'checked_in': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'no_show': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Badge variant="outline">Assigned</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Manage Batch: {batch.name || `${batch.batch_type} #${batch.batch_number}`}</span>
            <Badge variant="outline">{participants.length} / {batch.max_capacity || '∞'}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Active Participants */}
          <div className="flex flex-col border rounded-lg overflow-hidden">
            <div className="bg-muted p-3 border-b font-medium">Participants</div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {participants.length === 0 ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">No participants assigned</p>
                ) : (
                  participants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded border bg-card text-sm">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-medium truncate">{p.enrolled?.person.full_name}</p>
                        <p className="text-xs text-muted-foreground">{p.enrolled?.person.role}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-yellow-600"
                          onClick={() => handleStatusChange(p.id, 'checked_in')}
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-green-600"
                          onClick={() => handleStatusChange(p.id, 'completed')}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRemove(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Available People */}
          <div className="flex flex-col border rounded-lg overflow-hidden">
            <div className="bg-muted p-3 border-b space-y-2">
              <div className="font-medium">Add Participants</div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="pl-7 h-8 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredAvailable.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">No matches found</p>
                ) : (
                  filteredAvailable.map((e) => (
                    <div key={e.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 text-xs">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-medium truncate">{e.person.full_name}</p>
                        <p className="text-muted-foreground">{e.person.role}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAdd(e.id)}>
                        <UserPlus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
