'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Scale, History, AlertTriangle, CheckCircle } from 'lucide-react';
import { EventWeighIn } from '@/types/stats';
import { getEventWeighIns, kgToLbs } from '@/lib/services/stats-service';
import { format } from 'date-fns';

interface StatsHistoryProps {
  eventId: string;
}

export function StatsHistory({ eventId }: StatsHistoryProps) {
  const [weighIns, setWeighIns] = useState<EventWeighIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getEventWeighIns(eventId);
        setWeighIns(data);
      } catch (err) {
        console.error('Failed to load weigh-ins:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [eventId]);

  if (isLoading) return <div className="text-center py-8">Loading history...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Scale className="h-4 w-4" /> Weigh-ins Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weighIns.filter(w => w.made_weight).length} / {weighIns.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Athletes who made weight</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Weight Misses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {weighIns.filter(w => !w.made_weight).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Require commission review</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> Detailed History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fighter</TableHead>
                <TableHead>Weight Class</TableHead>
                <TableHead>Official Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weighIns.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">
                    {w.enrolled?.person?.full_name}
                  </TableCell>
                  <TableCell>
                    {w.enrolled?.stats?.weight_class || 'Catch Weight'}
                  </TableCell>
                  <TableCell>
                    <div className="font-mono">
                      {w.official_weight_kg} kg
                      {w.official_weight_kg !== null && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({kgToLbs(w.official_weight_kg)} lbs)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {w.made_weight ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" /> Made Weight
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex flex-col items-start gap-1 p-2 h-auto">
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Missed Weight
                        </div>
                        {w.weight_miss_kg && (
                          <span className="text-[10px] font-bold">
                            +{w.weight_miss_kg} kg miss
                          </span>
                        )}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {w.weigh_in_time ? format(new Date(w.weigh_in_time), 'HH:mm dd/MM') : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {weighIns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No weigh-in records found for this event.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
