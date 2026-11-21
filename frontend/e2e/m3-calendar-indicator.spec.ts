import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { AXE_RULE_TAGS, assertableViolations } from './axe-coverage.mjs'

// Computed solid outline versus the event's declared solid fill; not a pixel or full-page audit.
function contrast(a: string, b: string) {
  const rgb = (color: string) => {
    const parts = color.match(/[\d.]+/g)?.map(Number) ?? []
    if (parts.length < 3 || (parts.length > 3 && parts[3] !== 1)) throw new Error(`Expected opaque RGB: ${color}`)
    const v = parts.slice(0, 3).map(c => { const n = c / 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4 })
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
  }
  const x = rgb(a), y = rgb(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const status of ['CONFIRMED', 'COMPLETED', 'PENDING', 'CANCELLED_BY_CLIENT', 'IN_PROGRESS'] as const) {
    for (const view of ['week', 'month', 'agenda'] as const) {
      test(`M3 calendar event indicator ${theme} ${status} ${view}`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.clock.setFixedTime(new Date('2026-03-04T12:00:00Z'))
        await page.addInitScript(mode => {
          localStorage.setItem('token', 'fixture-admin-token')
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', mode)
          localStorage.setItem('APP_LOCALE', 'en')
        }, theme === 'dark' ? 'dark' : 'light')
        const stylist = { id: 's', isActive: true, user: { firstName: 'Ana', lastName: 'Test' } }
        const reservation = { id: 'res', reservationDate: '2026-03-04', startTime: '12:00', endTime: '13:00', status, clientNotes: null, cancelReason: null, createdAt: '2026-03-01T12:00:00Z', confirmedStylist: stylist, service: { id: 'svc', name: 'Test usluga', durationMinutes: 60, price: 50 }, client: { id: 'c', firstName: 'Test', lastName: 'Klijent' } }
        await page.route('**/api/**', route => {
          const request = route.request(), path = new URL(request.url()).pathname
          if (request.method() !== 'GET') return route.abort()
          if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
          if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
          if (path === '/api/stylists') return route.fulfill({ json: [stylist] })
          if (path === '/api/reservations') return route.fulfill({ json: [reservation] })
          return route.fulfill({ json: {} })
        })
        await page.goto('/admin/reservations/calendar', { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
        if (view !== 'week') {
          const viewButton = page.getByRole('button', { name: view === 'agenda' ? /^agenda$/i : /^month$/i })
          for (let i = 0; i < 80 && !(await viewButton.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
          await expect(viewButton).toBeFocused()
          await page.keyboard.press('Enter')
        }
        const target = view === 'week' ? page.locator('.rbc-event').first() : view === 'month' ? page.locator('.rbc-month-view .rbc-event button').first() : page.locator('.rbc-agenda-event-cell button').first()
        await expect(target).toBeVisible()
        for (let i = 0; i < 160 && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
        await expect(target).toBeFocused()
        const result = await target.evaluate((el, viewKind) => {
          const style = getComputedStyle(el)
          const surface = viewKind === 'week' ? el : viewKind === 'month' ? el.closest('.rbc-event')! : el.closest('tr')!
          const rect = el.getBoundingClientRect(), x = (rect.left + rect.right) / 2, y = (rect.top + rect.bottom) / 2
          const top = document.elementFromPoint(x, y)
          return { visible: el.matches(':focus-visible'), outline: style.outlineColor, width: style.outlineWidth, offset: style.outlineOffset, style: style.outlineStyle, background: getComputedStyle(surface).backgroundColor, centerHit: !!top && (top === el || el.contains(top)) }
        }, view)
        expect(result.visible).toBe(true)
        expect(result.style).toBe('solid')
        expect(parseFloat(result.width)).toBeGreaterThanOrEqual(3)
        expect(parseFloat(result.offset)).toBeLessThanOrEqual(-3)
        expect(contrast(result.outline, result.background)).toBeGreaterThanOrEqual(3)
        expect(result.centerHit).toBe(true)
        if (status === 'CONFIRMED') {
          const scope = view === 'week' ? '.rbc-time-view' : view === 'month' ? '.rbc-month-view' : '.rbc-agenda-view'
          const axe = await new AxeBuilder({ page }).include(scope).withTags(AXE_RULE_TAGS).analyze()
          expect(assertableViolations(axe.violations)).toEqual([])
        }
      })
    }
  }
}
