import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-surface-inverse text-on-surface-inverse',
        secondary:
          'border-transparent bg-surface-muted text-content',
        outline: 'text-content',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        danger: 'border-rose-200 bg-rose-50 text-rose-800',
        brand: 'border-brand-champagne bg-brand-champagne/20 text-slate-900',
        /* Semantičke status varijante za dashboard (faza 0). Postojeće iznad se ne
           diraju jer ih koristi javni sajt. Kontrasti su u check_ui_contrast.py:
           info 7.13:1, neutral 8.23:1 (light). */
        info: 'border-transparent bg-info text-info-foreground',
        neutral: 'border-transparent bg-neutral text-neutral-foreground',
        /* 1.4.11 — outline badge s okvirom koji sam po sebi prelazi 3:1. */
        outlineStrong: 'border-control-border text-content',
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
  <div data-ui-badge={variant ?? 'secondary'} className={cn(badgeVariants({ variant }), className)} {...props} />
)

