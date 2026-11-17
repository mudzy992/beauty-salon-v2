import * as React from 'react'

import { cn } from '../../lib/cn'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-default-admin-field={/(?:^|\s)(?:[\w-]+:)*!?bg-(?!clip-|origin-|surface|surface-muted|surface-sunken|foreground|background)[^\s]+/.test(className ?? '') ? undefined : ''}
        className={cn(
          'flex h-10 w-full rounded-md border border-input-border bg-surface px-3 py-2 text-sm text-content ring-offset-surface file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-content-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

