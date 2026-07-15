'use client';

import { Batch } from '@/types/batch';
import { BatchCard } from './batch-card';
import { format } from 'date-fns';

interface BatchTimelineProps {
  timeline: { date: string; batches: Batch[] }[];
  onEdit: (batch: Batch) => void;
  onClick: (batchId: string) => void;
}

export function BatchTimeline({ timeline, onEdit, onClick }: BatchTimelineProps) {
  if (timeline.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
        No batches scheduled yet
      </div>
    );
  }

  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
      {timeline.map((day, idx) => (
        <div key={day.date} className="relative">
          {/* Date header */}
          <div className="md:flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4 md:space-x-0 md:w-full">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground md:absolute md:left-1/2 md:-ml-5 z-10 shadow-sm">
                <span className="text-xs font-bold">{format(new Date(day.date + 'T00:00:00'), 'dd')}</span>
              </div>
              <div className="md:w-1/2 md:pr-12 md:text-right">
                <h3 className="text-lg font-bold">{format(new Date(day.date + 'T00:00:00'), 'EEEE, MMM dd, yyyy')}</h3>
              </div>
            </div>
          </div>

          {/* Batches for the day */}
          <div className="ml-12 md:ml-0 md:grid md:grid-cols-2 md:gap-8">
            {day.batches.map((batch, bIdx) => {
              const isEven = bIdx % 2 === 0;
              return (
                <div 
                  key={batch.id} 
                  className={`mb-4 md:mb-0 ${isEven ? 'md:col-start-1 md:text-right' : 'md:col-start-2'}`}
                >
                  <div className="relative p-1">
                    <BatchCard
                      batch={batch}
                      onEdit={onEdit}
                      onClick={onClick}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
