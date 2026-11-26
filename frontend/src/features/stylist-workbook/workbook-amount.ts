import { formatLocalizedNumber } from '../../i18n/locale-utils.mjs'

/**
 * Formatiranje iznosa u radnoj knjizi (S10).
 *
 * Izdvojeno iz `pages/workbook-new-entry-page.tsx` **bez promjene**: isti
 * `formatLocalizedNumber` sa dva decimalna mjesta i sufiks ` KM`.
 *
 * Razlog odvojenog mjesta: isti se prikaz koristi u kartici usluge, kartici
 * plaćanja i kartici lojalnosti, pa prije izdvajanja je bila duplirana u tri
 * komponente. `amount-format-consistency` dopušta ovaj fajl u allowlistu jer je
 * ručno sklopljen ` KM` ovdje **jedino mjesto** gdje je to dopušteno (i dalje
 * je lokalizovano: `49,90 KM` za bs).
 */
export const formatKm = (v: number, locale: string) =>
  `${formatLocalizedNumber(Number(v || 0), locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM`
