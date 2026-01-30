
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { StagingStatus } from "@/types/staging";

interface StagingStatusCellProps {
  status: StagingStatus;
  onChange: (value: StagingStatus) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const statusConfig = {
  checked: { color: "bg-green-600 text-white hover:bg-green-700 border-green-700", label: "Checked" },
  missed: { color: "bg-red-600 text-white hover:bg-red-700 border-red-700", label: "Missed" },
  verify_at_venue: { color: "bg-orange-500 text-white hover:bg-orange-600 border-orange-600", label: "Venue Check" },
  pending: { color: "bg-muted text-muted-foreground hover:bg-muted/80 border-border", label: "Pending" },
};

export function StagingStatusCell({ status, onChange, isLoading, disabled }: StagingStatusCellProps) {
  const currentConfig = statusConfig[status] || statusConfig.pending;

  return (
    <Select value={status} onValueChange={(val) => onChange(val as StagingStatus)} disabled={isLoading || disabled}>
      <SelectTrigger 
        className={cn(
          "h-8 w-[110px] border-none text-xs font-semibold focus:ring-0", 
          currentConfig.color,
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <SelectValue>{currentConfig.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="checked">Checked</SelectItem>
        <SelectItem value="verify_at_venue">Venue Check</SelectItem>
        <SelectItem value="missed">Missed</SelectItem>
      </SelectContent>
    </Select>
  );
}
