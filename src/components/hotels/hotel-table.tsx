'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle, Eye, UserCheck, Key, Users, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { Hotel, HotelStatus, HotelFormData } from '@/types/hotel';
import { HotelDivergenceBadge } from './hotel-divergence-badge';
import { BatchEditDialog } from './batch-edit-dialog';
import { HotelApprovalDialog } from './hotel-approval-dialog';
import { calculateNights } from '@/lib/utils/hotel-calculations';
import { deleteHotel, updateHotelStatus, updateHotelBatch, checkInGuest, checkOutGuest } from '@/lib/services/hotel-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface HotelTableProps {
  hotels: Hotel[];
  eventDates?: { event_date: string; event_end_date: string };
  onEdit: (hotel: Hotel) => void;
  onRefresh: () => void;
}

const statusConfig: Record<HotelStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200' },
  confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200' },
};

export function HotelTable({ hotels, eventDates, onEdit, onRefresh }: HotelTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [approvalHotel, setApprovalHotel] = useState<Hotel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedHotels = [...hotels].sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aValue: any = '';
    let bValue: any = '';

    switch (sortConfig.key) {
      case 'guest':
        aValue = a.enrolled?.person?.full_name || '';
        bValue = b.enrolled?.person?.full_name || '';
        break;
      case 'room':
        aValue = a.room_number || '';
        bValue = b.room_number || '';
        break;
      case 'dates':
        aValue = a.actual_checkin || '';
        bValue = b.actual_checkin || '';
        break;
      case 'status':
        aValue = a.status || '';
        bValue = b.status || '';
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(hotels.map(h => h.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  const handleBatchCheckIn = async () => {
    if (selectedIds.size === 0) return;
    try {
      await Promise.all(Array.from(selectedIds).map(id => checkInGuest(id)));
      toast.success(`${selectedIds.size} guests checked in`);
      setSelectedIds(new Set());
      onRefresh();
    } catch (error) {
       toast.error('Failed to check in guests');
    }
  };

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
    setUpdatingStatusId(hotelId);
    try {
      await updateHotelStatus(hotelId, status, eventDates);
      toast.success(`Status updated to ${status}`);
      onRefresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to update status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleCheckInToggle = async (hotel: Hotel) => {
      try {
          if (hotel.checked_in_at) {
              await checkOutGuest(hotel.id);
              toast.success('Guest checked out');
          } else {
              await checkInGuest(hotel.id);
              toast.success('Guest checked in');
          }
          onRefresh();
      } catch (e) {
          toast.error('Failed to update check-in status');
      }
  };

  return (
    <>
      <div className="space-y-4">
        {selectedIds.size > 0 && (
            <div className="bg-muted p-4 rounded-lg flex items-center gap-4 justify-between animate-in fade-in slide-in-from-top-2">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <div className="flex items-center gap-2">
                     <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>Cancel</Button>
                     <Button size="sm" onClick={handleBatchCheckIn}>
                        <UserCheck className="w-4 h-4 mr-2" />
                        Check In Selected
                     </Button>
                     {/* More batch actions to come */}
                </div>
            </div>
        )}

        <div className="rounded-md border bg-card">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[40px]">
                    <Checkbox 
                        checked={hotels.length > 0 && selectedIds.size === hotels.length}
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    />
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('guest')}>
                    <div className="flex items-center gap-2">
                        Guest <ArrowUpDown className="h-3 w-3" />
                    </div>
                </TableHead>
                {/* Hotel Column Removed */}
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('room')}>
                    <div className="flex items-center gap-2">
                        Room <ArrowUpDown className="h-3 w-3" />
                    </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('dates')}>
                    <div className="flex items-center gap-2">
                        Dates <ArrowUpDown className="h-3 w-3" />
                    </div>
                </TableHead>
                <TableHead>Nights</TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-2">
                        Status <ArrowUpDown className="h-3 w-3" />
                    </div>
                </TableHead>
                <TableHead>Divergence</TableHead>
                <TableHead className="w-[70px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedHotels.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hotel reservations found
                    </TableCell>
                </TableRow>
                ) : (
                sortedHotels.map((hotel) => {
                    const isSelected = selectedIds.has(hotel.id);
                    const nights = calculateNights(hotel.actual_checkin, hotel.actual_checkout);
                    
                    return (
                    <TableRow key={hotel.id} data-state={isSelected ? 'selected' : undefined}>
                        <TableCell>
                            <Checkbox 
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectOne(hotel.id, !!checked)}
                            />
                        </TableCell>
                        <TableCell>
                        <div className="flex items-center gap-2">
                            <div>
                                <p className="font-medium flex items-center gap-2">
                                    {hotel.enrolled?.person?.full_name}
                                    {hotel.checked_in_at && (
                                        <Badge variant="secondary" className="h-5 px-1 bg-green-100 text-green-700 hover:bg-green-100 gap-1 rounded-full">
                                            <CheckCircle className="w-3 h-3" />
                                            <span className="text-[10px] font-bold">IN</span>
                                        </Badge>
                                    )}
                                </p>
                                <p className="text-sm text-muted-foreground">{hotel.enrolled?.person?.role}</p>
                            </div>
                        </div>
                        </TableCell>
                        {/* Hotel Cell Removed */}
                        <TableCell>
                            {hotel.room_number ? (
                                <div className="flex items-center gap-1 font-mono text-sm">
                                    <Key className="w-3 h-3 text-muted-foreground" />
                                    {hotel.room_number}
                                </div>
                            ) : <span className="text-xs text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                        <div className="text-sm">
                            {hotel.actual_checkin ? (
                                <p><span className="text-muted-foreground mr-1">In:</span> {format(new Date(hotel.actual_checkin), 'MMM dd')}</p>
                            ) : <span className="text-xs text-muted-foreground italic">TBD</span>}
                            {hotel.actual_checkout ? (
                                <p><span className="text-muted-foreground mr-1">Out:</span> {format(new Date(hotel.actual_checkout), 'MMM dd')}</p>
                            ) : <span className="text-xs text-muted-foreground italic">TBD</span>}
                        </div>
                        </TableCell>
                        <TableCell>{nights}</TableCell>
                        <TableCell>
                        <Badge variant="outline" className={statusConfig[hotel.status]?.className || 'bg-gray-100'}>
                            {hotel.status === 'pending' && (hotel.hotel_name === 'Pending Booking' || hotel.hotel_name === 'TBD') 
                                ? 'Action Needed' 
                                : statusConfig[hotel.status]?.label || hotel.status}
                        </Badge>
                        </TableCell>
                        <TableCell>
                        {hotel.has_divergence && hotel.primary_divergence_type ? (
                            <div 
                            className="cursor-pointer inline-block" 
                            onClick={() => setApprovalHotel(hotel)}
                            >
                            <HotelDivergenceBadge
                                divergenceType={hotel.primary_divergence_type}
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
                            <DropdownMenuItem onClick={() => handleCheckInToggle(hotel)}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                {hotel.checked_in_at ? 'Undo Check-in' : 'Check In'}
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
      </div>

      <BatchEditDialog 
        ids={Array.from(selectedIds)}
        open={showBatchEdit}
        onOpenChange={setShowBatchEdit}
        onSuccess={() => {
            setSelectedIds(new Set());
            onRefresh();
        }}
      />

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
