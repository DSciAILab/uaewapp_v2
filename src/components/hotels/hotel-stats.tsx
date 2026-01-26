'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Hotel, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface HotelStatsProps {
  stats: {
    total: number;
    confirmed: number;
    pending: number;
    with_divergence: number;
    pending_approval: number;
  };
  onStatusClick?: (status: string, subStatus?: string | boolean) => void;
  activeStatus?: string;
  activeSubStatus?: string | boolean;
}

export function HotelStats({ stats, onStatusClick, activeStatus, activeSubStatus }: HotelStatsProps) {
  const items = [
    {
      label: "Total Reservations",
      value: stats.total,
      icon: Hotel,
      status: 'all',
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Confirmed",
      value: stats.confirmed,
      icon: CheckCircle,
      status: 'confirmed',
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
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
      label: "Divergences",
      value: stats.with_divergence,
      icon: AlertTriangle,
      status: 'divergence',
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
    },
    {
        label: "Action Needed",
        value: stats.pending_approval,
        icon: AlertTriangle,
        status: 'action_needed',
        color: "text-red-500",
        bg: "bg-red-500/10",
        border: "border-red-500/20",
      },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {items.map((item) => {
        const isActive = activeStatus === item.status;
        
        return (
          <Card 
            key={item.label} 
            className={cn(
              "border shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md active:scale-95",
              item.border,
              isActive ? "bg-card ring-2 ring-primary/20" : "bg-card/40 opacity-70 hover:opacity-100"
            )}
            onClick={() => {
                if (item.status === 'divergence') {
                    onStatusClick?.('divergence');
                } else if (item.status === 'action_needed') {
                    onStatusClick?.('action_needed');
                } else if (item.status === 'all') {
                    onStatusClick?.('all');
                } else {
                    onStatusClick?.(item.status);
                }
            }}
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
