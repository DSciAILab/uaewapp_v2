"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card } from "./card"
import { StatusDot } from "./status-dot"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  unit?: string
  delta?: number
  deltaUnit?: string
  status?: "pending" | "confirmed" | "warning" | "critical" | "neutral"
  hint?: string
}

export function StatCard({
  className,
  label,
  value,
  unit,
  delta,
  deltaUnit,
  status = "neutral",
  hint,
  ...props
}: StatCardProps) {
  const deltaPositive = delta !== undefined && delta > 0
  const deltaNegative = delta !== undefined && delta < 0
  const DeltaIcon = deltaPositive ? TrendingUp : deltaNegative ? TrendingDown : Minus

  return (
    <Card className={cn("p-4 border-border/60 bg-card/40", className)} {...props}>
      <div className="flex items-start justify-between gap-2">
        <span className="label-mono text-muted-foreground">{label}</span>
        {status && <StatusDot status={status} size="sm" />}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="numeric text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </span>
        {unit && <span className="text-xs text-muted-foreground font-mono">{unit}</span>}
      </div>
      {(delta !== undefined || hint) && (
        <div className="mt-2 flex items-center gap-2 text-[11px]">
          {delta !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-mono",
                deltaPositive && "text-status-confirmed",
                deltaNegative && "text-status-critical",
                !deltaPositive && !deltaNegative && "text-muted-foreground"
              )}
            >
              <DeltaIcon className="h-3 w-3" />
              {delta > 0 ? "+" : ""}
              {delta}
              {deltaUnit && <span className="ml-0.5">{deltaUnit}</span>}
            </span>
          )}
          {hint && <span className="text-muted-foreground truncate">{hint}</span>}
        </div>
      )}
    </Card>
  )
}
