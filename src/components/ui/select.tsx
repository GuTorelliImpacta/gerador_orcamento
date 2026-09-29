import * as React from 'react'
import { cn } from '@/lib/utils'

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn('min-h-11 w-full rounded-lg border border-border bg-card px-3 text-base disabled:opacity-50', className)}
      {...props}
    />
  )
}
