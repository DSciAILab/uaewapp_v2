"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { StatusDot } from "./status-dot"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-medium",
  {
    variants: {
      status: {
        pending: "status-pending",
        confirmed: "status-confirmed",
        warning: "status-warning",
        critical: "status-critical",
        neutral: "status-neutral",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  label: string
  dot?: boolean
  /**
   * Optional leading lucide icon. Domains whose statuses collapse onto the
   * same semantic token (e.g. music "pending" vs "uploaded") use it to stay
   * distinguishable. Pass the component, not an element: icon={Clock}.
   */
  icon?: React.ComponentType<{ className?: string }>
}

export function StatusBadge({
  className,
  status,
  label,
  dot = true,
  icon: Icon,
  ...props
}: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)} {...props}>
      {Icon ? (
        <Icon className="h-3 w-3" aria-hidden="true" />
      ) : (
        dot && <StatusDot status={status} size="sm" />
      )}
      {label}
    </span>
  )
}
