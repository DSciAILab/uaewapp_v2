'use client';

import { Card, CardContent } from "@/components/ui/card";
import { FileText, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisaStatus } from "@/types/database";

interface VisaStatsProps {
  stats: {
    total: number;
    pending: number;
    applied: number;
    approved: number;
    rejected: number;
  };
  onStatusClick?: (status: VisaStatus | 'all') => void;
  activeStatus?: VisaStatus | 'all';
}

export function VisaStats({ stats, onStatusClick, activeStatus }: VisaStatsProps) {
  const items = [
    {
      label: "Total Visas",
      value: stats.total,
      icon: FileText,
      status: 'all',
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      status: 0, // 'pending' id from constants usually 0 or mapped
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
    },
    {
      label: "Applied",
      value: stats.applied,
      icon: AlertCircle,
      status: 1, // 'applied'
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Approved",
      value: stats.approved,
      icon: CheckCircle2,
      status: 2, // 'approved'
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    },
    {
      label: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      status: 3, // 'rejected'
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {items.map((item) => {
        // Handle status comparison (number vs string)
        const isActive = activeStatus === item.status || (activeStatus === undefined && item.status === 'all');
        
        return (
          <Card 
            key={item.label} 
            className={cn(
              "border shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md active:scale-95",
              item.border,
              isActive ? "bg-card ring-2 ring-primary/20" : "bg-card/40 opacity-70 hover:opacity-100"
            )}
            onClick={() => onStatusClick?.(item.status as any)}
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
