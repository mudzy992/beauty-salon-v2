export const publicPage = {
  outer: 'bg-white min-h-screen',
  container: 'mx-auto max-w-6xl px-4',
  containerNarrow: 'mx-auto max-w-5xl px-4',
  contentAfterHero: 'pt-10 md:pt-12',
} as const

export const publicHeader = {
  kicker: 'text-xs font-medium text-slate-500 tracking-wide',
  title: 'text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950',
  subtitle: 'text-base sm:text-lg text-slate-600 leading-relaxed',
} as const

export const publicSection = {
  base: 'py-16 sm:py-20',
  surface: 'bg-white',
  subtle: 'bg-slate-50',
} as const

export const publicPageHero = {
  section: 'border-b border-slate-200/80 bg-white',
  inner: 'mx-auto max-w-6xl px-4 py-12 sm:py-14 md:py-16',
  innerNarrow: 'mx-auto max-w-5xl px-4 py-12 sm:py-14 md:py-16',
} as const

