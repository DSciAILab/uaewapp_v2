'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FighterStats } from '@/types/stats';
import { WeightClassBadge } from './weight-class-badge';
import { calculateRecord, formatHeight, formatReach } from '@/lib/services/stats-service';
import { User, Ruler, Target, Trophy, Swords } from 'lucide-react';

interface StatsCardProps {
  stats: FighterStats;
  compact?: boolean;
}

export function StatsCard({ stats, compact = false }: StatsCardProps) {
  const record = calculateRecord(stats);
  const totalFights = stats.wins + stats.losses + stats.draws + stats.no_contests;

  if (compact) {
    return (
      <div className="flex items-center gap-4 p-3 border rounded-lg">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{stats.person?.compiled_name}</span>
            {stats.nickname && (
              <span className="text-sm text-muted-foreground">"{stats.nickname}"</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{record}</Badge>
            {stats.weight_class && <WeightClassBadge weightClass={stats.weight_class} />}
          </div>
        </div>
        {stats.team_gym && (
          <span className="text-sm text-muted-foreground">{stats.team_gym}</span>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {stats.person?.compiled_name}
            {stats.nickname && (
              <span className="text-lg font-normal text-muted-foreground">
                "{stats.nickname}"
              </span>
            )}
          </CardTitle>
          {stats.weight_class && <WeightClassBadge weightClass={stats.weight_class} showLimit />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Physical Stats */}
        <div className="grid grid-cols-2 gap-4">
          {stats.height_cm && (
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Height</p>
                <p className="font-medium">{formatHeight(stats.height_cm)}</p>
              </div>
            </div>
          )}
          {stats.reach_cm && (
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Reach</p>
                <p className="font-medium">{formatReach(stats.reach_cm)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Record */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Record: {record}</span>
            <span className="text-sm text-muted-foreground">({totalFights} fights)</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Wins ({stats.wins})</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>KO/TKO</span>
                  <span className="font-medium">{stats.wins_ko}</span>
                </div>
                <div className="flex justify-between">
                  <span>Submission</span>
                  <span className="font-medium">{stats.wins_submission}</span>
                </div>
                <div className="flex justify-between">
                  <span>Decision</span>
                  <span className="font-medium">{stats.wins_decision}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Losses ({stats.losses})</p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>KO/TKO</span>
                  <span className="font-medium">{stats.losses_ko}</span>
                </div>
                <div className="flex justify-between">
                  <span>Submission</span>
                  <span className="font-medium">{stats.losses_submission}</span>
                </div>
                <div className="flex justify-between">
                  <span>Decision</span>
                  <span className="font-medium">{stats.losses_decision}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        {(stats.fighting_style || stats.team_gym) && (
          <div className="border-t pt-4 space-y-2">
            {stats.fighting_style && (
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{stats.fighting_style}</span>
              </div>
            )}
            {stats.team_gym && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Team:</span>
                <span className="text-sm">{stats.team_gym}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
