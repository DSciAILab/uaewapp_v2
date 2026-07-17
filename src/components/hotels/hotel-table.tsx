'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Hotel, HotelStatus } from '@/types/hotel';
import { HotelDivergenceBadge } from './hotel-divergence-badge';
import { BatchEditDialog } from './batch-edit-dialog';
import { HotelApprovalDialog } from './hotel-approval-dialog';
import { calculateNights } from '@/lib/utils/hotel-calculations';
import { deleteHotel, updateHotelStatus } from '@/lib/services/hotel-service';
import {
  getFightCardPositions,
  type EnrollmentIdentity,
  type FightCardPosition,
} from '@/lib/services/fight-card-positions';
import {
  FighterAvatar,
  FighterIdentity,
  FightOrderCell,
  FIGHT_ORDER_CELL_CLASS,
  FIGHT_ORDER_HEAD_CLASS,
  SortableHead,
  compareValues,
  nextSort,
  type SortState,
} from '@/components/fighters/fighter-identity';
import { useFightCard, type CardPerson } from '@/hooks/use-fight-card'
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getFighterPhotoUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

type SortKey =
  | 'order'
  | 'guest'
  | 'checkin'
  | 'checkout'
  | 'nights'
  | 'room'
  | 'reference'
  | 'status'
  | 'divergence';

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

/** What the Status cell actually reads — a pending row with no booking is an action, not a state. */
const statusLabel = (hotel: Hotel) =>
  hotel.status === 'pending' && !hotel.reservation_number
    ? 'Action Needed'
    : statusConfig[hotel.status]?.label || hotel.status;

export function HotelTable({ hotels, eventDates, onEdit, onRefresh }: HotelTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [approvalHotel, setApprovalHotel] = useState<Hotel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [sort, setSort] = useState<SortState<SortKey>>({ key: 'order', dir: 'asc' });

  const { positions } = useFightCard(
    useMemo(
      () =>
        hotels.map((h) => ({
          eventId: h.enrolled?.event_id,
          enrollmentId: h.enrolled?.id ?? '',
          fullName: h.enrolled?.person?.compiled_name ?? '',
        })),
      [hotels]
    )
  );

  const orderOf = (hotel: Hotel) => positions.get(hotel.enrolled?.id ?? '')?.fightOrder ?? null;

  const onSort = (key: SortKey) => setSort((prev) => nextSort(prev, key));

  const sortedHotels = useMemo(() => {
    const value = (hotel: Hotel): unknown => {
      switch (sort.key) {
        case 'order': return orderOf(hotel);
        case 'guest': return hotel.enrolled?.person?.compiled_name;
        case 'checkin': return hotel.checkin_date;
        case 'checkout': return hotel.checkout_date;
        case 'nights': return calculateNights(hotel.checkin_date || '', hotel.checkout_date || '');
        case 'room': return `${hotel.room_type || ''} ${hotel.room_number || ''}`.trim();
        case 'reference': return hotel.reservation_number;
        case 'status': return statusLabel(hotel);
        case 'divergence': return hotel.has_divergence ? (hotel.divergence_approved ? 1 : 0) : 2;
      }
    };
    const out = [...hotels].sort((a, b) => compareValues(value(a), value(b)));
    return sort.dir === 'asc' ? out : out.reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotels, sort, positions]);

  // Roommates: reservations sharing the same room_number are in the same room.
  const roommatesByRoom = new Map<string, string[]>();
  for (const h of hotels) {
    if (!h.room_number) continue;
    const name = h.enrolled?.person?.compiled_name;
    if (!name) continue;
    const list = roommatesByRoom.get(h.room_number) || [];
    list.push(name);
    roommatesByRoom.set(h.room_number, list);
  }

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
    try {
      await updateHotelStatus(hotelId, status, eventDates);
      toast.success(`Status updated to ${status}`);
      onRefresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to update status');
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
                <SortableHead column="order" label="#" sort={sort} onSort={onSort} className={FIGHT_ORDER_HEAD_CLASS} center />
                <TableHead className="w-[80px] text-center">Photo</TableHead>
                <SortableHead column="guest" label="Guest" sort={sort} onSort={onSort} className="min-w-[240px]" />
                <SortableHead column="checkin" label="Check-in" sort={sort} onSort={onSort} />
                <SortableHead column="checkout" label="Check-out" sort={sort} onSort={onSort} />
                <SortableHead column="nights" label="Nights" sort={sort} onSort={onSort} />
                <SortableHead column="room" label="Room" sort={sort} onSort={onSort} />
                <SortableHead column="reference" label="Booking Ref" sort={sort} onSort={onSort} />
                <SortableHead column="status" label="Status" sort={sort} onSort={onSort} />
                <SortableHead column="divergence" label="Divergence" sort={sort} onSort={onSort} />
                <TableHead className="w-[70px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedHotels.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    No hotel reservations found
                    </TableCell>
                </TableRow>
                ) : (
                sortedHotels.map((hotel) => {
                    const isSelected = selectedIds.has(hotel.id);
                    const nights = calculateNights(hotel.checkin_date || '', hotel.checkout_date || '');
                    const guestName = hotel.enrolled?.person?.compiled_name || '';
                    const roleName = hotel.enrolled?.person?.role?.name || (hotel.enrolled as any)?.role?.name;

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

                        <TableCell className={FIGHT_ORDER_CELL_CLASS}>
                          <FightOrderCell order={orderOf(hotel)} />
                        </TableCell>

                        <TableCell className="text-center p-2">
                          <div className="flex justify-center">
                            <FighterAvatar
                              name={guestName}
                              photoUrl={getFighterPhotoUrl(hotel.enrolled?.person?.appadmin_fighter_id)}
                              corner={positions.get(hotel.enrolled?.id ?? '')?.corner}
                            />
                          </div>
                        </TableCell>

                        <TableCell>
                          <FighterIdentity
                            name={guestName}
                            fighterId={hotel.enrolled?.person?.appadmin_fighter_id}
                            eventName={hotel.enrolled?.person?.event_name ?? null}
                            subtitle={
                              roleName ? (
                                <span className="text-[10px] text-muted-foreground uppercase tracking-tight truncate">
                                  {roleName}
                                </span>
                              ) : undefined
                            }
                          />
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
                          {hotel.room_type || hotel.room_number || hotel.extra_bed ? (
                            <div className="flex flex-col gap-0.5 min-w-[110px]">
                              <span className="text-xs font-medium capitalize">
                                {hotel.room_type || '-'}
                                {hotel.room_number && <span className="font-mono ml-1">· {hotel.room_number}</span>}
                                {hotel.extra_bed && <span className="ml-1 text-amber-500">+bed</span>}
                              </span>
                              {hotel.room_number && (roommatesByRoom.get(hotel.room_number)?.length || 0) > 1 && (
                                <span
                                  className="text-[10px] text-muted-foreground truncate max-w-[160px]"
                                  title={roommatesByRoom.get(hotel.room_number)!.join(', ')}
                                >
                                  with {roommatesByRoom.get(hotel.room_number)!
                                    .filter(n => n !== hotel.enrolled?.person?.compiled_name)
                                    .join(', ') || '—'}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                           <span className="text-xs font-mono bg-muted/30 px-2 py-1 rounded border">
                              {hotel.reservation_number || '-'}
                           </span>
                        </TableCell>
                        <TableCell>
                        <Badge variant="outline" className={cn("font-bold text-[10px] uppercase", statusConfig[hotel.status]?.className || 'bg-gray-100')}>
                            {statusLabel(hotel)}
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

/* ---------- Fight card lookup ---------- */

