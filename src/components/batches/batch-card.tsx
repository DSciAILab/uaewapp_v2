'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, MapPin, Clock, Users } from 'lucide-react';
import { Batch } from '@/types/batch';
import { BatchTypeBadge } from './batch-type-badge';
import { BatchStatusBadge } from './batch-status-badge';
import { format } from 'date-fns';

interface BatchCardProps {
  batch: Batch;
  onEdit: (batch: Batch) => void;
  onClick: (batchId: string) => void;
}

export function BatchCard({ batch, onEdit, onClick }: BatchCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(batch.id)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-2">
          <BatchTypeBadge type={batch.batch_type} />
          <div className="flex items-center gap-2">
            <BatchStatusBadge status={batch.status} />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(batch);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardTitle className="text-xl">
          {batch.name || `${batch.batch_type.toUpperCase()} #${batch.batch_number}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{batch.start_time.slice(0, 5)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{batch.participant_count} {batch.max_capacity ? `/ ${batch.max_capacity}` : ''}</span>
          </div>
          {batch.location && (
            <div className="flex items-center gap-2 text-muted-foreground col-span-2">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{batch.location}{batch.room ? ` - ${batch.room}` : ''}</span>
            </div>
          )}
        </div>

        {batch.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
            {batch.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
