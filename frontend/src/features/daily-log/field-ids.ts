/**
 * Stabilni `id`-ovi polja forme dnevne knjige.
 *
 * Postoje kao konstante da hook (`use-daily-log-form.ts`) i JSX dijele isti izvor istine:
 * greška mora znati na koje polje pokazuje, a `aria-describedby` na kontroli mora pokazivati
 * na `${id}-error`.
 *
 * 🔴 Id-ovi u JSX-u (`entry-form-fields.tsx`, `pricing-panel.tsx`) namjerno ostaju
 * **literali**: `daily-log-form-a11y.test.mjs` ih asertira regexom nad izvorom
 * (`id="dailylog-client"[\s\S]*?aria-expanded=`), pa bi zamjena izrazom slomila taj ugovor.
 * Umjesto toga `daily-log-form-error-a11y.test.mjs` dokazuje da se ovi konstantni id-ovi i
 * literali u JSX-u poklapaju — jedan izvor istine, bez diranja postojećeg testa.
 */
export const DAILY_LOG_FIELD = {
  stylist: 'dailylog-stylist',
  client: 'dailylog-client',
  services: 'dailylog-services',
  paid: 'dailylog-amount-paid',
} as const

export type DailyLogFieldKey = keyof typeof DAILY_LOG_FIELD
