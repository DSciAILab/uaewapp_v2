'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Hotel, HotelStatus } from '@/types/hotel';
import { HotelDivergenceBadge } from './hotel-divergence-badge';
import { HotelApprovalDialog } from './hotel-approval-dialog';
import { calculateNights } from '@/lib/utils/hotel-calculations';
import { deleteHotel, updateHotelStatus } from '@/lib/services/hotel-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface HotelTableProps {
  hotels: Hotel[];
  onEdit: (hotel: Hotel) => void;
  onRefresh: () => void;
}

const statusConfig: Record<HotelStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200' },
  confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200' },
};

export function HotelTable({ hotels, onEdit, onRefresh }: HotelTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [approvalHotel, setApprovalHotel] = useState<Hotel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    try {
      await deleteHotel(deleteId);
      toast.success('Hotel reservation deleted');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete reservation');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleStatusChange = async (hotelId: string, status: HotelStatus) => {
    try {
      await updateHotelStatus(hotelId, status);
      toast.success(`Status updated to ${status}`);
      onRefresh();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Hotel</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Nights</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Divergence</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hotels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hotel reservations found
                </TableCell>
              </TableRow>
            ) : (
              hotels.map((hotel) => {
                const nights = calculateNights(hotel.actual_checkin, hotel.actual_checkout);
                const statusInfo = statusConfig[hotel.status];

                return (
                  <TableRow key={hotel.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{hotel.enrolled?.person?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{hotel.enrolled?.person?.role}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{hotel.hotel_name}</p>
                        {hotel.room_type && <p className="text-sm text-muted-foreground">{hotel.room_type}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p><span className="text-muted-foreground mr-1">In:</span> {format(new Date(hotel.actual_checkin), 'MMM dd, yyyy')}</p>
                        <p><span className="text-muted-foreground mr-1">Out:</span> {format(new Date(hotel.actual_checkout), 'MMM dd, yyyy')}</p>
                      </div>
                    </TableCell>
                    <TableCell>{nights}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusInfo.className}>{statusInfo.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {hotel.has_divergence && hotel.divergence_type ? (
                        <div 
                          className="cursor-pointer inline-block" 
                          onClick={() => setApprovalHotel(hotel)}
                        >
                          <HotelDivergenceBadge
                            divergenceType={hotel.divergence_type}
                            isApproved={hotel.divergence_approved}
                            reason={hotel.divergence_reason}
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(hotel)}>
                            <Pencil className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          {hotel.has_divergence && (
                            <DropdownMenuItem onClick={() => setApprovalHotel(hotel)}>
                              <Eye className="mr-2 h-4 w-4" />Review Divergence
                            </DropdownMenuItem>
                          )}
                          {hotel.status !== 'confirmed' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(hotel.id, 'confirmed')}>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />Mark Confirmed
                            </DropdownMenuItem>
                          )}
                          {hotel.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(hotel.id, 'cancelled')}>
                              <XCircle className="mr-2 h-4 w-4 text-gray-600" />Mark Cancelled
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(hotel.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reservation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The hotel reservation will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {approvalHotel && (
        <HotelApprovalDialog
          hotel={approvalHotel}
          open={!!approvalHotel}
          onOpenChange={(open) => !open && setApprovalHotel(null)}
          onApprovalChange={onRefresh}
        />
      )}
    </>
  );
}
