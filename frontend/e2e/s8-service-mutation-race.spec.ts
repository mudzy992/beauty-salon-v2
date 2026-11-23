import { expect, test } from '@playwright/test'

function deferred() {
  let release!: () => void
  const promise = new Promise<void>(resolve => { release = resolve })
  return { promise, release }
}

for (const status of [200, 500] as const) {
  test(`late service deletion ${status} does not replace a later dialog`, async ({ page }) => {
    const mutationStarted = deferred(), mutationResponse = deferred()
    const services = ['First service', 'Second service'].map((name, index) => ({ id: `svc-${index}`, name, subcategoryId: 'sub', durationMinutes: 30, price: 30, gender: 'FEMALE', isActive: true, sortOrder: index, heroImage: null, shortDescription: null }))
    const writes: unknown[] = []
    let catalogueLoads = 0
    await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
    await page.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname
      if (req.method() === 'DELETE') {
        writes.push({ path, body: req.postDataJSON() })
        mutationStarted.release()
        await mutationResponse.promise
        if (status === 200) services.splice(0, 1)
        return route.fulfill({ status, json: status === 200 ? {} : { message: 'Synthetic failure' } })
      }
      if (path === '/api/settings/public') return route.fulfill({ json: [] })
      if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
      if (path === '/api/services/admin/categories') { catalogueLoads++; return route.fulfill({ json: [{ id: 'cat', name: 'Category fixture', isActive: true, sortOrder: 0 }] }) }
      if (path === '/api/services/admin/subcategories') return route.fulfill({ json: [{ id: 'sub', categoryId: 'cat', name: 'Subcategory fixture', isActive: true, sortOrder: 0 }] })
      if (path === '/api/services/admin/services') return route.fulfill({ json: services })
      if (/^\/api\/services\/admin\/services\/svc-\d\/deletion-impact$/.test(path)) {
        const id = path.split('/')[5], name = services.find(s => s.id === id)!.name
        return route.fulfill({ json: {
          service: { id, name, imageRetained: false }, target: null,
          reservations: { primary: id === 'svc-0' ? 1 : 2, additionalServiceItems: 0 }, dailyLogs: { primary: 0, completed: 0, additionalServiceItems: 0, debtPaymentEntries: 0 },
          income: { automaticEntries: 0, automaticRevenue: 0, automaticTips: 0, manualEntries: 0, manualRevenue: 0, manualTips: 0 },
          debts: { count: 0, openCount: 0, amount: 0, openAmount: 0 }, images: { dailyLogImages: 0, consentRecordsRetained: 0 },
          reviews: 0, stylistLinks: 0, pendingOutboxEvents: 0, duplicateStylistLinks: 0,
          mergeConflicts: { reservationItems: 0, dailyLogItems: 0, dailyLogReservations: 0, reviews: 0, processingOutboxEvents: 0 }, impactToken: `token-${id}`,
        } })
      }
      return route.fulfill({ json: {} })
    })
    try {
      await page.goto('/admin/services', { waitUntil: 'networkidle' })
      await page.getByRole('button', { name: /Category fixture/, expanded: false }).click()
      await page.getByRole('button', { name: 'Delete service: First service' }).click()
      const dialog = page.getByRole('dialog'), summary = dialog.locator('section[aria-labelledby="service-deletion-impact-title"]')
      await expect(summary).toBeVisible()
      await dialog.locator('#service-delete-confirmation').fill('First service')
      await dialog.getByRole('button', { name: 'Permanently delete all linked data' }).click()
      await mutationStarted.promise
      await expect(dialog.getByRole('button', { name: /Merge into another service/ })).toBeDisabled()
      await expect(dialog.locator('#service-delete-confirmation')).toBeDisabled()
      await expect(dialog.getByRole('status')).toContainText('Closing this dialog will not cancel it')
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await page.getByRole('button', { name: 'Delete service: Second service' }).click()
      await expect(dialog).toContainText('Second service')
      await expect(summary.locator('dd').first()).toHaveText('2')
      await expect(dialog.locator('#service-delete-confirmation')).toBeDisabled()
      const loadsBeforeResponse = catalogueLoads
      const response = page.waitForResponse(r => r.request().method() === 'DELETE' && r.url().endsWith('/api/services/svc-0'))
      mutationResponse.release()
      await response
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
      await expect(dialog).toBeVisible()
      await expect(dialog).toContainText('Second service')
      await expect(summary.locator('dd').first()).toHaveText('2')
      await expect(dialog.locator('#service-delete-confirmation')).toBeEnabled()
      await expect(page.locator('[data-sonner-toast]')).toContainText(status === 200 ? 'Service deleted.' : 'Could not delete the service.')
      expect(catalogueLoads).toBe(loadsBeforeResponse)
      expect(writes).toEqual([{ path: '/api/services/svc-0', body: { action: 'DELETE_LINKED_RECORDS', confirmationName: 'First service', impactToken: 'token-svc-0' } }])
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      if (status === 200) {
        await expect.poll(() => catalogueLoads).toBeGreaterThan(loadsBeforeResponse)
        const category = page.getByRole('button', { name: /Category fixture/, expanded: false })
        await expect(category).toBeVisible()
        await category.click()
        await expect(page.getByRole('button', { name: 'Delete service: Second service' })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Delete service: First service' })).toHaveCount(0)
      } else {
        expect(catalogueLoads).toBe(loadsBeforeResponse)
      }
    } finally { mutationResponse.release() }
  })
}
