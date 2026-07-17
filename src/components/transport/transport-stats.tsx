'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Car, User, LayoutList, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransportStatsProps {
  stats: {
    total_cars: number;
    total_drivers: number;
    active_drivers: number;
    assigned_cars: number;
    /** Sum of mma_event_cars.capacity — a real column, no longer hardcoded 0. */
    total_capacity?: number;
  };
  className?: string;
  onFilterClick?: (filter: string) => void;
  activeFilter?: string;
}

export function TransportStats({ stats, className, onFilterClick, activeFilter }: TransportStatsProps) {
  const items = [
    {
      label: "Total Cars",
      value: stats.total_cars,
      icon: Car,
      filter: 'cars',
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Assigned Cars",
      value: stats.assigned_cars,
      icon: LayoutList,
      filter: 'assigned',
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    },
    {
      label: "Total Seats",
      value: stats.total_capacity ?? 0,
      icon: Users,
      filter: 'cars',
      color: "text-teal-500",
      bg: "bg-teal-500/10",
      border: "border-teal-500/20",
    },
    {
      label: "Total Drivers",
      value: stats.total_drivers,
      icon: User,
      filter: 'drivers',
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      label: "Active Drivers",
      value: stats.active_drivers,
      icon: User,
      filter: 'active_drivers',
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-5 gap-3", className)}>
      {items.map((item) => {
        const isActive = activeFilter === item.filter;
        
        return (
          <Card 
            key={item.label} 
            className={cn(
              "border shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md active:scale-95",
              item.border,
              isActive ? "bg-card ring-2 ring-primary/20" : "bg-card/40 opacity-70 hover:opacity-100"
            )}
            onClick={() => onFilterClick?.(item.filter)}
          >
            <CardContent className="p-4 flex flex-row items-center justify-between space-y-0">
               <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground font-medium">{item.label}</span>
                  <span className="text-2xl font-bold">{item.value}</span>
               </div>
               <div className={cn("p-2.5 rounded-xl", item.bg)}>
                  <item.icon className={cn("h-5 w-5", item.color)} />
               </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
