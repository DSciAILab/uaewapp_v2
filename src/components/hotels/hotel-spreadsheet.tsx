'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hotel, HotelStatus, HotelFormData } from '@/types/hotel';
import { updateHotelBatch } from '@/lib/services/hotel-service';
import { toast } from 'sonner';
import { CheckCircle, XCircle, UserCheck, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface HotelSpreadsheetProps {
  hotels: Hotel[];
  onRefresh: () => void;
}

export function HotelSpreadsheet({ hotels, onRefresh }: HotelSpreadsheetProps) {
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const handleUpdate = async (id: string, field: keyof HotelFormData, value: any) => {
    setLoadingMap(prev => ({ ...prev, [id]: true }));
    try {
        await updateHotelBatch([id], { [field]: value });
        toast.success('Saved');
        onRefresh();
    } catch (error) {
        toast.error('Failed to save change');
    } finally {
        setLoadingMap(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="rounded-md border bg-card overflow-x-auto">
      <Table className="whitespace-nowrap">
        <TableHeader>
          <TableRow>
            <TableHead>Guest</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead className="w-[150px]">Check-in Date</TableHead>
            <TableHead className="w-[150px]">Check-out Date</TableHead>
            <TableHead>Booking Ref</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hotels.map((hotel) => {
            const isLoading = loadingMap[hotel.id];
            
            // Format dates for input (YYYY-MM-DD)
            const checkinVal = hotel.checkin_date ? format(parseISO(hotel.checkin_date), 'yyyy-MM-dd') : '';
            const checkoutVal = hotel.checkout_date ? format(parseISO(hotel.checkout_date), 'yyyy-MM-dd') : '';

            return (
              <TableRow key={hotel.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  {hotel.enrolled?.person?.compiled_name}
                </TableCell>
                
                <TableCell className="text-muted-foreground text-sm">
                  {hotel.enrolled?.person?.role?.name || (hotel.enrolled as any)?.role?.name}
                </TableCell>

                <TableCell className="p-1">
                  <Select 
                    defaultValue={hotel.status} 
                    onValueChange={(val) => handleUpdate(hotel.id, 'status', val)}
                  >
                    <SelectTrigger className="h-8 border-transparent hover:border-input focus:border-input bg-transparent">
                      {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>

                <TableCell className="p-1">
                   <Input 
                      type="date"
                      defaultValue={checkinVal}
                      className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-xs"
                      onBlur={(e) => {
                          if (e.target.value && e.target.value !== checkinVal) {
                              handleUpdate(hotel.id, 'checkin_date', e.target.value);
                          }
                      }}
                   />
                </TableCell>

                <TableCell className="p-1">
                   <Input 
                      type="date"
                      defaultValue={checkoutVal}
                      className="h-8 border-transparent hover:border-input focus:border-input bg-transparent text-xs"
                      onBlur={(e) => {
                          if (e.target.value && e.target.value !== checkoutVal) {
                              handleUpdate(hotel.id, 'checkout_date', e.target.value);
                          }
                      }}
                   />
                </TableCell>

                <TableCell className="p-1">
                   <Input 
                      defaultValue={hotel.reservation_number || ''}
                      className="h-8 border-transparent hover:border-input focus:border-input bg-transparent font-mono text-center text-xs"
                      placeholder="Ref"
                      onBlur={(e) => {
                          if (e.target.value !== (hotel.reservation_number || '')) {
                              handleUpdate(hotel.id, 'reservation_number', e.target.value);
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
