import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { ButtonHTMLAttributes, forwardRef } from 'react'

import { cn } from '../../lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99] dark:focus-visible:ring-offset-slate-950',
  {
    variants: {
      variant: {
        default:
          'border border-transparent bg-slate-900 text-white shadow-sm shadow-slate-900/10 hover:bg-slate-800 focus-visible:ring-slate-400 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950',
        secondary:
          'border border-slate-200/90 bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-200/80 focus-visible:ring-slate-400 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700 dark:focus-visible:ring-offset-slate-950',
        outline:
          'border border-slate-200/90 bg-white text-slate-900 shadow-sm shadow-slate-900/5 hover:border-slate-300/90 hover:bg-slate-50 focus-visible:ring-slate-400 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-900 dark:focus-visible:ring-offset-slate-950',
        ghost:
          'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400 focus-visible:ring-offset-white dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50 dark:focus-visible:ring-offset-slate-950',
        onDark:
          'border border-white/20 bg-white text-slate-900 shadow-sm hover:bg-white/92 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40',
        onDarkOutline:
          'border border-white/45 bg-white/12 text-white shadow-sm backdrop-blur-md hover:border-white/60 hover:bg-white/18 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50',
        destructive:
          'border border-transparent bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950',
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
