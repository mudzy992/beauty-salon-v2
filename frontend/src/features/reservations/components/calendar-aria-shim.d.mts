/** Jedan prolaz popravke ARIA markupa koji generiše react-big-calendar. */
export function applyCalendarAriaShim(root: Element | null | undefined): void

/** Popravka + MutationObserver koji je ponavlja poslije re-rendera. Vraća funkciju za prekid. */
export function observeCalendarAriaShim(root: Element | null | undefined): () => void
