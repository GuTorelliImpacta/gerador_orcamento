import * as React from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn('min-h-24 w-full rounded-lg border border-border bg-card px-3 py-2 text-base placeholder:text-muted', className)}
      {...props}
    />
  )
}
