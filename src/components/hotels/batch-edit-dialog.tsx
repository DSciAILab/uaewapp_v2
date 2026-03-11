'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HotelStatus, HotelFormData } from '@/types/hotel';
import { updateHotelBatch } from '@/lib/services/hotel-service';
import { toast } from 'sonner';

interface BatchEditDialogProps {
  ids: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BatchEditDialog({ ids, open, onOpenChange, onSuccess }: BatchEditDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<HotelStatus | 'reserved' | 'no_change'>('no_change');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ids.length) return;

    setIsLoading(true);
    try {
      const updates: Partial<HotelFormData> = {};
      
      if (status !== 'no_change') updates.status = status as HotelStatus;

      await updateHotelBatch(ids, updates);
      
      toast.success(`Updated ${ids.length} reservations`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Failed to update reservations');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit {ids.length} Reservations</DialogTitle>
          <DialogDescription>
            Changes made here will apply to all selected guests. Leave fields blank to keep existing values.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select 
                value={status} 
                onValueChange={(val) => setStatus(val as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No Change" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_change">No Change</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || status === 'no_change'}>
              {isLoading ? 'Saving...' : 'Apply Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
