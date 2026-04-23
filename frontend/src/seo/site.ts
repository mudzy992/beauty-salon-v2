export const site = {
  baseUrl: 'https://nejra-v2.ba101.top',
  siteName: 'Beauty Salon Nejra',
  defaultTitle: 'Beauty Salon Nejra',
  titleTemplate: '%s | Beauty Salon Nejra',
  defaultDescription:
    'Beauty Salon Nejra – profesionalne frizerske i beauty usluge. Rezervišite termin online i upoznajte naš tim i ponudu.',
  defaultLocale: 'bs',
  supportedLocales: ['bs', 'en'] as const,
  defaultOgImagePath: '/android-chrome-512x512.png',
  twitter: {
    card: 'summary_large_image' as const,
  },
} as const

export type SupportedLocale = (typeof site.supportedLocales)[number]
