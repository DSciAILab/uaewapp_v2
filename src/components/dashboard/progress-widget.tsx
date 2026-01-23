'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ModuleStatus } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface ProgressWidgetProps {
  modules: ModuleStatus[];
}

export function ProgressWidget({ modules }: ProgressWidgetProps) {
  const getStatusColor = (status: ModuleStatus['status']) => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-slate-500';
    }
  };

  const getProgressColor = (status: ModuleStatus['status']) => {
    switch (status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Module Readiness Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {modules.map((module) => (
          <div key={module.module} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', getProgressColor(module.status))} />
                <span className="uppercase text-slate-700">{module.label}</span>
              </div>
              <span className={cn(getStatusColor(module.status))}>
                {module.progress}%
              </span>
            </div>
            <Progress 
              value={module.progress} 
              className="h-1.5 bg-slate-100" 
              indicatorClassName={getProgressColor(module.status)}
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>DONE: {module.completed}</span>
              <span>TOTAL: {module.total}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
