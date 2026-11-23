import { expect, test } from '@playwright/test'

function deferred() {
  let release!: () => void
  const promise = new Promise<void>(resolve => { release = resolve })
  return { promise, release }
}

for (const staleStatus of [200, 500] as const) {
  for (const scenario of ['conflict', 'clear', 'switch', 'waiting', 'reopen', 'closed-cancel', 'closed-escape'] as const) {
    test(`service preview ignores an older target response (${staleStatus}, ${scenario})`, async ({ page }) => {
      const oldStarted = deferred(), oldResponse = deferred(), newStarted = deferred(), newResponse = deferred()
      const services = ['Source service', 'Slow safe', 'Current conflict'].map((name, index) => ({
        id: `svc-${index}`, name, subcategoryId: 'sub', durationMinutes: 30, price: 30,
        gender: 'FEMALE', isActive: true, sortOrder: index, heroImage: null, shortDescription: null,
      }))
      const writes: string[] = []
      await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
      await page.route('**/api/**', async route => {
        const request = route.request(), url = new URL(request.url()), path = url.pathname
        if (request.method() !== 'GET') { writes.push(path); return route.abort() }
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
        if (path === '/api/services/admin/categories') return route.fulfill({ json: [{ id: 'cat', name: 'Category fixture', isActive: true, sortOrder: 0 }] })
        if (path === '/api/services/admin/subcategories') return route.fulfill({ json: [{ id: 'sub', categoryId: 'cat', name: 'Subcategory fixture', isActive: true, sortOrder: 0 }] })
        if (path === '/api/services/admin/services') return route.fulfill({ json: services })
        if (path === '/api/services/admin/services/svc-0/deletion-impact') {
          const target = url.searchParams.get('targetServiceId')
          if (target === 'svc-1') {
            oldStarted.release()
            await oldResponse.promise
            if (staleStatus === 500) return route.fulfill({ status: 500, json: { message: 'Old failure' } })
          }
          if (target === 'svc-2' && scenario === 'waiting') { newStarted.release(); await newResponse.promise }
          const targetName = target === 'svc-1' ? 'Slow safe' : target === 'svc-2' ? 'Current conflict' : null
          return route.fulfill({ json: {
            service: { id: 'svc-0', name: 'Source service', imageRetained: false }, target: target ? { id: target, name: targetName } : null,
            reservations: { primary: 1, additionalServiceItems: 0 }, dailyLogs: { primary: 0, completed: 0, additionalServiceItems: 0, debtPaymentEntries: 0 },
            income: { automaticEntries: 0, automaticRevenue: 0, automaticTips: 0, manualEntries: 0, manualRevenue: 0, manualTips: 0 },
            debts: { count: 0, openCount: 0, amount: 0, openAmount: 0 }, images: { dailyLogImages: 0, consentRecordsRetained: 0 },
            reviews: 0, stylistLinks: 0, pendingOutboxEvents: 0, duplicateStylistLinks: 0,
            mergeConflicts: { reservationItems: target === 'svc-2' ? 3 : 0, dailyLogItems: 0, dailyLogReservations: 0, reviews: 0, processingOutboxEvents: 0 }, impactToken: `token-${target ?? 'delete'}`,
          } })
        }
        return route.fulfill({ json: {} })
      })
      try {
        await page.goto('/admin/services', { waitUntil: 'networkidle' })
        await page.getByRole('button', { name: /Category fixture/, expanded: false }).click()
        await page.getByRole('button', { name: 'Delete service: Source service' }).click()
        const dialog = page.getByRole('dialog')
        const summary = dialog.locator('section[aria-labelledby="service-deletion-impact-title"]')
        await expect(summary).toBeVisible()
        await dialog.locator('#service-delete-confirmation').fill('Source service')
        await dialog.getByRole('button', { name: /Merge into another service/ }).click()
        await dialog.locator('#service-merge-target').selectOption('svc-1')
        await oldStarted.promise
        if (scenario === 'conflict' || scenario === 'waiting') {
          await dialog.locator('#service-merge-target').selectOption('svc-2')
          if (scenario === 'waiting') await newStarted.promise
          else {
            await expect(summary).toContainText('Current conflict')
            await expect(summary.getByRole('alert')).toBeVisible()
          }
        } else if (scenario === 'clear') {
          await dialog.locator('#service-merge-target').selectOption('')
        } else if (scenario === 'switch') {
          await dialog.getByRole('button', { name: /Permanently delete with records/ }).click()
          await expect(summary).toBeVisible()
        } else {
          if (scenario === 'closed-cancel') await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
          else await page.keyboard.press('Escape')
          await expect(dialog).toBeHidden()
          if (scenario === 'reopen') {
            await page.getByRole('button', { name: 'Delete service: Source service' }).click()
            await expect(summary).toBeVisible()
          }
        }
        await page.evaluate(() => {
          const observed: string[] = []
          ;(window as Window & { __raceToasts?: string[] }).__raceToasts = observed
          new MutationObserver(() => document.querySelectorAll('[data-sonner-toast]').forEach(el => observed.push(el.textContent ?? '')))
            .observe(document.body, { subtree: true, childList: true })
        })
        const response = page.waitForResponse(r => r.url().includes('targetServiceId=svc-1') && r.status() === staleStatus)
        oldResponse.release()
        await response
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
        if (scenario === 'waiting') {
          await expect(dialog.getByRole('status')).toContainText('Loading linked-record preview')
          await expect(dialog.getByRole('button', { name: 'Merge and reassign records' })).toBeDisabled()
          newResponse.release()
        }
        if (scenario === 'conflict' || scenario === 'waiting') {
          await expect(dialog.locator('#service-merge-target')).toHaveValue('svc-2')
          await expect(summary).toContainText('Current conflict')
          await expect(summary).not.toContainText('Slow safe')
          await expect(summary.getByRole('alert')).toBeVisible()
          await expect(dialog.getByRole('button', { name: 'Merge and reassign records' })).toBeDisabled()
        } else if (scenario === 'clear') {
          await expect(dialog.locator('#service-merge-target')).toHaveValue('')
          await expect(summary).toHaveCount(0)
          await expect(dialog.getByRole('button', { name: 'Merge and reassign records' })).toBeDisabled()
          await expect(dialog.getByRole('status')).toHaveCount(0)
        } else if (scenario === 'closed-cancel' || scenario === 'closed-escape') {
          await expect(dialog).toBeHidden()
          expect(await page.evaluate(() => (window as Window & { __raceToasts?: string[] }).__raceToasts ?? [])).not.toContain('Could not delete the service.')
        } else {
          await expect(summary).toBeVisible()
          await expect(summary).not.toContainText('Slow safe')
          await expect(dialog.getByRole('button', { name: 'Permanently delete all linked data' })).toBeVisible()
        }
        expect(writes).toEqual([])
      } finally { oldResponse.release(); newResponse.release() }
    })
  }
}
