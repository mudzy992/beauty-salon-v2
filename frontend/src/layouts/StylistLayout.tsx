import { Link, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HelpCircle } from 'lucide-react'

import { LanguageSwitcher } from '../components/i18n/language-switcher'
import { useFocusOnNavigate } from '../hooks/use-focus-on-navigate'
import { useStylistPortalSocketRefresh } from '../features/stylist-portal/hooks/use-stylist-portal-socket-refresh'
import { SkipLink } from '../features/shell/admin/ui/skip-link'
import { ThemeSwitcher } from '../features/shell/theme/theme-switcher'
import { StylistNav } from './stylist-nav'
import { StylistUserMenu } from './stylist-user-menu'

/**
 * Shell stylist portala (S10).
 *
 * Struktura i ponašanje su identični prije refaktora: skip link kao prvi
 * fokusabilan element, jedna glavna navigacijska landmarka, `header` sa
 * pomoći + jezikom + temom + korisničkim menijem (WCAG 3.2.6 — pomoć je
 * odmah prije korisničkog menija), i `main` kao meta skip linka (WCAG 2.4.1).
 *
 * Izdvojeno: `stylist-nav.tsx` (stavke navigacije) i `stylist-user-menu.tsx`
 * (profil / prelazak na klijenta / odjava).
 */
export default function StylistLayout() {
  const { t } = useTranslation()

  useStylistPortalSocketRefresh()
  // WCAG 2.4.3 — fokus prati promjenu rute.
  useFocusOnNavigate()

  return (
    <div data-stylist-shell className="admin-shell min-h-screen bg-surface-sunken">
      <SkipLink targetId="main" />
      <header data-stylist-header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto max-w-[1600px] px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-4">
            <Link to="/stylist/inbox" className="font-semibold text-content">
              {t('shell.stylist.title')}
            </Link>
            <StylistNav />
          </div>

          <div className="flex items-center gap-2">
            {/* WCAG 3.2.6 — pomoć je na istom mjestu kao u admin panelu. */}
            <Link
              to="/kontakt"
              className="flex min-h-target min-w-target items-center justify-center rounded-md text-content-muted hover:bg-surface-muted hover:text-content"
            >
              <HelpCircle aria-hidden className="h-5 w-5" />
              <span className="sr-only">{t('shell.help')}</span>
            </Link>
            <LanguageSwitcher />
            {/* NEJRA §12 — stylist header; pomoć ostaje prije korisničkog menija (3.2.6). */}
            <ThemeSwitcher />
            <StylistUserMenu />
          </div>
        </div>
      </header>

      {/* WCAG 2.4.1/2.4.3 — skip link cilja ovaj landmark. */}
      <main id="main" tabIndex={-1} data-route-main className="mx-auto max-w-[1600px] px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}
