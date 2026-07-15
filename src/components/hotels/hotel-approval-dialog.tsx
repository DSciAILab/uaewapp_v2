'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Hotel } from '@/types/hotel';
import { formatDivergenceLabel, calculateNights } from '@/lib/utils/hotel-calculations';
import { approveDivergence, rejectDivergence } from '@/lib/services/hotel-service';
import { useUser } from '@/hooks/use-user';
import { toast } from 'sonner';

interface HotelApprovalDialogProps {
  hotel: Hotel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprovalChange: () => void;
}

export function HotelApprovalDialog({ hotel, open, onOpenChange, onApprovalChange }: HotelApprovalDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();

  const calculatedNights = calculateNights(hotel.suggested_checkin_date || '', hotel.suggested_checkout_date || '');
  const actualNights = calculateNights(hotel.checkin_date || '', hotel.checkout_date || '');
  const extraNights = actualNights - calculatedNights;

  const handleApprove = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      await approveDivergence(hotel.id, user.id);
      toast.success('Divergence approved');
      onApprovalChange();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to approve divergence');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await rejectDivergence(hotel.id);
      toast.success('Approval revoked');
      onApprovalChange();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to revoke approval');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Hotel Divergence Review</DialogTitle>
          <DialogDescription>Review and approve or reject the hotel date divergence</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Guest</span>
            <span className="font-medium">{hotel.enrolled?.person?.compiled_name}</span>
          </div>


          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Divergence</span>
            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
              {hotel.divergence_type && hotel.divergence_type.length > 0 && formatDivergenceLabel(hotel.divergence_type[0] as any)}
            </Badge>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Date Comparison</h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Calculated Check-in</p>
                <p>{hotel.suggested_checkin_date ? format(new Date(hotel.suggested_checkin_date), 'MMM dd, yyyy') : '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Actual Check-in</p>
                <p className="font-medium">{hotel.checkin_date ? format(new Date(hotel.checkin_date), 'MMM dd, yyyy') : '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Calculated Check-out</p>
                <p>{hotel.suggested_checkout_date ? format(new Date(hotel.suggested_checkout_date), 'MMM dd, yyyy') : '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Actual Check-out</p>
                <p className="font-medium">{hotel.checkout_date ? format(new Date(hotel.checkout_date), 'MMM dd, yyyy') : '-'}</p>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected Nights</span>
                <span>{calculatedNights}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Nights</span>
                <span className="font-medium">{actualNights}</span>
              </div>
              {extraNights > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Extra Nights</span>
                  <span className="font-medium">+{extraNights}</span>
                </div>
              )}
            </div>
          </div>


          {hotel.divergence_approved && hotel.divergence_approved_at && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Approved on {format(new Date(hotel.divergence_approved_at), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {hotel.divergence_approved ? (
            <Button variant="outline" onClick={handleReject} disabled={isLoading}>
              Revoke Approval
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={isLoading}>
                Approve Divergence
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
