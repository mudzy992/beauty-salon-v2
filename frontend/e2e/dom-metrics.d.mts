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

/** Popis mjesta gdje bi tekst mogao biti renderovan kao slika (1.4.5). */
export type ImageBearingInventory = {
  counts: { img: number; roleImg: number; svgText: number; canvas: number; bgImage: number }
  samples: {
    img: { where: string; src: string; alt: string }[]
    roleImg: { where: string; name: string }[]
    svgText: { where: string; text: string }[]
    canvas: { where: string; width: number; height: number }[]
    bgImage: { where: string; value: string }[]
  }
}

/**
 * Mjeri gdje bi tekst mogao biti slika. Ne dokazuje usaglašenost s 1.4.5 — da li raster
 * slika sadrži tekst zna samo OCR ili čovjek — ali pretvara „nije provjereno" u konačan,
 * imenovan skup.
 */
export function imageBearingInventory(limit?: number): ImageBearingInventory

/**
 * Opis inventara za CI anotaciju. Razdvaja ono što je odlučivo (`<canvas>`) od onog što
 * traži ljudsku procjenu (raster) i od onog što **nije** prekršaj (`svg <text>` — pravi
 * tekst u DOM-u), da se popis ne pročita kao nalaz.
 */
export function describeImageInventory(inventory: ImageBearingInventory): string
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

export type VisibleTextNotInName = { element: string; visible: string; name: string }

/**
 * Vidljivi tekst koji nije dio `aria-label`-a — 2.5.3. Mjera računa oba teksta sama jer
 * axe ovo pravilo na 22 rute vraća kao **incomplete** (nesigurnost, ne nalaz).
 */
export function visibleTextNotInName(): VisibleTextNotInName[]
