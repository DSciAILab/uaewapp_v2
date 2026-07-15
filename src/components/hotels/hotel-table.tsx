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
import { deleteHotel, updateHotelStatus, updateHotelBatch } from '@/lib/services/hotel-service';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFighterPhotoUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface HotelTableProps {
  hotels: Hotel[];
  eventDates?: { event_date: string; event_end_date: string };
  onEdit: (hotel: Hotel) => void;
  onRefresh: () => void;
}

const statusConfig: Record<HotelStatus | 'reserved', { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200' },
  reserved: { label: 'Reserved', className: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200' },
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
        aValue = a.enrolled?.person?.compiled_name || '';
        bValue = b.enrolled?.person?.compiled_name || '';
        break;
      case 'dates':
        aValue = a.checkin_date || '';
        bValue = b.checkin_date || '';
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


  return (
    <>
      <div className="space-y-4">
        {selectedIds.size > 0 && (
            <div className="bg-muted p-4 rounded-lg flex items-center gap-4 justify-between animate-in fade-in slide-in-from-top-2">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <div className="flex items-center gap-2">
                     <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>Cancel</Button>
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
                <TableHead className="w-[60px]">Photo</TableHead>
                <TableHead className="w-[120px]">Fighter ID</TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50 min-w-[200px]" onClick={() => handleSort('guest')}>
                    <div className="flex items-center gap-2">
                        Guest <ArrowUpDown className="h-3 w-3" />
                    </div>
                </TableHead>
                <TableHead className="min-w-[150px]">Event</TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('dates')}>
                    <div className="flex items-center gap-2">
                        Check-in <ArrowUpDown className="h-3 w-3" />
                    </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('dates')}>
                    <div className="flex items-center gap-2">
                        Check-out <ArrowUpDown className="h-3 w-3" />
                    </div>
                </TableHead>
                <TableHead>Nights</TableHead>
                <TableHead>Booking Ref</TableHead>
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
                    const nights = calculateNights(hotel.checkin_date || '', hotel.checkout_date || '');
                    
                    return (
                    <TableRow 
                        key={hotel.id} 
                        data-state={isSelected ? 'selected' : undefined}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => onEdit(hotel)}
                    >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectOne(hotel.id, !!checked)}
                            />
                        </TableCell>
                        <TableCell>
                          <Avatar className="h-10 w-10 border border-muted shadow-sm">
                            {hotel.enrolled?.person.appadmin_fighter_id && (
                              <AvatarImage 
                                src={getFighterPhotoUrl(hotel.enrolled.person.appadmin_fighter_id)} 
                                alt={hotel.enrolled.person.compiled_name} 
                              />
                            )}
                            <AvatarFallback className="text-xs font-bold bg-muted/50">
                              {hotel.enrolled?.person.compiled_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell>
                           {hotel.enrolled?.person.appadmin_fighter_id ? (
                            <Badge variant="outline" className="font-mono text-[10px] bg-background">
                              ID: {hotel.enrolled.person.appadmin_fighter_id}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs font-mono">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                              <p className="font-semibold flex items-center gap-2">
                                  {hotel.enrolled?.person?.compiled_name}
                              </p>
                              <p className="text-xs text-muted-foreground uppercase tracking-tight">{hotel.enrolled?.person?.role?.name || (hotel.enrolled as any)?.role?.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                           <span className="text-xs font-medium text-muted-foreground">{hotel.enrolled?.person.event_name || '-'}</span>
                        </TableCell>
                        <TableCell>
                           <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {hotel.checkin_date ? format(new Date(hotel.checkin_date), 'MMM dd, yyyy') : <span className="text-muted-foreground italic">TBD</span>}
                              </span>
                           </div>
                        </TableCell>
                        <TableCell>
                           <span className="text-sm font-medium">
                            {hotel.checkout_date ? format(new Date(hotel.checkout_date), 'MMM dd, yyyy') : <span className="text-muted-foreground italic">TBD</span>}
                           </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-bold text-xs">
                             {nights}
                          </Badge>
                        </TableCell>
                        <TableCell>
                           <span className="text-xs font-mono bg-muted/30 px-2 py-1 rounded border">
                              {hotel.reservation_number || '-'}
                           </span>
                        </TableCell>
                        <TableCell>
                        <Badge variant="outline" className={cn("font-bold text-[10px] uppercase", statusConfig[hotel.status]?.className || 'bg-gray-100')}>
                            {hotel.status === 'pending' && !hotel.reservation_number
                                ? 'Action Needed' 
                                : statusConfig[hotel.status]?.label || hotel.status}
                        </Badge>
                        </TableCell>
                        <TableCell>
                        {hotel.has_divergence && hotel.divergence_type && hotel.divergence_type.length > 0 ? (
                            <div 
                            className="inline-block" 
                            onClick={(e) => { e.stopPropagation(); setApprovalHotel(hotel); }}
                            >
                            <HotelDivergenceBadge
                                divergenceType={hotel.divergence_type[0] as any}
                                isApproved={hotel.divergence_approved || false}
                            />
                            </div>
                        ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                        )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
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
