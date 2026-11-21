import { expect, test } from '@playwright/test'

// Synthetic data only; mutations are blocked, and navigation is exercised with Tab and Enter.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const action of ['not-found', 'direct', 'details', 'payment'] as const) {
      test(`M1 keyboard navigation ${theme} ${language} ${action}`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.addInitScript(({ mode, locale, stylist }) => {
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', mode)
          localStorage.setItem('APP_LOCALE', locale)
          if (stylist) localStorage.setItem('token', 'fixture-stylist-token')
          else localStorage.removeItem('token')
        }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language, stylist: action !== 'not-found' })
        const reservation = {
          id: 'reservation-test', clientId: 'client-test', serviceId: 'service-test',
          reservationDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          startTime: '12:00', endTime: '13:00', status: 'IN_PROGRESS', confirmedStylistId: 'stylist-profile',
          service: { id: 'service-test', name: 'Test usluga', durationMinutes: 60, price: 45 },
          client: { id: 'client-test', firstName: 'Test', lastName: 'Klijent' },
        }
        const writes: string[] = []
        await page.route('**/api/**', route => {
          const request = route.request()
          const path = new URL(request.url()).pathname
          if (request.method() !== 'GET') { writes.push(`${request.method()} ${path}`); return route.abort() }
          if (path === '/api/settings/public') return route.fulfill({ json: [
            { key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' },
            { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' },
          ] })
          if (path === '/api/users/profile') return route.fulfill({ json: {
            id: 'stylist-user', username: 'test', firstName: 'Test', lastName: 'Stylist',
            email: 'stylist@example.test', gender: 'FEMALE', genderOnboardingCompleted: true,
            isEmailVerified: true, mustChangePassword: false, roles: ['STYLIST'],
          } })
          if (path === '/api/stylists/me') return route.fulfill({ json: { id: 'stylist-profile' } })
          if (path === '/api/reservations') return route.fulfill({ json: [reservation] })
          if (path === '/api/reservations/reservation-test') return route.fulfill({ json: reservation })
          if (path === '/api/client-debts') return route.fulfill({ json: [] })
          return route.fulfill({ json: {} })
        })
        await page.goto(action === 'not-found' ? '/m1-nonexistent-route' : '/stylist/schedule', { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
        await expect(page.locator('html')).toHaveAttribute('lang', language)
        const target = action === 'not-found'
          ? page.getByRole('link', { name: /nazad na početnu|back to home/i })
          : action === 'direct'
            ? page.getByRole('link', { name: /direktna rezervacija|direct booking/i })
            : page.locator('[data-stylist-schedule-card]').getByRole('link', { name: action === 'details' ? /^detalji$|^details$/i : /^naplata$|^payment$/i })
        await expect(target).toHaveCount(1)
        await expect(target).toBeVisible()
        await expect(target.locator('button, a, input, select, textarea')).toHaveCount(0)
        const destination = action === 'not-found' ? '/' : action === 'direct' ? '/stylist/schedule/new' : '/stylist/schedule/reservation-test'
        await expect(target).toHaveAttribute('href', action === 'payment' ? `${destination}?action=complete` : destination)
        for (let i = 0; i < 100 && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
        await expect(target).toBeFocused()
        expect(await target.evaluate(el => el.matches(':focus-visible'))).toBe(true)
        await page.keyboard.press('Enter')
        await expect.poll(() => new URL(page.url()).pathname).toBe(destination)
        if (action === 'payment') {
          const dialog = page.getByRole('dialog')
          await expect(dialog).toBeVisible()
          await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
        } else if (action !== 'not-found') {
          const main = page.locator('#main')
          await expect(main).toBeFocused()
          expect(await main.evaluate(el => el.matches(':focus-visible'))).toBe(true)
          const outline = await main.evaluate(el => ({ style: getComputedStyle(el).outlineStyle, color: getComputedStyle(el).outlineColor, width: getComputedStyle(el).outlineWidth }))
          expect(outline.style).not.toBe('none')
          expect(outline.color).not.toBe('rgba(0, 0, 0, 0)')
          expect(parseFloat(outline.width)).toBeGreaterThan(0)
          const visibility = await main.evaluate(el => {
            const rect = el.getBoundingClientRect()
            const header = document.querySelector('header')?.getBoundingClientRect()
            return { top: rect.top, headerBottom: header?.bottom ?? 0 }
          })
          expect(visibility.top).toBeGreaterThanOrEqual(visibility.headerBottom - 1)
        }
        expect(writes).toEqual([])
      })
    }
  }
}
