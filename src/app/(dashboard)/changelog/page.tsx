'use client';

import { DashboardHeader } from '@/components/layout/dashboard-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { CHANGELOG } from '@/lib/changelog';

export default function ChangelogPage() {
  return (
    <div className="flex flex-col h-full">
      <DashboardHeader title="What's New" description="Recent changes to the UAEW app" />
      <div className="flex-1 p-6 max-w-3xl">
        <div className="space-y-4">
          {CHANGELOG.map((entry) => (
            <Card key={entry.version}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-bold">
                    {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <Badge variant="outline" className="font-mono text-[10px]">v{entry.version}</Badge>
                </div>
                <ul className="space-y-1.5">
                  {entry.changes.map((c, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="text-primary shrink-0">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
