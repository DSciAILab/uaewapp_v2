'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TeamMember } from '@/types/war-room';
import { Users, Monitor } from 'lucide-react';

interface TeamPresenceProps {
  members: TeamMember[];
}

export function TeamPresence({ members }: TeamPresenceProps) {
  return (
    <Card className="bg-surface-1 border-border shadow-xl">
      <CardHeader className="py-4 border-b border-border">
        <CardTitle className="text-sm font-bold text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Command Center Team
          </div>
          <Badge variant="outline" className="text-[10px] bg-surface-2 text-muted-foreground border-border">
            {members.length} Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="space-y-1">
          {members.length === 0 ? (
            <p className="text-center py-4 text-xs text-muted-foreground italic">No other team members detected.</p>
          ) : (
            members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                <div className="relative">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="bg-surface-2 text-[10px] text-foreground font-bold">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-1 bg-status-confirmed" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground truncate">{member.name}</p>
                    <Badge variant="outline" className="text-[8px] h-4 px-1 bg-primary/5 text-primary border-primary/20">
                      {member.role?.name || (typeof member.role === 'string' ? member.role : '')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Monitor className="h-2.5 w-2.5 text-muted-foreground" />
                    <p className="text-[9px] text-muted-foreground font-medium truncate uppercase tracking-tighter">
                      Viewing {member.current_section || 'Dashboard'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
