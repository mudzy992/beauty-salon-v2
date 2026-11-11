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

/**
 * Da li je fokusirani element native input s internim segmentima (datum/vrijeme).
 * Chromium takve segmente drži u zatvorenom shadow DOM-u, pa Tab pomjeri fokus a
 * `document.activeElement` ostaje isti — izvana identično zaglavljenom fokusu.
 */
export function activeElementIsSegmentedInput(): boolean

/** Rezultat sonde: šta DOM stvarno kaže o elementu koji snapshot smatra fokusabilnim. */
export type FocusProbe = {
  label: string
  /** Da li je `el.focus()` stvarno primio fokus. */
  took: boolean
  tabindex: string | null
  role: string | null
  /** Da li je element tablista ili je unutar nje (`closest` matchuje i sâm element). */
  inTablist: boolean
}

/**
 * Ispituje fokusabilnost direktno (`el.focus()` + `document.activeElement`), za razliku od
 * `focusableSnapshot` koji zaključuje iz atributa i stilova. Ne mijenja presudu — samo
 * prijavljuje činjenice uz nalaz.
 */
export function probeFocusability(labels: string[]): FocusProbe[]
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
