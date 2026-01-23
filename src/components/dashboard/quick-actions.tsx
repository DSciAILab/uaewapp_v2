'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, Plane, Hotel, CheckSquare, Zap } from 'lucide-react';
import Link from 'next/link';

interface QuickActionsProps {
  eventId: string;
}

export function QuickActions({ eventId }: QuickActionsProps) {
  const actions = [
    {
      label: 'Enroll Person',
      href: `/events/${eventId}?add=true`,
      icon: Users,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      label: 'Add Flight',
      href: `/events/${eventId}/transport?add=true`,
      icon: Plane,
      color: 'bg-sky-500 hover:bg-sky-600',
    },
    {
      label: 'New Booking',
      href: `/events/${eventId}/hotels?add=true`,
      icon: Hotel,
      color: 'bg-indigo-500 hover:bg-indigo-600',
    },
    {
      label: 'Create Task',
      href: `/events/${eventId}/tasks?add=true`,
      icon: CheckSquare,
      color: 'bg-amber-500 hover:bg-amber-600',
    }
  ];

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              asChild
              variant="default"
              className={`h-24 flex-col gap-2 ${action.color} border-none shadow-sm`}
            >
              <Link href={action.href}>
                <action.icon className="h-6 w-6" />
                <span className="text-xs font-bold uppercase tracking-tight">{action.label}</span>
              </Link>
            </Button>
          ))}
        </div>
        <Button variant="outline" className="w-full mt-4 border-dashed border-2 bg-muted/20" asChild>
          <Link href={`/events/${eventId}/war-room`} className="gap-2">
            <Zap className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            Launch Real-time War Room
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
