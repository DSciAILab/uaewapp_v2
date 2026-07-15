'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Plane, FileText, Hotel, Car, CheckSquare, Calendar, ShieldAlert } from 'lucide-react';
import { EventMetrics } from '@/types/dashboard';

interface MetricsGridProps {
  metrics: EventMetrics;
  onMetricClick?: (type: string) => void;
}

export function MetricsGrid({ metrics, onMetricClick }: MetricsGridProps) {
  const cards = [
    {
      title: 'Participants',
      value: metrics.total_enrolled,
      sub: `${metrics.fighters} Fighters • ${metrics.staff} Staff`,
      icon: Users,
      color: 'text-blue-600',
      type: 'people',
    },
    {
      title: 'Flights',
      value: metrics.total_flights,
      sub: `${metrics.pending_tickets} Pending Tickets`,
      icon: Plane,
      color: 'text-sky-600',
      type: 'flights',
    },
    {
      title: 'Visas',
      value: metrics.total_visas,
      sub: `${metrics.visas_approved} Approved • ${metrics.visas_denied} Denied`,
      icon: FileText,
      color: 'text-orange-600',
      type: 'visas',
    },
    {
      title: 'Hotels',
      value: metrics.total_reservations,
      sub: `${metrics.divergences_pending} Pending Divergences`,
      icon: Hotel,
      color: 'text-indigo-600',
      type: 'hotels',
    },
    {
      title: 'Transport',
      value: metrics.total_cars,
      sub: `${metrics.unassigned_transport} Unassigned Passengers`,
      icon: Car,
      color: 'text-emerald-600',
      type: 'transport',
    },
    {
      title: 'Tasks',
      value: metrics.total_tasks,
      sub: `${metrics.tasks_overdue} Overdue • ${metrics.tasks_completed}/${metrics.total_tasks}`,
      icon: CheckSquare,
      color: 'text-amber-600',
      type: 'tasks',
    },
    {
      title: 'Medical Clearance',
      value: metrics.clearance_complete,
      sub: `${metrics.clearance_pending} Pending • ${metrics.clearance_denied} Denied`,
      icon: ShieldAlert,
      color: 'text-rose-600',
      type: 'pre-event',
    },
    {
      title: 'Batches',
      value: metrics.total_batches,
      sub: `${metrics.batches_today} Today • ${metrics.batches_completed} Completed`,
      icon: Calendar,
      color: 'text-purple-600',
      type: 'batches',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card 
          key={card.title} 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onMetricClick?.(card.type)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.sub}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
