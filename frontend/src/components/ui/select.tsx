import * as React from 'react'
import { cn } from '../../lib/cn'

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Opcioni vidljivi label; ako se ne proslijedi, očekuje se vanjski <label htmlFor>. */
  label?: React.ReactNode
  /** Poruka o grešci; postavlja aria-invalid i aria-describedby. */
  error?: string
  /** Klasa za vanjski wrapper (koristi se umjesto inline wrappera). */
  containerClassName?: string
}

/**
 * Djeljena <select> komponenta za admin dashboard. Zamjenjuje raw <select>
 * sa hardkodiranim selectClass stringom. Theming ide preko semantičkih tokena
 * (border-line / bg-surface / text-content / focus-ring), pa radi u Classic i
 * Aurum skinu. Drži se native <select> zbog pristupačnosti i mobilnog ponašanja.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, containerClassName, children, ...props }, ref) => {
    const generatedId = React.useId()
    const selectId = id ?? generatedId
    const errorId = error ? `${selectId}-error` : undefined
    return (
      <div className={cn('flex flex-col gap-1', containerClassName)}>
        {label ? (
          <label htmlFor={selectId} className="text-sm font-medium text-content">
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            'flex h-10 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-content shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-rose-300 focus-visible:ring-rose-500' : '',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p id={errorId} className="text-xs text-rose-600">
            {error}
          </p>
        ) : null}
      </div>
    )
  },
)
Select.displayName = 'Select'
