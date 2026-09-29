import * as React from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-11 w-full rounded-lg border border-border bg-card px-3 text-base placeholder:text-muted disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
