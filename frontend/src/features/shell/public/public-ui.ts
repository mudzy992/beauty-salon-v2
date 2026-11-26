export const publicPage = {
  outer: 'bg-surface min-h-screen',
  container: 'mx-auto max-w-6xl px-4',
  containerNarrow: 'mx-auto max-w-5xl px-4',
  contentAfterHero: 'pt-10 md:pt-12',
} as const

export const publicHeader = {
  kicker: 'text-xs font-medium text-content-strong tracking-wide',
  title: 'text-3xl sm:text-4xl font-semibold tracking-tight text-content',
  subtitle: 'text-base sm:text-lg text-content-strong leading-relaxed',
} as const

export const publicSection = {
  base: 'py-16 sm:py-20',
  surface: 'bg-surface',
  subtle: 'bg-surface-sunken',
} as const

/* NEJRA §10/§11 — semantički tokeni za Aurum stanja (S2). Osnovni `public*`
   objekti iznad ostaju NETAKNUTI: bez `data-skin="aurum"` nijedna se vrijednost
   ne primjenjuje, pa je default izgled identičan. Nema tvrdih hexova ni vanjskih fontova. */
export const publicAurum = {
  page: 'bg-surface text-content',
  subtle: 'bg-surface-sunken',
  heading: 'aurum-heading text-content',
  kicker: 'text-content-muted',
  muted: 'text-content-muted',
  border: 'border-line',
} as const

export const publicPageHero = {
  section: 'border-b border-line/80 bg-surface',
  inner: 'mx-auto max-w-6xl px-4 py-12 sm:py-14 md:py-16',
  innerNarrow: 'mx-auto max-w-5xl px-4 py-12 sm:py-14 md:py-16',
} as const

