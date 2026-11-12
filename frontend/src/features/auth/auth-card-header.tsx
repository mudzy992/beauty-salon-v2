import { LanguageSwitcher } from '../../components/i18n/language-switcher'
import { ThemeSwitcher } from '../shell/theme/theme-switcher'

/**
 * NEJRA §12 / odluka `card_header` (2026-11-11, uz `approve_s5`): izbornik teme i
 * jezika stoji U ZAGLAVLJU auth/onboarding kartice, **iznad `<h1>`**, na istom
 * relativnom mjestu na svih 7 ekrana bez shella (3.2.6 Consistent Help/Navigation).
 *
 * Ovo je jedini novi feature iz Q8/§12 i zato je jedina namjerna promjena
 * klasičnog DOM-a u S5. Sve Aurum boje dolaze isključivo iz `[data-skin="aurum"]`
 * CSS bloka; bez tog atributa komponenta je običan flex red. Nema novih stringova:
 * `ThemeSwitcher` i `LanguageSwitcher` već koriste postojeće BS/EN ključeve.
 */
export function AuthCardHeader({ className = '' }: { className?: string }) {
  return (
    <div
      data-aurum-card-header
      className={`mb-6 flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <ThemeSwitcher />
      <LanguageSwitcher />
    </div>
  )
}
