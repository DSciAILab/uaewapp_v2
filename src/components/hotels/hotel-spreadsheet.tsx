'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hotel, HotelStatus, HotelFormData } from '@/types/hotel';
import { updateHotelBatch, checkInGuest, checkOutGuest } from '@/lib/services/hotel-service';
import { toast } from 'sonner';
import { CheckCircle, XCircle, UserCheck, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface HotelSpreadsheetProps {
  hotels: Hotel[];
  onRefresh: () => void;
}

export function HotelSpreadsheet({ hotels, onRefresh }: HotelSpreadsheetProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const handleUpdate = async (id: string, field: keyof HotelFormData, value: any) => {
    setLoadingMap(prev => ({ ...prev, [id]: true }));
    try {
        // Optimistic update could go here, but for now specific loading state
        await updateHotelBatch([id], { [field]: value });
        toast.success('Saved');
        onRefresh();
    } catch (error) {
        toast.error('Failed to save change');
    } finally {
        setLoadingMap(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleCheckInToggle = async (hotel: Hotel, e: React.MouseEvent) => {
      e.stopPropagation();
      setLoadingMap(prev => ({ ...prev, [hotel.id]: true }));
      try {
          if (hotel.checked_in_at) {
              await checkOutGuest(hotel.id);
          } else {
              await checkInGuest(hotel.id);
          }
          onRefresh();
      } catch {
          toast.error('Failed to toggle check-in');
      } finally {
        setLoadingMap(prev => ({ ...prev, [hotel.id]: false }));
      }
  }

  return (
    <div className="rounded-md border bg-card overflow-x-auto">
      <Table className="whitespace-nowrap">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Check-in</TableHead>
            <TableHead>Guest</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead className="w-[100px]">Room</TableHead>
            <TableHead className="w-[100px]">Type</TableHead>
            {/* Future: Dates columns */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {hotels.map((hotel) => {
            const isLoading = loadingMap[hotel.id];
            
            return (
              <TableRow key={hotel.id} className="hover:bg-muted/50">
                 <TableCell>
                    <Button 
                        variant={hotel.checked_in_at ? "default" : "outline"} 
                        size="icon" 
                        className={`h-8 w-8 ${hotel.checked_in_at ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        onClick={(e) => handleCheckInToggle(hotel, e)}
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                         hotel.checked_in_at ? <UserCheck className="h-4 w-4" /> : <div className="h-3 w-3 rounded-full border border-current" />
                        }
                    </Button>
                 </TableCell>

                <TableCell className="font-medium">
                  {hotel.enrolled?.person?.full_name}
                </TableCell>
                
                <TableCell className="text-muted-foreground text-sm">
                  {hotel.enrolled?.person?.role}
                </TableCell>

                <TableCell className="p-1">
                  <Select 
                    defaultValue={hotel.status} 
                    onValueChange={(val) => handleUpdate(hotel.id, 'status', val)}
                  >
                    <SelectTrigger className="h-8 border-transparent hover:border-input focus:border-input bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>

                <TableCell className="p-1">
                   <Input 
                      defaultValue={hotel.room_number || ''}
                      className="h-8 border-transparent hover:border-input focus:border-input bg-transparent font-mono text-center"
                      placeholder="Room"
                      onBlur={(e) => {
                          if (e.target.value !== (hotel.room_number || '')) {
                              handleUpdate(hotel.id, 'room_number', e.target.value);
                          }
                      }}
                   />
                </TableCell>
                
                 <TableCell className="p-1">
                   <Input 
                      defaultValue={hotel.room_type || ''}
                      className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-xs"
                      placeholder="Type"
                      onBlur={(e) => {
                          if (e.target.value !== (hotel.room_type || '')) {
                              handleUpdate(hotel.id, 'room_type', e.target.value);
                          }
                      }}
                   />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
