import React from 'react'
import { cn } from '@/lib/utils'

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-white/5 border border-white/5 relative overflow-hidden shimmer-skeleton",
        className
      )}
      {...props}
    />
  )
}
