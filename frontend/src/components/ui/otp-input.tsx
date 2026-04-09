import * as React from 'react'

import { cn } from '../../lib/cn'

type Props = {
  value: string
  onChange: (next: string) => void
  length?: number
  disabled?: boolean
  className?: string
}

export const OtpInput = ({
  value,
  onChange,
  length = 6,
  disabled,
  className,
}: Props) => {
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([])

  const digits = React.useMemo(() => {
    const cleaned = value.replace(/\D/g, '').slice(0, length)
    return Array.from({ length }, (_, i) => cleaned[i] ?? '')
  }, [value, length])

  const handleSetAtIndex = (index: number, nextDigit: string) => {
    const onlyDigit = nextDigit.replace(/\D/g, '').slice(-1)
    const next = digits.map((d, i) => (i === index ? onlyDigit : d)).join('')
    onChange(next)
    if (onlyDigit && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    onChange(pasted)
    const nextIndex = Math.min(pasted.length, length - 1)
    inputsRef.current[nextIndex]?.focus()
  }

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el
          }}
          inputMode="numeric"
          pattern="\\d*"
          maxLength={1}
          value={d}
          disabled={disabled}
          onPaste={handlePaste}
          onChange={(e) => handleSetAtIndex(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i] && i > 0) {
              inputsRef.current[i - 1]?.focus()
            }
            if (e.key === 'ArrowLeft' && i > 0) inputsRef.current[i - 1]?.focus()
            if (e.key === 'ArrowRight' && i < length - 1) inputsRef.current[i + 1]?.focus()
          }}
          className="h-11 w-10 rounded-md border border-slate-200 bg-white text-center text-base font-semibold text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
          aria-label={`Cifra ${i + 1}`}
        />
      ))}
    </div>
  )
}

