import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Shirt, 
  Music, 
  Scale, 
  FileText, 
  Stethoscope, 
  Droplet 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChecklistItemProps {
  status: 'cleared' | 'ok' | 'partial' | 'pending' | 'denied' | 'missed' | 'missing' | 'failed';
  type: 'blood' | 'medical' | 'docs' | 'music' | 'uniform' | 'weight';
}

const statusConfig = {
  cleared: { icon: CheckCircle2, color: 'text-green-500', label: 'Cleared' },
  ok: { icon: CheckCircle2, color: 'text-green-500', label: 'Ready' },
  partial: { icon: AlertCircle, color: 'text-yellow-500', label: 'Partial' },
  pending: { icon: Clock, color: 'text-muted-foreground', label: 'Pending' },
  denied: { icon: XCircle, color: 'text-red-500', label: 'Denied' },
  missed: { icon: XCircle, color: 'text-red-500', label: 'Missed Weight' },
  missing: { icon: AlertCircle, color: 'text-red-400', label: 'Missing' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
};

const typeIcons = {
  blood: Droplet,
  medical: Stethoscope,
  docs: FileText,
  music: Music,
  uniform: Shirt,
  weight: Scale,
};

export function ChecklistStatus({ status, type }: ChecklistItemProps) {
  const config = statusConfig[status] || statusConfig.pending;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const TypeIcon = typeIcons[type]; 
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center justify-center h-8 w-8 rounded-full bg-muted/20 border border-transparent hover:border-border transition-colors", 
            status === 'cleared' || status === 'ok' ? 'bg-green-500/10' : '',
            status === 'denied' || status === 'missed' || status === 'failed' ? 'bg-red-500/10' : '',
          )}>
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
