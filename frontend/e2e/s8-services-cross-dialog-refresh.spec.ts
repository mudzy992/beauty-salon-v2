import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const category = { id: 'cat', name: 'Category fixture', isActive: true, sortOrder: 0 }
const subcategory = { id: 'sub', categoryId: 'cat', name: 'Subcategory fixture', isActive: true, sortOrder: 0 }
const services = ['First service', 'Second service'].map((name, index) => ({ id: `svc-${index}`, name, subcategoryId: 'sub', durationMinutes: 30, price: 30, gender: 'FEMALE', isActive: true, sortOrder: index, heroImage: null, shortDescription: null }))
const impact = { service: { id: 'svc-0', name: 'First service', imageRetained: true }, target: null, reservations: { primary: 0, additionalServiceItems: 0 }, dailyLogs: { primary: 0, completed: 0, additionalServiceItems: 0, debtPaymentEntries: 0 }, income: { automaticEntries: 0, automaticRevenue: 0, automaticTips: 0, manualEntries: 0, manualRevenue: 0, manualTips: 0 }, debts: { count: 0, openCount: 0, amount: 0, openAmount: 0 }, images: { dailyLogImages: 0, consentRecordsRetained: 0 }, reviews: 0, stylistLinks: 0, pendingOutboxEvents: 0, duplicateStylistLinks: 0, mergeConflicts: { reservationItems: 0, dailyLogItems: 0, dailyLogReservations: 0, reviews: 0, processingOutboxEvents: 0 }, impactToken: 'fixture-token' }
const deferred = () => { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve }); return { promise, release } }

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    for (const pending of ['save', 'delete'] as const) {
      test(`late ${pending} cannot reload across a different services dialog ${language} ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
        const gate = deferred(), started = deferred(), refreshGate = deferred()
        let reads = 0, writes = 0
        await page.route('**/api/**', async route => {
          const req = route.request(), path = new URL(req.url()).pathname
          if (path === '/api/settings/public') return route.fulfill({ json: [] })
          if (path === '/api/users/profile') return route.fulfill({ json: profile })
          if (path === '/api/services/admin/categories') { reads++; if (reads > 1) await refreshGate.promise; return route.fulfill({ json: [category] }) }
          if (path === '/api/services/admin/subcategories') return route.fulfill({ json: [subcategory] })
          if (path === '/api/services/admin/services') return route.fulfill({ json: services })
          if (path.includes('/deletion-impact')) return route.fulfill({ json: impact })
          if (path === '/api/services/svc-0' && req.method() === (pending === 'save' ? 'PATCH' : 'DELETE')) {
            writes++; started.release(); await gate.promise; return route.fulfill({ json: {} })
          }
          if (req.method() !== 'GET') writes++
          return route.fulfill({ json: {} })
        })
        const edit = (index: number) => page.getByRole('button', { name: `${language === 'bs' ? 'Uredi uslugu' : 'Edit service'}: ${services[index].name}`, exact: true })
        const remove = (index: number) => page.getByRole('button', { name: `${language === 'bs' ? 'Obriši uslugu' : 'Delete service'}: ${services[index].name}`, exact: true })
        const cancel = (text: string) => page.getByRole('dialog').getByRole('button', { name: text, exact: true })
        try {
          await page.goto('/admin/services', { waitUntil: 'networkidle' })
          await page.getByRole('button', { name: /Category fixture/, expanded: false }).click()
          if (pending === 'save') {
            await edit(0).click()
            await cancel(language === 'bs' ? 'Sačuvaj' : 'Save').click()
            await started.promise
            await cancel(language === 'bs' ? 'Odustani' : 'Cancel').click()
            await remove(1).click()
            await page.getByRole('dialog').locator('#service-delete-confirmation').fill('draft')
          } else {
            await remove(0).click()
            await page.getByRole('dialog').locator('#service-delete-confirmation').fill('First service')
            await cancel(language === 'bs' ? 'Trajno obriši sve povezano' : 'Permanently delete all linked data').click()
            await started.promise
            await cancel(language === 'bs' ? 'Zatvori' : 'Close').first().click()
            await edit(1).click()
            await page.getByRole('dialog').locator('#services-service-name').fill('Draft second service')
          }
          if (pending === 'save') await page.getByRole('dialog').locator('#service-delete-confirmation').fill('Second service')
          const blocked = page.getByRole('dialog').getByRole('button', { name: pending === 'save' ? (language === 'bs' ? 'Trajno obriši sve povezano' : 'Permanently delete all linked data') : (language === 'bs' ? 'Sačuvaj' : 'Save'), exact: true })
          await expect(blocked).toBeEnabled()
          await blocked.focus()
          const initialReads = reads
          const response = page.waitForResponse(r => r.url().endsWith('/api/services/svc-0') && r.request().method() === (pending === 'save' ? 'PATCH' : 'DELETE'))
          gate.release(); await response
          await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
          const dialog = page.getByRole('dialog')
          await expect(dialog).toBeVisible()
          await expect(dialog.locator(pending === 'save' ? '#service-delete-confirmation' : '#services-service-name')).toHaveValue(pending === 'save' ? 'Second service' : 'Draft second service')
          await expect(dialog.getByRole('alert')).toContainText(language === 'bs' ? 'Katalog se promijenio' : 'The catalogue has changed')
          await expect(blocked).toHaveAttribute('aria-disabled', 'true')
          await expect(blocked).toBeFocused()
          await page.keyboard.press('Enter')
          await expect(dialog).toBeVisible()
          if (pending === 'delete') {
            await expect(dialog.getByRole('button', { name: language === 'bs' ? 'Učitaj sliku' : 'Upload image' })).toHaveAttribute('aria-disabled', 'true')
            await dialog.locator('input[type=file]').setInputFiles({ name: 'stale.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fixture') })
          }
          if (width === 1280) {
            const axe = await new AxeBuilder({ page }).include('[role="dialog"]').withRules(['button-name', 'aria-valid-attr', 'aria-allowed-attr']).analyze()
            expect(axe.violations).toEqual([])
          }
          expect(reads).toBe(initialReads)
          expect(writes).toBe(1)
          await cancel(language === 'bs' ? 'Odustani' : 'Cancel').click()
          await expect.poll(() => reads).toBeGreaterThan(initialReads)
          refreshGate.release()
        } finally { gate.release(); refreshGate.release() }
      })
    }
  }
}

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`category confirmation cannot use a stale catalogue after an earlier save ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      const gate = deferred(), started = deferred(), refreshGate = deferred()
      let reads = 0, writes = 0
      await page.route('**/api/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/services/admin/categories') { reads++; if (reads > 1) await refreshGate.promise; return route.fulfill({ json: [category] }) }
        if (path === '/api/services/admin/subcategories') return route.fulfill({ json: [subcategory] })
        if (path === '/api/services/admin/services') return route.fulfill({ json: services })
        if (path === '/api/services/svc-0' && req.method() === 'PATCH') { writes++; started.release(); await gate.promise; return route.fulfill({ json: {} }) }
        if (req.method() !== 'GET') writes++
        return route.fulfill({ json: {} })
      })
      try {
        await page.goto('/admin/services', { waitUntil: 'networkidle' })
        await page.getByRole('button', { name: /Category fixture/, expanded: false }).click()
        await page.getByRole('button', { name: `${language === 'bs' ? 'Uredi uslugu' : 'Edit service'}: First service`, exact: true }).click()
        await page.getByRole('dialog').getByRole('button', { name: language === 'bs' ? 'Sačuvaj' : 'Save', exact: true }).click()
        await started.promise
        await page.getByRole('dialog').getByRole('button', { name: language === 'bs' ? 'Odustani' : 'Cancel', exact: true }).click()
        await page.getByRole('button', { name: `${language === 'bs' ? 'Obriši kategoriju' : 'Delete category'}: Category fixture`, exact: true }).click()
        const dialog = page.getByRole('dialog')
        const confirm = dialog.getByRole('button', { name: language === 'bs' ? 'Obriši' : 'Delete', exact: true })
        await confirm.focus()
        const before = reads
        const response = page.waitForResponse(r => r.url().endsWith('/api/services/svc-0') && r.request().method() === 'PATCH')
        gate.release(); await response
        await expect(dialog.getByRole('alert')).toContainText(language === 'bs' ? 'Katalog se promijenio' : 'The catalogue has changed')
        await expect(confirm).toHaveAttribute('aria-disabled', 'true')
        await expect(confirm).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(dialog).toBeVisible()
        if (width === 1280) {
          const axe = await new AxeBuilder({ page }).include('[role="dialog"]').withRules(['button-name', 'aria-valid-attr', 'aria-allowed-attr']).analyze()
          expect(axe.violations).toEqual([])
        }
        expect(writes).toBe(1)
        expect(reads).toBe(before)
        await dialog.getByRole('button', { name: language === 'bs' ? 'Odustani' : 'Cancel', exact: true }).click()
        await expect.poll(() => reads).toBeGreaterThan(before)
        refreshGate.release()
      } finally { gate.release(); refreshGate.release() }
    })
  }
}
