'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Plane, Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlightStatsProps {
  stats: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
  } | null;
  onStatusClick?: (status: string) => void;
  activeStatus?: string;
}

export function FlightStats({ stats, onStatusClick, activeStatus }: FlightStatsProps) {
  if (!stats) return null;

  const items = [
    {
      label: "Total Flights",
      value: stats.total,
      icon: Plane,
      status: 'all',
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      status: 'pending',
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
    },
    {
      label: "Confirmed",
      value: stats.confirmed,
      icon: CheckCircle2,
      status: 'confirmed',
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    },
    {
      label: "Cancelled",
      value: stats.cancelled,
      icon: XCircle,
      status: 'cancelled',
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => {
        const isActive = activeStatus === item.status || (item.status === 'all' && !activeStatus);
        
        return (
          <Card 
            key={item.label} 
            className={cn(
              "border shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md active:scale-95",
              item.border,
              isActive ? "bg-card ring-2 ring-primary/20" : "bg-card/40 opacity-70 hover:opacity-100"
            )}
            onClick={() => onStatusClick?.(item.status === 'all' ? '' : item.status)}
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
