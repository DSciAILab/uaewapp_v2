"use client"

import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const statusDotVariants = cva("status-dot", {
  variants: {
    status: {
      pending: "text-status-pending",
      confirmed: "text-status-confirmed",
      warning: "text-status-warning",
      critical: "text-status-critical",
      neutral: "text-status-neutral",
    },
    size: {
      sm: "w-1.5 h-1.5",
      default: "w-2 h-2",
      lg: "w-2.5 h-2.5",
    },
  },
  defaultVariants: {
    status: "neutral",
    size: "default",
  },
})

export interface StatusDotProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusDotVariants> {
  label?: string
}

export function StatusDot({ className, status, size, label, ...props }: StatusDotProps) {
  return (
    <span
      className={cn(statusDotVariants({ status, size }), className)}
      role="status"
      aria-label={label}
      {...props}
    />
  )
}
