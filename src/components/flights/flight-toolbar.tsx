'use client';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Filter } from "lucide-react";
import type { Event } from "@/types/database";

interface FlightToolbarProps {
  events: Event[];
  selectedEventId: string;
  onEventChange: (id: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusValue: string;
  onStatusChange: (value: string) => void;
  onAddClick: () => void;
  canEdit: boolean;
}

export function FlightToolbar({
  events,
  selectedEventId,
  onEventChange,
  searchValue,
  onSearchChange,
  statusValue,
  onStatusChange,
  onAddClick,
  canEdit,
}: FlightToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
      <div className="w-full md:w-[280px]">
        <Select value={selectedEventId} onValueChange={onEventChange}>
          <SelectTrigger className="h-10 bg-background/50">
            <SelectValue placeholder="Select Event" />
          </SelectTrigger>
          <SelectContent>
            {events.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                {event.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 w-full relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search flights, people, airports..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10 bg-background/50"
          />
        </div>
      </div>

      <div className="flex gap-2 w-full md:w-auto">
        <Select value={statusValue} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full md:w-[150px] h-10 bg-background/50">
             <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="All Status" />
             </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {canEdit && (
          <Button onClick={onAddClick} className="h-10 px-6 font-medium shadow-md">
            <Plus className="mr-2 h-4 w-4" />
            New Flight
          </Button>
        )}
      </div>
    </div>
  );
}
