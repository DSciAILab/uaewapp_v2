'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Loader2, Save } from 'lucide-react';
import type { FlightWithEnrollment } from '@/lib/services/flights';
import type { FlightType } from '@/types/database';
import { formatDate } from '@/lib/utils';
import { updateFlight } from '@/lib/services/flights';
import { toast } from 'sonner';

interface FlightBatchGridProps {
  flights: FlightWithEnrollment[];
  onRefresh: () => void;
}

// Helper to safely parse dates
const safeDate = (dateStr?: string) => dateStr ? dateStr.split('T')[0] : '';
const safeTime = (timeStr?: string) => timeStr || '';

export function FlightBatchGrid({ flights, onRefresh }: FlightBatchGridProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [details, setDetails] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Initialize edit state when clicking a row
  const handleStartEdit = (flight: FlightWithEnrollment) => {
    if (editingId === flight.id) return;
    setEditingId(flight.id);
    setDetails({
      arrival_date: safeDate(flight.arrival_date),
      arrival_time: safeTime(flight.arrival_time),
      arrival_flight_number: flight.arrival_flight_number || '',
      arrival_airport: flight.arrival_airport || '',
      departure_date: safeDate(flight.departure_date),
      departure_time: safeTime(flight.departure_time),
      departure_flight_number: flight.departure_flight_number || '',
      departure_airport: flight.departure_airport || '',
      status: flight.status || 'pending',
      type: flight.type
    });
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
        await updateFlight(id, details);
        toast.success('Flight updated');
        setEditingId(null);
        onRefresh();
    } catch (error) {
        toast.error('Failed to save');
    } finally {
        setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setDetails((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Person</TableHead>
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead className="w-[140px]">Arr. Date</TableHead>
            <TableHead className="w-[100px]">Arr. Time</TableHead>
            <TableHead className="w-[120px]">Arr. Flight</TableHead>
            <TableHead className="w-[140px]">Dep. Date</TableHead>
            <TableHead className="w-[100px]">Dep. Time</TableHead>
            <TableHead className="w-[120px]">Dep. Flight</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[80px]">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flights.map((flight) => {
            const isEditing = editingId === flight.id;

            return (
              <TableRow key={flight.id} 
                className={isEditing ? "bg-muted/50" : "hover:bg-muted/20 cursor-pointer"}
                onClick={() => !isEditing && handleStartEdit(flight)}
              >
                <TableCell className="font-medium">
                    <div>{flight.enrollment?.person?.compiled_name}</div>
                    <div className="text-xs text-muted-foreground">{flight.enrollment?.person?.nationality}</div>
                </TableCell>
                <TableCell>
                    {isEditing ? (
                        <Select 
                            value={details.type} 
                            onValueChange={(val) => handleChange('type', val)}
                        >
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="arrival_only">Arrival</SelectItem>
                                <SelectItem value="departure_only">Departure</SelectItem>
                                <SelectItem value="full">Round Trip</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <Badge variant="outline">{flight.type}</Badge>
                    )}
                </TableCell>
                
                {/* Arrival Fields */}
                <TableCell>
                    {isEditing ? (
                        <Input 
                            type="date" 
                            className="h-8" 
                            value={details.arrival_date} 
                            onChange={(e) => handleChange('arrival_date', e.target.value)}
                            disabled={details.type === 'departure_only'}
                        />
                    ) : (
                        <span className={!flight.arrival_date ? "text-muted-foreground/30" : ""}>
                            {flight.arrival_date ? formatDate(flight.arrival_date) : '-'}
                        </span>
                    )}
                </TableCell>
                 <TableCell>
                    {isEditing ? (
                        <Input 
                            type="time" 
                            className="h-8" 
                            value={details.arrival_time} 
                            onChange={(e) => handleChange('arrival_time', e.target.value)}
                            disabled={details.type === 'departure_only'}
                        />
                    ) : (
                        flight.arrival_time || '-'
                    )}
                </TableCell>
                 <TableCell>
                    {isEditing ? (
                        <Input 
                            className="h-8 font-mono uppercase" 
                            value={details.arrival_flight_number}
                            placeholder="QR123" 
                            onChange={(e) => handleChange('arrival_flight_number', e.target.value)}
                            disabled={details.type === 'departure_only'}
                        />
                    ) : (
                        <span className="font-mono">{flight.arrival_flight_number || '-'}</span>
                    )}
                </TableCell>

                {/* Departure Fields */}
                 <TableCell>
                    {isEditing ? (
                        <Input 
                            type="date" 
                            className="h-8" 
                            value={details.departure_date} 
                            onChange={(e) => handleChange('departure_date', e.target.value)}
                            disabled={details.type === 'arrival_only'}
                        />
                    ) : (
                       <span className={!flight.departure_date ? "text-muted-foreground/30" : ""}>
                            {flight.departure_date ? formatDate(flight.departure_date) : '-'}
                        </span>
                    )}
                </TableCell>
                 <TableCell>
                    {isEditing ? (
                        <Input 
                            type="time" 
                            className="h-8" 
                            value={details.departure_time} 
                            onChange={(e) => handleChange('departure_time', e.target.value)}
                            disabled={details.type === 'arrival_only'}
                        />
                    ) : (
                        flight.departure_time || '-'
                    )}
                </TableCell>
                 <TableCell>
                    {isEditing ? (
                        <Input 
                            className="h-8 font-mono uppercase" 
                            value={details.departure_flight_number} 
                             placeholder="QR124"
                            onChange={(e) => handleChange('departure_flight_number', e.target.value)}
                            disabled={details.type === 'arrival_only'}
                        />
                    ) : (
                         <span className="font-mono">{flight.departure_flight_number || '-'}</span>
                    )}
                </TableCell>

                <TableCell>
                    {isEditing ? (
                        <Select 
                            value={details.status} 
                            onValueChange={(val) => handleChange('status', val)}
                        >
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="booked">Booked</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <Badge variant="secondary" className={
                             flight.status === 'confirmed' ? "bg-green-100 text-green-800" :
                             flight.status === 'cancelled' ? "bg-red-100 text-red-800" :
                             flight.status === 'booked' ? "bg-blue-100 text-blue-800" :
                             "bg-yellow-100 text-yellow-800"
                        }>
                            {flight.status}
                        </Badge>
                    )}
                </TableCell>

                <TableCell>
                    {isEditing && (
                        <Button 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); handleSave(flight.id); }}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </Button>
                    )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
