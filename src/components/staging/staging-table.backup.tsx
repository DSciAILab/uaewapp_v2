
'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Bus, Clock, Users, CheckCircle2, Circle } from 'lucide-react';
import { StagingRow } from '@/types/staging';
import { updateStagingItem } from '@/lib/services/staging-service';
import { StagingStatusCell } from './staging-status-cell';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StagingTableProps {
  data: StagingRow[];
  eventId: string;
}

export function StagingTable({ data: initialData, eventId }: StagingTableProps) {
  const [data, setData] = useState<StagingRow[]>(initialData);
  const [search, setSearch] = useState('');

  const filteredData = data.filter(row => 
    row.person.full_name.toLowerCase().includes(search.toLowerCase()) ||
    row.person.fighter_id?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdate = async (enrolledId: string, field: keyof StagingRow, value: any) => {
    // Optimistic update
    setData(prev => prev.map(row => 
      row.enrolled_id === enrolledId && row.event_id === eventId 
        ? { ...row, [field]: value } 
        : row
    ));

    try {
      await updateStagingItem(eventId, enrolledId, { [field]: value });
    } catch (error) {
      toast.error('Failed to save update');
      console.error(error);
    }
  };

  const handleToggleComplete = async (enrolledId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Optimistic update
    setData(prev => prev.map(row => 
      row.enrolled_id === enrolledId 
        ? { ...row, is_completed: newStatus }
        : row
    ));

    try {
        await updateStagingItem(eventId, enrolledId, { is_completed: newStatus });
        if (newStatus) {
            toast.success('Check-in completed');
        }
    } catch (error) {
        toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Filter by name or ID..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px] text-center bg-yellow-50/50">Order</TableHead>
              <TableHead className="w-[80px]">Photo</TableHead>
              <TableHead className="w-[180px]">Athlete</TableHead>
              <TableHead className="w-[150px] bg-blue-50/50">
                <div className="flex items-center gap-1"><Bus className="h-3 w-3" /> Bus Info</div>
              </TableHead>
              {/* Checks */}
              <TableHead className="text-center w-[120px]">Passport</TableHead>
              <TableHead className="text-center w-[120px]">Nails</TableHead>
              <TableHead className="text-center w-[120px]">Cup</TableHead>
              <TableHead className="text-center w-[120px]">Mouthguard</TableHead>
              {/* Coaches */}
              <TableHead className="w-[140px] text-center">
                <div className="flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Coaches</div>
              </TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-center w-[80px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row) => (
              <TableRow 
                key={row.enrolled_id} 
                className={cn(
                  "hover:bg-muted/30 transition-colors",
                  row.is_completed ? "bg-emerald-50/60 hover:bg-emerald-50/80" : ""
                )}
              >
                {/* Call Order */}
                <TableCell className="p-2 text-center bg-yellow-50/20">
                   <div className="flex justify-center">
                    <Input 
                        type="number"
                        className="h-8 w-14 text-center p-1 bg-white border-yellow-200"
                        placeholder="#"
                        value={row.call_order || ''}
                        onChange={(e) => handleUpdate(row.enrolled_id, 'call_order', e.target.value ? parseInt(e.target.value) : null)}
                    />
                   </div>
                </TableCell>

                {/* Photo */}
                <TableCell>
                  <Avatar className="h-10 w-10 border cursor-pointer hover:scale-110 transition-transform">
                    <AvatarImage src={row.person.photo_url || ''} className="object-cover" />
                    <AvatarFallback>{row.person.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </TableCell>
                
                {/* Identity */}
                <TableCell>
                  <div className="font-semibold text-sm">{row.person.full_name}</div>
                  <div className="text-xs text-muted-foreground">ID: {row.person.fighter_id || 'N/A'}</div>
                  <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{row.event_name}</div>
                </TableCell>

                {/* Bus Info - DENSE inputs */}
                <TableCell className="bg-blue-50/20 p-2">
                  <div className="flex flex-col gap-1">
                    <Input 
                      placeholder="Bus #" 
                      className="h-7 text-xs bg-white border-blue-200 focus-visible:ring-blue-400"
                      value={row.bus_number || ''}
                      onChange={(e) => handleUpdate(row.enrolled_id, 'bus_number', e.target.value)}
                    />
                    <div className="relative">
                      <Clock className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
                      <Input 
                        placeholder="Time" 
                        className="h-7 text-xs bg-white border-blue-200 pl-6 focus-visible:ring-blue-400"
                        value={row.bus_time || ''}
                        onChange={(e) => handleUpdate(row.enrolled_id, 'bus_time', e.target.value)}
                      />
                    </div>
                  </div>
                </TableCell>

                {/* Physical Checks */}
                <TableCell className="p-1">
                  <div className="flex justify-center">
                    <StagingStatusCell 
                      status={row.passport_status} 
                      onChange={(val) => handleUpdate(row.enrolled_id, 'passport_status', val)}
                    />
                  </div>
                </TableCell>
                <TableCell className="p-1">
                  <div className="flex justify-center">
                      <StagingStatusCell 
                      status={row.nails_status} 
                      onChange={(val) => handleUpdate(row.enrolled_id, 'nails_status', val)}
                    />
                  </div>
                </TableCell>
                <TableCell className="p-1">
                   <div className="flex justify-center">
                      <StagingStatusCell 
                      status={row.cup_status} 
                      onChange={(val) => handleUpdate(row.enrolled_id, 'cup_status', val)}
                    />
                   </div>
                </TableCell>
                 <TableCell className="p-1">
                   <div className="flex justify-center">
                      <StagingStatusCell 
                      status={row.mouthguard_status} 
                      onChange={(val) => handleUpdate(row.enrolled_id, 'mouthguard_status', val)}
                    />
                   </div>
                </TableCell>

                {/* Coaches */}
                <TableCell>
                  <div className="flex flex-col gap-2 text-xs">
                     <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Bus:</span>
                        <div className="flex items-center gap-1">
                           {[1, 2, 3].map(i => (
                             <div 
                               key={i}
                               className={cn(
                                 "h-3 w-3 rounded-full border cursor-pointer",
                                 i <= row.coaches_with_bus_count ? "bg-blue-500 border-blue-600" : "bg-transparent border-gray-300"
                               )}
                               onClick={() => handleUpdate(row.enrolled_id, 'coaches_with_bus_count', i === row.coaches_with_bus_count ? i - 1 : i)}
                             />
                           ))}
                        </div>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Creds:</span>
                        <div className="flex items-center gap-1">
                           {[1, 2, 3].map(i => (
                             <div 
                               key={i}
                               className={cn(
                                 "h-3 w-3 rounded-sm border cursor-pointer",
                                 i <= row.coaches_credentials_given ? "bg-emerald-500 border-emerald-600" : "bg-transparent border-gray-300"
                               )}
                               onClick={() => handleUpdate(row.enrolled_id, 'coaches_credentials_given', i === row.coaches_credentials_given ? i - 1 : i)}
                             />
                           ))}
                        </div>
                     </div>
                  </div>
                </TableCell>

                {/* Notes */}
                <TableCell>
                  <Textarea 
                    className="min-h-[60px] text-xs resize-none"
                    placeholder="Add notes..."
                    value={row.notes || ''}
                    onChange={(e) => handleUpdate(row.enrolled_id, 'notes', e.target.value)}
                  />
                </TableCell>

                {/* Status Button */}
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Button
                        variant={row.is_completed ? "default" : "outline"}
                        size="sm"
                        className={cn(
                        "h-8 w-8 p-0 rounded-full shadow-sm",
                        row.is_completed ? "bg-emerald-600 hover:bg-emerald-700" : "text-muted-foreground border-dashed"
                        )}
                        onClick={() => handleToggleComplete(row.enrolled_id, row.is_completed)}
                    >
                        {row.is_completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
