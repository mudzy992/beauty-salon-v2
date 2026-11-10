import { useEffect, type RefObject } from 'react'

import { observeCalendarAriaShim } from './calendar-aria-shim.mjs'

/**
 * Veže popravku ARIA markupa `react-big-calendar`-a na kontejner kalendara.
 *
 * Stvarna logika je u `calendar-aria-shim.mjs` — tamo je i dokumentovano koji se prekršaji
 * rješavaju i zašto se ne daju riješiti propovima. Ovdje je samo React vezanje: postavka pri
 * mountu i prekid posmatranja pri unmountu.
 */
export function useCalendarAriaShim(container: RefObject<HTMLElement | null>): void {
  useEffect(() => observeCalendarAriaShim(container.current), [container])
}
