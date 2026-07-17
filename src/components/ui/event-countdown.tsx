"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { StatusDot } from "./status-dot"

export interface EventCountdownProps {
  targetDate: string | Date
  eventName: string
  eventCode?: string
  className?: string
}

export function EventCountdown({
  targetDate,
  eventName,
  eventCode,
  className,
}: EventCountdownProps) {
  const [now, setNow] = React.useState(() => Date.now())
  const target = React.useMemo(
    () => (typeof targetDate === "string" ? new Date(targetDate).getTime() : targetDate.getTime()),
    [targetDate]
  )

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = target - now
  const past = diff < 0
  const abs = Math.abs(diff)
  const days = Math.floor(abs / 86_400_000)
  const hours = Math.floor((abs % 86_400_000) / 3_600_000)
  const minutes = Math.floor((abs % 3_600_000) / 60_000)
  const seconds = Math.floor((abs % 60_000) / 1000)

  const units = [
    { label: "D", value: days },
    { label: "H", value: hours },
    { label: "M", value: minutes },
    { label: "S", value: seconds },
  ]

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border border-border/60 bg-surface-1/60 px-4 py-3 backdrop-blur",
        className
      )}
    >
      <StatusDot status={past ? "neutral" : "warning"} size="lg" />
      <div className="flex-1 min-w-0">
        <div className="label-mono text-muted-foreground">
          {past ? "Started" : "Time to fight"}
        </div>
        <div className="text-sm font-semibold text-foreground truncate">{eventName}</div>
        {eventCode && (
          <div className="numeric text-[10px] text-muted-foreground">{eventCode}</div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {units.map((u, i) => (
          <React.Fragment key={u.label}>
            <div className="flex flex-col items-center">
              <span className="numeric text-xl font-semibold text-foreground tabular-nums leading-none">
                {u.value.toString().padStart(2, "0")}
              </span>
              <span className="label-mono mt-0.5">{u.label}</span>
            </div>
            {i < units.length - 1 && <span className="text-muted-foreground/40 -mb-2.5">:</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
