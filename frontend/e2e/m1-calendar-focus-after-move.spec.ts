import { expect, test } from '@playwright/test'

// The move is intercepted, never sent to a real backend; input fill isolates the focus-return behaviour.
for (const theme of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    test(`M3 calendar focus after moved event disappears ${theme} ${language}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.clock.setFixedTime(new Date('2026-03-04T12:00:00Z'))
      await page.addInitScript(({ mode, locale }) => {
        localStorage.setItem('token', 'fixture-admin-token')
        localStorage.removeItem('nejra.theme')
        localStorage.setItem('nejra.theme.mode', mode)
        localStorage.setItem('APP_LOCALE', locale)
      }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
      const stylist = { id: 's', isActive: true, user: { firstName: 'Ana', lastName: 'Test' } }
      const reservation = { id: 'res', reservationDate: '2026-03-04', startTime: '12:00', endTime: '13:00', status: 'CONFIRMED', clientNotes: null, cancelReason: null, createdAt: '2026-03-01T12:00:00Z', confirmedStylist: stylist, service: { id: 'svc', name: 'Test usluga', durationMinutes: 60, price: 50 }, client: { id: 'c', firstName: 'Test', lastName: 'Klijent' } }
      const writes: { method: string; path: string; body: unknown }[] = []
      await page.route('**/api/**', route => {
        const request = route.request(), path = new URL(request.url()).pathname
        if (request.method() !== 'GET') {
          writes.push({ method: request.method(), path, body: request.postDataJSON() })
          if (request.method() === 'PATCH' && path === '/api/reservations/res') return route.fulfill({ json: {} })
          return route.abort()
        }
        if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
        if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
        if (path === '/api/stylists') return route.fulfill({ json: [stylist] })
        if (path === '/api/reservations') return route.fulfill({ json: writes.length ? [] : [reservation] })
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/reservations/calendar', { waitUntil: 'networkidle' })
      await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
      await expect(page.locator('html')).toHaveAttribute('lang', language)
      const event = page.locator('.rbc-event').first()
      await expect(event).toBeVisible()
      for (let i = 0; i < 160 && !(await event.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
      await expect(event).toBeFocused()
      await page.keyboard.press('Enter')
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      const start = dialog.locator('#res-details-start')
      for (let i = 0; i < 50 && !(await start.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
      await expect(start).toBeFocused()
      await start.fill('11:30')
      const save = dialog.getByRole('button', { name: /sačuvaj promjene|save changes/i })
      await expect(save).toBeEnabled()
      for (let i = 0; i < 50 && !(await save.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
      await expect(save).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(dialog).toBeHidden()
      await expect(page.locator('.rbc-event')).toHaveCount(0)
      await expect(page.getByRole('button', { name: /novi termin|new appointment/i })).toBeFocused()
      expect(writes).toEqual([{ method: 'PATCH', path: '/api/reservations/res', body: { reservationDate: '2026-03-04', startTime: '11:30', endTime: '13:00' } }])
    })
  }
}
