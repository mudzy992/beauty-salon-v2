/**
 * M1 (Q3 + Q7) — pod-pogledi analitike (`?tab=`) unutar `/admin/analytics`.
 *
 * Q7: „`client-analytics` / `stylist-analytics` postaju tabovi unutar
 * `/admin/analytics`; stare rute redirectuju."
 *
 * Pod-pogledi su od `S6` grupisani u bočnu traku (grupa „Analitika") umjesto kao
 * zaseban tab-menu na vrhu stranice, pa ovdje ostaje samo tip/čuvar taba koji
 * `AnalyticsHub` koristi da izabere panel — vidljiva navigacija je u sidebaru.
 */

export const ANALYTICS_TABS = ['overview', 'clients', 'stylists'] as const

export type AnalyticsTab = (typeof ANALYTICS_TABS)[number]

export const isAnalyticsTab = (value: string | null): value is AnalyticsTab =>
  !!value && (ANALYTICS_TABS as readonly string[]).includes(value)
