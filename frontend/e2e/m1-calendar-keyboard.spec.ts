import { expect, test, type Locator, type Page } from '@playwright/test'

// Fixed date and synthetic records only; no backend mutations or real client data.
async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible()
  for (let i = 0; i < 160 && !(await target.evaluate(el => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab')
  }
  await expect(target).toBeFocused()
}

for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const scenario of ['next', 'view', 'filter', 'create-enter', 'create-space', 'event-enter', 'event-space', 'month-enter', 'month-space', 'agenda-enter', 'agenda-space'] as const) {
      test(`M1 calendar ${theme} ${language} ${scenario}`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.clock.setFixedTime(new Date('2026-03-04T12:00:00Z'))
        await page.addInitScript(({ mode, locale }) => {
          localStorage.setItem('token', 'fixture-admin-token')
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', mode)
          localStorage.setItem('APP_LOCALE', locale)
        }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
        const stylist = { id: 'stylist-1', isActive: true, user: { firstName: 'Ana', lastName: 'Test', username: 'ana' } }
        const reservation = { id: 'res-1', reservationDate: '2026-03-04', startTime: '12:00', endTime: '13:00', status: 'CONFIRMED', clientNotes: null, cancelReason: null, createdAt: '2026-03-01T12:00:00Z', confirmedStylist: stylist, service: { id: 'service-1', name: 'Test usluga', durationMinutes: 60, price: 50 }, client: { id: 'client-1', firstName: 'Test', lastName: 'Klijent' } }
        const writes: string[] = [], ranges: string[] = []
        await page.route('**/api/**', async route => {
          const request = route.request(), url = new URL(request.url()), path = url.pathname
          if (request.method() !== 'GET') { writes.push(`${request.method()} ${path}`); return route.abort() }
          if (path === '/api/settings/public') return route.fulfill({ json: [
            { key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' },
            { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' },
          ] })
          if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin-1', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
          if (path === '/api/stylists') return route.fulfill({ json: [stylist] })
          if (path === '/api/services') return route.fulfill({ json: [{ id: 'service-1', name: 'Test usluga', durationMinutes: 60, price: 50 }] })
          if (path === '/api/reservations') { ranges.push(url.search); return route.fulfill({ json: [reservation] }) }
          return route.fulfill({ json: {} })
        })
        await page.goto('/admin/reservations/calendar', { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
        await expect(page.locator('html')).toHaveAttribute('lang', language)
        await expect(page.locator('.rbc-event')).toContainText('Test usluga')
        if (scenario === 'next' || scenario === 'view') {
          const target = scenario === 'next'
            ? page.getByRole('button', { name: /sljedeć|next/i }).first()
            : page.getByRole('button', { name: /^mjesec$|^month$/i })
          await tabTo(page, target)
          const count = ranges.length
          await page.keyboard.press('Enter')
          await expect.poll(() => ranges.length).toBeGreaterThan(count)
          await expect(target).toBeFocused()
          if (scenario === 'view') {
            await expect(page.locator('.rbc-month-view')).toBeVisible()
            await expect(target).toHaveAttribute('aria-pressed', 'true')
          }
        } else if (scenario === 'filter') {
          const target = page.getByRole('button', { name: 'Ana Test' })
          await tabTo(page, target)
          await expect(target).toHaveAttribute('aria-pressed', 'false')
          await page.keyboard.press('Space')
          await expect(target).toHaveAttribute('aria-pressed', 'true')
          await expect(target).toBeFocused()
          await expect(page.locator('.rbc-event')).toContainText('Test usluga')
          await page.keyboard.press('Space')
          await expect(target).toHaveAttribute('aria-pressed', 'false')
          await expect(target).toBeFocused()
        } else {
          if (scenario.startsWith('agenda') || scenario.startsWith('month')) {
            const viewButton = page.getByRole('button', { name: scenario.startsWith('agenda') ? /^agenda$/i : /^mjesec$|^month$/i })
            await tabTo(page, viewButton)
            await page.keyboard.press('Enter')
            await expect(page.locator(scenario.startsWith('agenda') ? '.rbc-agenda-view' : '.rbc-month-view')).toBeVisible()
            if (scenario.startsWith('month')) {
              await expect(page.locator('.rbc-date-cell.rbc-now button')).toHaveAccessibleName(/04.*2026/)
              await expect(page.locator('.rbc-month-view')).toHaveAttribute('role', 'group')
            }
          }
          const target = scenario.startsWith('create')
            ? page.getByRole('button', { name: /novi termin|new appointment/i })
            : scenario.startsWith('agenda')
              ? page.locator('.rbc-agenda-event-cell').getByRole('button', { name: /Test usluga/i })
              : scenario.startsWith('month')
                ? page.locator('.rbc-month-view .rbc-event').getByRole('button', { name: /Test usluga/i }).first()
                : page.locator('.rbc-event').first()
          await tabTo(page, target)
          if (scenario.startsWith('month') || scenario.startsWith('agenda')) await expect(target).toHaveAccessibleName(/2026.*Test usluga/)
          expect(await target.evaluate(el => el.matches(':focus-visible'))).toBe(true)
          await page.keyboard.press(scenario.endsWith('enter') ? 'Enter' : 'Space')
          const dialog = page.getByRole('dialog')
          await expect(dialog).toBeVisible()
          await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
          await page.keyboard.press('Escape')
          await expect(dialog).toBeHidden()
          await expect(target).toBeFocused()
        }
        expect(writes).toEqual([])
      })
    }
  }
}
