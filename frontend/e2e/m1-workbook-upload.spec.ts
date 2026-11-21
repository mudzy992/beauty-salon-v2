import { expect, test } from '@playwright/test'

// Isolated responses and synthetic image only; no upload or daily-log write reaches a backend.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const imageKind of ['before', 'after'] as const) {
      for (const key of ['Enter', 'Space'] as const) {
        for (const scenario of ['success', 'failure', 'focus-moved', 'cancel'] as const) {
          test(`M1 workbook upload ${theme} ${language} ${imageKind} ${key} ${scenario}`, async ({ page }) => {
            await page.setViewportSize({ width: 1280, height: 900 })
            await page.emulateMedia({ reducedMotion: 'reduce' })
            await page.addInitScript(({ mode, locale }) => {
              localStorage.setItem('token', 'fixture-stylist-token')
              localStorage.removeItem('nejra.theme')
              localStorage.setItem('nejra.theme.mode', mode)
              localStorage.setItem('APP_LOCALE', locale)
            }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
            const requests: { method: string; path: string; body?: unknown }[] = []
            let releaseUpload: () => void = () => {}
            const uploadGate = new Promise<void>(resolve => { releaseUpload = resolve })
            await page.route('**/api/**', async route => {
              const request = route.request()
              const path = new URL(request.url()).pathname
              if (request.method() === 'GET') {
                if (path === '/api/settings/public') return route.fulfill({ json: [
                  { key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' },
                  { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' },
                ] })
                if (path === '/api/users/profile') return route.fulfill({ json: {
                  id: 'stylist-user', username: 'test', firstName: 'Test', lastName: 'Stylist',
                  email: 'stylist@example.test', gender: 'FEMALE', genderOnboardingCompleted: true,
                  isEmailVerified: true, mustChangePassword: false, roles: ['STYLIST'],
                } })
                if (path === '/api/daily-log/entry-test') return route.fulfill({ json: {
                  id: 'entry-test', publicReferenceCode: 'DK-TEST', stylistProfileId: 'stylist-profile',
                  date: '2026-01-01', status: 'IN_PROGRESS', images: [], isManual: true,
                  service: { id: 'service-test', name: 'Test usluga' },
                  client: { id: 'client-test', firstName: 'Test', lastName: 'Klijent' },
                  actualPrice: 45, tipAmount: 5, notes: 'Test fixture',
                } })
                if (path === '/api/stylists/me') return route.fulfill({ json: { id: 'stylist-profile' } })
                return route.fallback()
              }
              const entry: { method: string; path: string; body?: unknown } = { method: request.method(), path }
              if (path.endsWith('/images')) entry.body = request.postDataJSON()
              requests.push(entry)
              if (request.method() === 'POST' && path === '/api/uploads') {
                if (scenario === 'focus-moved') await uploadGate
                if (scenario === 'failure') return route.fulfill({ status: 503, json: {} })
                return route.fulfill({ json: { id: 'synthetic-upload' } })
              }
              if (request.method() === 'POST' && path === '/api/daily-log/entry-test/images') return route.fulfill({ json: { id: 'synthetic-attachment' } })
              return route.abort()
            })
            await page.goto('/stylist/workbook/entry-test', { waitUntil: 'networkidle' })
            await expect(page).toHaveURL(/\/stylist\/workbook\/entry-test$/)
            await expect(page.getByRole('heading', { name: 'DK-TEST' })).toBeVisible()
            await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
            await expect(page.locator('html')).toHaveAttribute('lang', language)
            const target = page.locator('input[type="file"]').nth(imageKind === 'before' ? 0 : 1).locator('xpath=following-sibling::button[1]')
            await expect(target).toBeVisible()
            await expect(target).toHaveAccessibleName(imageKind === 'before' ? /dodaj prije|add before/i : /dodaj poslije|add after/i)
            // Start at the document's first tab stop, not by focusing the upload button.
            for (let i = 0; i < 100 && !(await target.evaluate(el => el === document.activeElement)); i++) {
              await page.keyboard.press('Tab')
            }
            await expect(target).toBeFocused()
            expect(await target.evaluate(el => el.matches(':focus-visible'))).toBe(true)
            const [chooser] = await Promise.all([
              page.waitForEvent('filechooser', { timeout: 3_000 }),
              page.keyboard.press(key),
            ])
            await chooser.setFiles(scenario === 'cancel' ? [] : { name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from('synthetic image') })
            if (scenario === 'cancel') {
              await expect(target).toBeEnabled()
              await expect(target).toBeFocused()
              expect(requests).toEqual([])
              return
            }
            if (scenario === 'focus-moved') {
              await expect.poll(() => requests.length).toBe(1)
              await expect(target).toBeDisabled()
              // Simulate a deliberate focus move while the upload is pending.
              const other = page.locator('a[href="/stylist/workbook"]').first()
              await other.focus()
              await expect(other).toBeFocused()
              releaseUpload()
              await expect(target).toBeEnabled()
              await expect(other).toBeFocused()
            } else {
              await expect(target).toBeEnabled()
              await expect(target).toBeFocused()
            }
            await expect.poll(() => requests.length).toBe(scenario === 'failure' ? 1 : 2)
            expect(requests).toEqual(scenario === 'failure' ? [
              { method: 'POST', path: '/api/uploads' },
            ] : [
              { method: 'POST', path: '/api/uploads' },
              { method: 'POST', path: '/api/daily-log/entry-test/images', body: {
                uploadId: 'synthetic-upload', isBefore: imageKind === 'before', isAfter: imageKind === 'after',
              } },
            ])
          })
        }
      }
    }
  }
}
