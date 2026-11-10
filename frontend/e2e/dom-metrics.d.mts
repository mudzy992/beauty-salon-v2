/** Deklaracije za `dom-metrics.mjs` — logika je u `.mjs` da je test može stvarno izvršiti. */
export interface ClippedEntry {
  dx: number
  dy: number
}

export interface Landmark {
  tag: string
  dom: number
  top: number
}

export function describeElement(el: Element): string
export function clippedSnapshot(): Record<string, ClippedEntry>
export function focusableSnapshot(): string[]
export function hasVisibleFocusIndicator(): boolean
export function activeElementLabel(): string | null
export function landmarkSnapshot(): Landmark[]

export type OverflowingElement = {
  element: string
  scrollWidth: number
  clientWidth: number
  excess: number
  overflowX: string
}

export function overflowingElements(tolerance?: number): OverflowingElement[]

export type LabelInNameViolation = { element: string; name: string; visible: string }

export function labelInNameViolations(): LabelInNameViolation[]

export type InvalidWithoutDescription = { element: string; describedby: string }
export type RequiredNotMarked = { element: string; label: string }

export function invalidWithoutDescription(): InvalidWithoutDescription[]
export function requiredNotMarked(): RequiredNotMarked[]
