import { expect, test } from '@playwright/test'

// Test async ordering and retry without writing to a backend.
for (const language of ['bs', 'en'] as const) {
  for (const theme of ['classic', 'light', 'dark'] as const) {
    for (const scenario of ['race', 'error', 'error-move'] as const) {
      test(`M1 calendar loading ${language} ${theme} ${scenario}`, async ({ page }) => {
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
        const event = (name: string, date: string) => ({ id: 'res', reservationDate: date, startTime: '12:00', endTime: '13:00', status: 'CONFIRMED', clientNotes: null, cancelReason: null, createdAt: '2026-03-01T12:00:00Z', confirmedStylist: stylist, service: { id: 'svc', name, durationMinutes: 60, price: 50 }, client: { id: 'c', firstName: 'Test', lastName: 'Klijent' } })
        let count = 0, releaseOld: () => void = () => {}, oldFinished = false
        const oldGate = new Promise<void>(resolve => { releaseOld = resolve })
        const writes: string[] = []
        await page.route('**/api/**', async route => {
          const request = route.request(), path = new URL(request.url()).pathname
          if (request.method() !== 'GET') { writes.push(`${request.method()} ${path}`); return route.abort() }
          if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
          if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
          if (path === '/api/stylists') return route.fulfill({ json: [stylist] })
          if (path === '/api/reservations') {
            const n = ++count
            if (n === 1) return route.fulfill({ json: [event('Initial', '2026-03-04')] })
            if (scenario !== 'race' && n === 2) return route.fulfill({ status: 503, json: {} })
            if (scenario === 'error-move' && n === 3) await oldGate
            if (scenario === 'race' && n === 2) {
              await oldGate
              await route.fulfill({ json: [event('Stale response', '2026-03-16')] })
              oldFinished = true
              return
            }
            return route.fulfill({ json: [event('Latest response', scenario === 'race' ? '2026-03-16' : '2026-03-09')] })
          }
          return route.fulfill({ json: {} })
        })
        await page.goto('/admin/reservations/calendar', { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
        await expect(page.locator('html')).toHaveAttribute('lang', language)
        await expect(page.locator('.rbc-event')).toContainText('Initial')
        const next = page.getByRole('button', { name: /sljedeć|next/i }).first()
        for (let i = 0; i < 80 && !(await next.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
        await expect(next).toBeFocused()
        await page.keyboard.press('Enter')
        await expect.poll(() => count).toBe(2)
        if (scenario === 'race') {
          await expect(page.locator('main#calendar-main')).toHaveAttribute('aria-busy', 'true')
          await expect(page.locator('.rbc-event')).toHaveCount(0)
          await expect(next).toBeFocused()
          await page.keyboard.press('Enter')
          await expect.poll(() => count).toBe(3)
          await expect(page.locator('.rbc-event')).toContainText('Latest response')
          releaseOld()
          await expect.poll(() => oldFinished).toBe(true)
          await expect(page.locator('.rbc-event')).toContainText('Latest response')
          await expect(next).toBeFocused()
        } else {
          const retry = page.getByRole('button', { name: /^pokušaj ponovo$|^try again$/i })
          await expect(retry).toBeVisible()
          await expect(next).toBeFocused()
          await expect(page.locator('.rbc-event')).toHaveCount(0)
          for (let i = 0; i < 40 && !(await retry.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Shift+Tab')
          await expect(retry).toBeFocused()
          await page.keyboard.press('Enter')
          if (scenario === 'error-move') {
            await expect.poll(() => count).toBe(3)
            await expect(retry).toBeFocused()
            await page.keyboard.press('Tab')
            const back = page.getByRole('button', { name: /nazad|back/i }).first()
            await expect(back).toBeFocused()
            releaseOld()
            await expect(page.locator('.rbc-event')).toContainText('Latest response')
            await expect(back).toBeFocused()
          } else {
            await expect(page.locator('.rbc-event')).toContainText('Latest response')
            await expect(page.locator('main#calendar-main')).toBeFocused()
          }
          await expect(retry).toBeHidden()
        }
        expect(writes).toEqual([])
      })
    }
  }
}
