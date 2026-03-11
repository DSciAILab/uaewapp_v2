'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Car, PlaneLanding, PlaneTakeoff } from 'lucide-react';
import { LogisticsRow } from '@/types/pre-event';
import { ChecklistStatus } from './checklist-status';
import { EventCar, CarPassengerFormData } from '@/types/transport';
import { assignPassenger, removePassenger, getEventCars } from '@/lib/services/transport-service';
import { toast } from 'sonner';

interface LogisticsTableProps {
  data: LogisticsRow[];
  cars: EventCar[];
  eventId: string;
  onRefresh: () => void;
}

export function LogisticsTable({ data, cars, eventId, onRefresh }: LogisticsTableProps) {
  const [search, setSearch] = useState('');

  const filteredData = data.filter(row => 
    row.compiled_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleTransportAssign = async (enrolledId: string, carId: string, type: 'arrival' | 'departure') => {
    try {
      // If "none", remove assignment if exists? 
      // Current basic implementation assumes adding/switching.
      // Ideally we check if they already have an assignment of that type and remove it first or update.
      // For MVP: Simplest flow -> Assign.
      
      const formData: CarPassengerFormData = {
        enrolled_id: enrolledId,
        transport_type: type,
        notes: 'Assigned from Logistics Board'
      };
      
      await assignPassenger(carId, formData);
      toast.success('Transport assigned');
      onRefresh();
    } catch (error) {
      toast.error('Failed to assign transport');
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Filter athletes..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[200px]">Athlete</TableHead>
              <TableHead className="text-center w-[50px] bg-blue-50/50">Blood</TableHead>
              <TableHead className="text-center w-[50px] bg-blue-50/50">Med</TableHead>
              <TableHead className="text-center w-[50px] bg-blue-50/50">Docs</TableHead>
              <TableHead className="text-center w-[50px]">Music</TableHead>
              <TableHead className="text-center w-[50px]">Kit</TableHead>
              <TableHead className="text-center w-[50px]">Wght</TableHead>
              <TableHead className="w-[180px] bg-slate-50/50 border-l border-r border-slate-200/60 text-center">
                 <div className="flex items-center justify-center gap-2">
                    <PlaneLanding className="h-4 w-4 text-emerald-600" /> Arrival
                 </div>
              </TableHead>
              <TableHead className="w-[180px] bg-slate-50/50 text-center">
                 <div className="flex items-center justify-center gap-2">
                    <PlaneTakeoff className="h-4 w-4 text-blue-600" /> Departure
                 </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row) => (
              <TableRow key={row.enrolled_id} className="hover:bg-muted/30">
                <TableCell className="font-medium">
                  <div>{row.compiled_name}</div>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1">{row.role?.name || (typeof row.role === 'string' ? row.role : '')}</Badge>
                </TableCell>
                
                <TableCell className="text-center bg-blue-50/30">
                  <div className="flex justify-center"><ChecklistStatus status={row.checklist.blood_test} type="blood" /></div>
                </TableCell>
                <TableCell className="text-center bg-blue-50/30">
                  <div className="flex justify-center"><ChecklistStatus status={row.checklist.medical_exam} type="medical" /></div>
                </TableCell>
                <TableCell className="text-center bg-blue-50/30">
                  <div className="flex justify-center"><ChecklistStatus status={row.checklist.documents} type="docs" /></div>
                </TableCell>
                
                <TableCell className="text-center">
                  <div className="flex justify-center"><ChecklistStatus status={row.checklist.music} type="music" /></div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center"><ChecklistStatus status={row.checklist.uniform} type="uniform" /></div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center"><ChecklistStatus status={row.checklist.weight} type="weight" /></div>
                </TableCell>

                <TableCell className="bg-slate-50/30 border-l border-r border-slate-200/60 p-2">
                    {row.transport.arrival_car_id ? (
                        <div className="flex items-center gap-2 justify-center">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                <Car className="h-3 w-3 mr-1" />
                                Car {row.transport.arrival_car_number}
                            </Badge>
                        </div>
                    ) : (
                        <Select onValueChange={(val) => handleTransportAssign(row.enrolled_id, val, 'arrival')}>
                            <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue placeholder="Assign Car" />
                            </SelectTrigger>
                            <SelectContent>
                                {cars.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs">
                                        Car {c.car_number} ({c.capacity} seats)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </TableCell>

                <TableCell className="bg-slate-50/30 p-2">
                    {row.transport.departure_car_id ? (
                        <div className="flex items-center gap-2 justify-center">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <Car className="h-3 w-3 mr-1" />
                                Car {row.transport.departure_car_number}
                            </Badge>
                        </div>
                    ) : (
                        <Select onValueChange={(val) => handleTransportAssign(row.enrolled_id, val, 'departure')}>
                            <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue placeholder="Assign Car" />
                            </SelectTrigger>
                            <SelectContent>
                                {cars.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs">
                                        Car {c.car_number} ({c.capacity} seats)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </TableCell>
              </TableRow>
            ))}
            {filteredData.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No athletes found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
