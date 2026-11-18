import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { ButtonHTMLAttributes, forwardRef } from 'react'

import { cn } from '../../lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]',
  {
    variants: {
      variant: {
        default:
          'border border-transparent bg-surface-inverse text-on-surface-inverse shadow-sm hover:opacity-90 focus-visible:ring-focus-ring focus-visible:ring-offset-surface',
        secondary:
          'border border-line bg-surface-muted text-content shadow-sm hover:bg-surface-sunken focus-visible:ring-focus-ring focus-visible:ring-offset-surface',
        outline:
          'border border-line bg-surface text-content shadow-sm hover:bg-surface-muted focus-visible:ring-focus-ring focus-visible:ring-offset-surface',
        ghost:
          'border border-transparent text-content-strong hover:bg-surface-muted hover:text-content focus-visible:ring-focus-ring focus-visible:ring-offset-surface',
        onDark:
          'border border-white/20 bg-white text-slate-900 shadow-sm hover:bg-white/92 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40',
        onDarkOutline:
          'border border-white/45 bg-white/12 text-white shadow-sm backdrop-blur-md hover:border-white/60 hover:bg-white/18 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50',
        destructive:
          'border border-transparent bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500 focus-visible:ring-offset-surface dark:focus-visible:ring-offset-surface',
        /* Admin dashboard: koristi semantičke tokene umjesto hardkodiranog red-600.
           5.22:1 (light) / 6.29:1 (dark) — provjereno u check_ui_contrast.py. */
        danger:
          'border border-transparent bg-danger text-danger-foreground shadow-sm hover:opacity-90 focus-visible:ring-danger focus-visible:ring-offset-surface dark:focus-visible:ring-offset-surface',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
