import { expect, test, type Locator, type Page } from '@playwright/test'

async function tabTo(page: Page, target: Locator, limit = 150) {
  await expect(target).toBeVisible()
  for (let i = 0; i < limit && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

// All writes intercepted. The table is populated only with synthetic data.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const viewport of ['desktop', 'mobile'] as const) {
      for (const scenario of ['detail', 'edit-escape', 'edit-submit', 'complete-failure', 'complete-success', 'complete-moved', 'delete-escape', 'delete-failure', 'delete-success', 'restore-escape', 'restore-failure', 'restore-success', 'restore-moved', 'restore-reset', 'restore-new-date', 'restore-future-direct', 'restore-future-standard'] as const) {
        test(`M1 daily log actions ${theme} ${language} ${viewport} ${scenario}`, async ({ page }) => {
          await page.setViewportSize(viewport === 'desktop' ? { width: 1280, height: 900 } : { width: 390, height: 844 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript(({ mode, locale }) => {
            localStorage.setItem('token', 'fixture-admin-token')
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', mode)
            localStorage.setItem('APP_LOCALE', locale)
          }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
          const future = scenario === 'restore-future-direct' || scenario === 'restore-future-standard'
          const entry = { id: 'entry-1', publicReferenceCode: 'DK-TEST', date: '2026-03-04', status: scenario.startsWith('complete') ? 'PENDING' : 'COMPLETED', actualPrice: 50, tipAmount: 0, isManual: !future, reservation: future ? { acceptanceMode: scenario === 'restore-future-direct' ? 'DIRECT_ASSIGN' : 'STANDARD', loyaltyDiscountPercent: 0, loyaltyDiscountAmount: 0 } : null, notes: null, completedAt: '2026-03-04T12:00:00Z', deletedAt: scenario.startsWith('restore') ? '2026-03-05T12:00:00Z' : null, service: { id: 'service-1', name: 'Test service', price: 50 }, items: [{ id: 'item-1', sortOrder: 0, serviceId: 'service-1', unitPrice: 50 }], stylistProfile: { id: 'stylist-1', user: { username: 'ana', firstName: 'Ana', lastName: 'Test' } } }
          const writes: { method: string; path: string; body: unknown }[] = []
          let mutated = false
          let releaseRequest!: () => void
          const requestGate = new Promise<void>(resolve => { releaseRequest = resolve })
          await page.route('**/api/**', async route => {
            const req = route.request(), path = new URL(req.url()).pathname
            if (req.method() !== 'GET') {
              writes.push({ method: req.method(), path, body: req.postDataJSON() })
              if (path === '/api/daily-log/entry-1' && req.method() === 'PATCH' && scenario === 'edit-submit') {
                if (writes.length === 1) return route.fulfill({ status: 503, json: {} })
                mutated = true
                return route.fulfill({ json: {} })
              }
              if (path === '/api/daily-log/entry-1' && req.method() === 'DELETE') {
                if (scenario === 'delete-failure') return route.fulfill({ status: 503, json: {} })
                mutated = true
                return route.fulfill({ json: {} })
              }
              if (path === '/api/daily-log/entry-1/restore' && req.method() === 'POST') {
                if (scenario === 'restore-moved') await requestGate
                if (scenario === 'restore-failure' || scenario === 'restore-moved') return route.fulfill({ status: 503, json: {} })
                mutated = true; return route.fulfill({ json: {} })
              }
              if (path === '/api/daily-log/entry-1/complete' && req.method() === 'POST') {
                if (scenario === 'complete-moved') await requestGate
                if (scenario === 'complete-failure') return route.fulfill({ status: 503, json: {} })
                mutated = true; return route.fulfill({ json: {} })
              }
              return route.abort()
            }
            if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
            if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
            if (path === '/api/daily-log') return route.fulfill({ json: mutated ? [] : [entry] })
            if (path === '/api/stylists') return route.fulfill({ json: [{ id: 'stylist-1', user: { username: 'ana', firstName: 'Ana', lastName: 'Test' } }] })
            if (path === '/api/services') return route.fulfill({ json: [{ id: 'service-1', name: 'Test service', price: 50 }] })
            if (path === '/api/users/for-daily-log') return route.fulfill({ json: [] })
            return route.fulfill({ json: {} })
          })
          await page.goto('/admin/daily-log', { waitUntil: 'networkidle' })
          await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          const name = scenario === 'detail' ? /pregledaj unos|view entry/i
            : scenario.startsWith('edit') ? /uredi unos|edit entry/i
              : scenario.startsWith('complete') ? /kompletiraj unos|complete entry/i
                : scenario.startsWith('delete') ? /obriši unos|delete entry/i : /vrati unos|restore entry/i
          const trigger = page.getByRole('button', { name }).filter({ visible: true })
          await tabTo(page, trigger)
          await page.keyboard.press('Enter')
          if (scenario.startsWith('complete')) {
            await expect.poll(() => writes.length).toBe(1)
            expect(writes[0]).toMatchObject({ method: 'POST', path: '/api/daily-log/entry-1/complete' })
            if (scenario === 'complete-moved') {
              const reset = page.getByRole('button', { name: /^resetuj$|^reset$/i })
              await tabTo(page, reset)
              releaseRequest()
              await expect(trigger).toHaveCount(0)
              await expect(reset).toBeFocused()
            } else if (scenario === 'complete-failure') {
              await expect(trigger).toBeFocused()
            } else {
              await expect(page.locator('main[tabindex="-1"]')).toBeFocused()
            }
            return
          }
          const dialog = page.getByRole('dialog')
          await expect(dialog).toBeVisible()
          if (scenario === 'edit-submit') {
            const notes = dialog.locator('#dailylog-notes')
            await tabTo(page, notes, 50)
            await page.keyboard.type('Edited fixture')
            const save = dialog.getByRole('button', { name: /^sačuvaj$|^save$/i })
            await tabTo(page, save, 50)
            await page.keyboard.press('Enter')
            const summary = dialog.locator('[role=alert][tabindex="-1"]')
            await expect(summary).toBeFocused()
            await expect(dialog).toBeVisible()
            await tabTo(page, save, 50)
            await page.keyboard.press('Enter')
            await expect(dialog).toBeHidden()
            await expect(page.locator('main[tabindex="-1"]')).toBeFocused()
            expect(writes).toHaveLength(2)
            for (const write of writes) expect(write).toMatchObject({
              method: 'PATCH', path: '/api/daily-log/entry-1',
              body: { stylistProfileId: 'stylist-1', notes: 'Edited fixture', status: 'COMPLETED', actualPrice: 50, items: [{ serviceId: 'service-1', unitPrice: 50 }] },
            })
            return
          }
          if (scenario === 'restore-reset' || scenario === 'restore-new-date' || future) {
            const chosenDate = future ? '2099-03-12' : '2026-03-12'
            const original = dialog.locator('input[name="restore-mode"][value="original"]')
            const newDateRadio = dialog.locator('input[name="restore-mode"][value="new"]')
            await tabTo(page, original, 40)
            await expect(original).toBeChecked()
            await page.keyboard.press('ArrowDown')
            await expect(newDateRadio).toBeFocused()
            await expect(newDateRadio).toBeChecked()
            const date = dialog.locator('#new-date')
            const confirm = dialog.getByRole('button', { name: /^potvrdi$|^confirm$/i })
            await expect(confirm).toBeDisabled()
            await tabTo(page, date, 40)
            // Fixture input, not a test of keyboard operation of an OS date widget.
            await date.fill(chosenDate)
            await page.keyboard.press('Shift+Tab')
            await expect(newDateRadio).toBeFocused()
            await page.keyboard.press('ArrowUp')
            await expect(original).toBeChecked()
            await expect(date).toHaveCount(0)
            await page.keyboard.press('ArrowDown')
            await expect(newDateRadio).toBeChecked()
            await expect(date).toHaveValue('')
            await expect(confirm).toBeDisabled()
            await tabTo(page, date, 40)
            await date.fill(chosenDate)
            if (future) {
              await expect(dialog.getByText(/nova rezervacija|new appointment/i)).toBeVisible()
              await expect(dialog.getByText(scenario === 'restore-future-direct' ? /Direktna rezervacija|Direct booking/i : /Standardna rezervacija|Standard booking/i)).toBeVisible()
            }
            if (scenario === 'restore-reset') {
              await page.keyboard.press('Escape')
              await expect(dialog).toBeHidden()
              await expect(trigger).toBeFocused()
              await page.keyboard.press('Enter')
              await expect(dialog).toBeVisible()
              await expect(original).toBeChecked()
              await expect(date).toHaveCount(0)
              await page.keyboard.press('Escape')
              await expect(dialog).toBeHidden()
              await expect(trigger).toBeFocused()
              expect(writes).toEqual([])
            } else {
              await tabTo(page, confirm, 40)
              await page.keyboard.press('Enter')
              await expect.poll(() => writes.length).toBe(1)
              expect(writes[0]).toEqual({ method: 'POST', path: '/api/daily-log/entry-1/restore', body: { date: chosenDate } })
              await expect(dialog).toBeHidden()
              await expect(page.locator('main[tabindex="-1"]')).toBeFocused()
            }
            return
          }
          if (scenario.endsWith('escape') || scenario === 'detail') {
            await page.keyboard.press('Escape')
            await expect(dialog).toBeHidden()
            await expect(trigger).toBeFocused()
            expect(writes).toEqual([])
          } else if (scenario.startsWith('delete')) {
            const reason = dialog.locator('#dailylog-delete-reason')
            await tabTo(page, reason, 40)
            await page.keyboard.type('Synthetic reason')
            const confirm = dialog.getByRole('button', { name: /^obriši$|^delete$/i })
            await tabTo(page, confirm, 40)
            await page.keyboard.press('Enter')
            await expect.poll(() => writes.length).toBe(1)
            expect(writes[0]).toEqual({ method: 'DELETE', path: '/api/daily-log/entry-1', body: { reason: 'Synthetic reason' } })
            if (scenario === 'delete-failure') {
              await expect(dialog).toBeVisible()
              await expect(confirm).toBeEnabled()
              await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
              await page.keyboard.press('Escape')
              await expect(dialog).toBeHidden()
              await expect(trigger).toBeFocused()
            } else {
              await expect(dialog).toBeHidden()
              await expect(page.locator('main[tabindex="-1"]')).toBeFocused()
            }
          } else {
            const confirm = dialog.getByRole('button', { name: /^potvrdi$|^confirm$/i })
            await tabTo(page, confirm, 40)
            await page.keyboard.press('Enter')
            await expect.poll(() => writes.length).toBe(1)
            expect(writes[0]).toMatchObject({ method: 'POST', path: '/api/daily-log/entry-1/restore', body: {} })
            if (scenario === 'restore-moved') {
              const radio = dialog.locator('input[name="restore-mode"][value="original"]')
              await tabTo(page, radio, 40)
              releaseRequest()
              await expect(confirm).toBeEnabled()
              await expect(radio).toBeFocused()
              await page.keyboard.press('Escape')
              await expect(dialog).toBeHidden()
              await expect(trigger).toBeFocused()
            } else if (scenario === 'restore-failure') {
              await expect(dialog).toBeVisible()
              await expect(confirm).toBeEnabled()
              await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
              await page.keyboard.press('Escape')
              await expect(dialog).toBeHidden()
              await expect(trigger).toBeFocused()
            } else {
              await expect(dialog).toBeHidden()
              await expect(page.locator('main[tabindex="-1"]')).toBeFocused()
            }
          }
        })
      }
    }
  }
}
