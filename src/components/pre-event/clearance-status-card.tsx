'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { PreEventSummary, ClearanceStatus } from '@/types/pre-event';

interface ClearanceStatusCardProps {
  summary: PreEventSummary;
  onClick?: () => void;
}

const statusConfig: Record<ClearanceStatus, { icon: any; color: string; bgColor: string }> = {
  cleared: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  partial: { icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  pending: { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  denied: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
};

export function ClearanceStatusCard({ summary, onClick }: ClearanceStatusCardProps) {
  const config = statusConfig[summary.clearance_status];
  const StatusIcon = config.icon;

  const totalItems = summary.blood_tests.total + summary.medical_exams.total + summary.documents.total;
  const completedItems = 
    (summary.blood_tests.all_clear ? summary.blood_tests.total : summary.blood_tests.completed) +
    (summary.medical_exams.all_clear ? summary.medical_exams.total : summary.medical_exams.completed) +
    summary.documents.approved;
  
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <Card 
      className={`hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{summary.person_name}</CardTitle>
          <Badge variant="outline" className={`${config.bgColor} ${config.color} border-0`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {summary.clearance_status.charAt(0).toUpperCase() + summary.clearance_status.slice(1)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{summary.role}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Requirements */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          {/* Blood Tests */}
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              {summary.blood_tests.all_clear ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium">Blood</span>
            </div>
            <p className="text-xs">{summary.blood_tests.completed}/{summary.blood_tests.total}</p>
          </div>

          {/* Medical Exams */}
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              {summary.medical_exams.all_clear ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium">Medical</span>
            </div>
            <p className="text-xs">{summary.medical_exams.completed}/{summary.medical_exams.total}</p>
          </div>

          {/* Documents */}
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              {summary.documents.all_clear ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium">Docs</span>
            </div>
            <p className="text-xs">{summary.documents.approved}/{summary.documents.total}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
