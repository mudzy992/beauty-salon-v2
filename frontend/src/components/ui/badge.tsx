import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold-ring focus:ring-offset-2 dark:focus:ring-offset-slate-950',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900',
        secondary:
          'border-transparent bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50',
        outline: 'text-slate-900 dark:text-slate-50',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        danger: 'border-rose-200 bg-rose-50 text-rose-800',
        brand: 'border-brand-champagne bg-brand-champagne/20 text-slate-900',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
)

