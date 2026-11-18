import * as React from 'react'

import { cn } from '../../lib/cn'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-default-admin-field={/(?:^|\s)(?:[\w-]+:)*!?bg-(?!clip-|origin-)[^\s]+/.test(className ?? '') ? undefined : ''}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input-border bg-surface px-3 py-2 text-sm text-content ring-offset-surface placeholder:text-content-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'

