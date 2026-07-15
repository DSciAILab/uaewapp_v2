'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplet, Stethoscope, FileText, CheckCircle } from 'lucide-react';

interface PreEventSummaryStatsProps {
  stats: {
    total_enrolled: number;
    cleared: number;
    partial: number;
    pending: number;
    denied: number;
    blood_tests_pending: number;
    medical_exams_pending: number;
    documents_pending: number;
  };
}

export function PreEventSummaryStats({ stats }: PreEventSummaryStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Overall Clearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-2xl font-bold">{stats.cleared}</span>
            <span className="text-sm text-muted-foreground">/ {stats.total_enrolled}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Blood Pending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Droplet className="h-5 w-5 text-blue-600" />
            <span className="text-2xl font-bold">{stats.blood_tests_pending}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Medical Pending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-red-600" />
            <span className="text-2xl font-bold">{stats.medical_exams_pending}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Docs Pending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-yellow-600" />
            <span className="text-2xl font-bold">{stats.documents_pending}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
