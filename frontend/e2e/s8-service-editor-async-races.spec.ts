import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Route } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const category = { id: 'cat', name: 'Category fixture', isActive: true, sortOrder: 0 }
const subcategory = { id: 'sub', categoryId: 'cat', name: 'Subcategory fixture', isActive: true, sortOrder: 0 }
const services = ['First service', 'Second service'].map((name, index) => ({ id: `svc-${index}`, name, subcategoryId: 'sub', durationMinutes: 30, price: 30, gender: 'FEMALE', isActive: true, sortOrder: index, heroImage: `/uploads/original-${index}.jpg`, shortDescription: null }))
const deferred = () => { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve }); return { promise, release } }
async function setup(page: Page, language: string, handler: (route: Route, path: string) => Promise<void>) {
  await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
  await page.route('**/uploads/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>' }))
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    if (path === '/api/services/admin/categories') return route.fulfill({ json: [category] })
    if (path === '/api/services/admin/subcategories') return route.fulfill({ json: [subcategory] })
    if (path === '/api/services/admin/services') return route.fulfill({ json: services })
    return handler(route, path)
  })
  await page.goto('/admin/services', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Category fixture/, expanded: false }).click()
}
const name = (language: string, index: number) => language === 'bs' ? `Uredi uslugu: ${services[index].name}` : `Edit service: ${services[index].name}`
const file = (filename: string) => ({ name: filename, mimeType: 'image/jpeg', buffer: Buffer.from('fixture') })

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    for (const status of [200, 500] as const) {
      test(`stale service upload ${status} cannot alter a new editor or its in-flight upload ${language} ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        const first = deferred(), second = deferred(), firstStarted = deferred(), secondStarted = deferred()
        const writes: unknown[] = []
        let uploads = 0
        await setup(page, language, async (route, path) => {
          if (path === '/api/uploads/public') {
            uploads++
            if (uploads === 1) { firstStarted.release(); await first.promise; return route.fulfill({ status, json: status === 200 ? { pathMedium: '/uploads/stale-a.webp' } : {} }) }
            secondStarted.release(); await second.promise; return route.fulfill({ json: { pathMedium: '/uploads/new-b.webp' } })
          }
          if (route.request().method() !== 'GET') { writes.push({ path, body: route.request().postDataJSON() }); return route.fulfill({ json: {} }) }
          return route.fulfill({ json: {} })
        })
        try {
          await page.getByRole('button', { name: name(language, 0), exact: true }).click()
          let dialog = page.getByRole('dialog')
          await dialog.locator('input[type=file]').setInputFiles(file('a.jpg'))
          await firstStarted.promise
          await dialog.getByRole('button', { name: language === 'bs' ? 'Odustani' : 'Cancel', exact: true }).click()
          await page.getByRole('button', { name: name(language, 1), exact: true }).click()
          dialog = page.getByRole('dialog')
          await expect(dialog.locator('#services-service-name')).toHaveValue('Second service')
          await dialog.locator('input[type=file]').setInputFiles(file('b.jpg'))
          await secondStarted.promise
          const save = dialog.getByRole('button', { name: language === 'bs' ? 'Sačuvaj' : 'Save', exact: true })
          await expect(save).toBeDisabled()
          await expect(dialog.getByRole('status')).toContainText(language === 'bs' ? 'Zatvaranje ne otkazuje' : 'Closing does not cancel')
          if (status === 200) {
            const axe = await new AxeBuilder({ page }).include('[role="dialog"]').withRules(['button-name', 'aria-valid-attr', 'aria-allowed-attr']).analyze()
            expect(axe.violations).toEqual([])
          }
          const staleResponse = page.waitForResponse(r => r.url().includes('/api/uploads/public') && r.request().postDataBuffer()?.includes(Buffer.from('a.jpg')) === true)
          first.release(); await staleResponse
          await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
          await expect(dialog.locator('#services-service-name')).toHaveValue('Second service')
          await expect(dialog.locator('img[src*="stale-a.webp"]')).toHaveCount(0)
          await expect(save).toBeDisabled()
          await expect(page.getByText(language === 'bs' ? 'Nije moguće učitati sliku usluge.' : 'Could not upload the service image.', { exact: true })).toHaveCount(0)
          await expect(page.getByText(language === 'bs' ? 'Slika je učitana.' : 'Image uploaded.', { exact: true })).toHaveCount(0)
          expect(writes).toEqual([])
          second.release()
          await expect(dialog.locator('img[src*="new-b.webp"]')).toHaveCount(1)
          await expect(save).toBeEnabled()
          await save.click()
          await expect.poll(() => writes.length).toBe(1)
          expect(writes[0]).toMatchObject({ path: '/api/services/svc-1', body: { name: 'Second service', heroImage: '/uploads/new-b.webp' } })
        } finally { first.release(); second.release() }
      })

      test(`late service save ${status} cannot close or overwrite a newer editor ${language} ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        const gate = deferred(), started = deferred()
        let catalogReads = 0
        const writes: unknown[] = []
        await setup(page, language, async (route, path) => {
          if (path === '/api/services/svc-0' && route.request().method() === 'PATCH') {
            writes.push({ path, body: route.request().postDataJSON() }); started.release(); await gate.promise
            return route.fulfill({ status, json: {} })
          }
          return route.fulfill({ json: {} })
        })
        await page.route('**/api/services/admin/categories?*', route => { catalogReads++; return route.fulfill({ json: [category] }) })
        try {
          await page.getByRole('button', { name: name(language, 0), exact: true }).click()
          let dialog = page.getByRole('dialog')
          await dialog.locator('#services-service-name').fill('First changed')
          await dialog.getByRole('button', { name: language === 'bs' ? 'Sačuvaj' : 'Save', exact: true }).click()
          await started.promise
          await expect(dialog.getByRole('status')).toContainText(language === 'bs' ? 'Zatvaranje ne otkazuje' : 'Closing does not cancel')
          await dialog.getByRole('button', { name: language === 'bs' ? 'Odustani' : 'Cancel', exact: true }).click()
          await page.getByRole('button', { name: name(language, 1), exact: true }).click()
          dialog = page.getByRole('dialog')
          await dialog.locator('#services-service-name').fill('Second in progress')
          await expect(dialog.getByRole('button', { name: language === 'bs' ? 'Spremanje…' : 'Saving…' })).toBeDisabled()
          const beforeReads = catalogReads
          const response = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().endsWith('/api/services/svc-0'))
          gate.release(); await response
          await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
          await expect(dialog).toBeVisible()
          await expect(dialog.locator('#services-service-name')).toHaveValue('Second in progress')
          expect(catalogReads).toBe(beforeReads)
          expect(writes).toHaveLength(1)
          await expect(page.getByText(status === 200 ? (language === 'bs' ? 'Promjene su sačuvane.' : 'Changes saved.') : (language === 'bs' ? 'Nije moguće sačuvati promjene.' : 'Could not save the changes.'), { exact: true })).toBeVisible()
          await dialog.getByRole('button', { name: language === 'bs' ? 'Odustani' : 'Cancel', exact: true }).click()
          if (status === 200) await expect.poll(() => catalogReads).toBeGreaterThan(beforeReads)
          else expect(catalogReads).toBe(beforeReads)
        } finally { gate.release() }
      })
    }
  }
}

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`late upload does not replace the next service image ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      const gate = deferred(), started = deferred()
      await setup(page, language, async (route, path) => {
        if (path === '/api/uploads/public') { started.release(); await gate.promise; return route.fulfill({ json: { pathMedium: '/uploads/stale-a.webp' } }) }
        return route.fulfill({ json: {} })
      })
      try {
        await page.getByRole('button', { name: name(language, 0), exact: true }).click()
        await page.getByRole('dialog').locator('input[type=file]').setInputFiles(file('a.jpg'))
        await started.promise
        await page.getByRole('dialog').getByRole('button', { name: language === 'bs' ? 'Odustani' : 'Cancel', exact: true }).click()
        await page.getByRole('button', { name: name(language, 1), exact: true }).click()
        const dialog = page.getByRole('dialog')
        await expect(dialog.locator('img[src*="original-1.jpg"]')).toHaveCount(1)
        const response = page.waitForResponse(r => r.url().includes('/api/uploads/public'))
        gate.release(); await response
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
        await expect(dialog.locator('img[src*="original-1.jpg"]')).toHaveCount(1)
        await expect(dialog.locator('img[src*="stale-a.webp"]')).toHaveCount(0)
      } finally { gate.release() }
    })
  }
}

for (const language of ['bs', 'en'] as const) {
  for (const status of [200, 500] as const) {
    test(`late save ${status} after closing still reports outcome and refreshes only on success ${language}`, async ({ page }) => {
      const gate = deferred(), started = deferred()
      let catalogReads = 0, writes = 0
      await setup(page, language, async (route, path) => {
        if (path === '/api/services/svc-0' && route.request().method() === 'PATCH') {
          writes++; started.release(); await gate.promise
          return route.fulfill({ status, json: {} })
        }
        return route.fulfill({ json: {} })
      })
      await page.route('**/api/services/admin/categories?*', route => { catalogReads++; return route.fulfill({ json: [category] }) })
      try {
        await page.getByRole('button', { name: name(language, 0), exact: true }).click()
        const dialog = page.getByRole('dialog')
        await dialog.getByRole('button', { name: language === 'bs' ? 'Sačuvaj' : 'Save', exact: true }).click()
        await started.promise
        await dialog.getByRole('button', { name: language === 'bs' ? 'Odustani' : 'Cancel', exact: true }).click()
        await expect(dialog).toHaveCount(0)
        const response = page.waitForResponse(r => r.request().method() === 'PATCH' && r.url().endsWith('/api/services/svc-0'))
        gate.release(); await response
        await expect(page.getByText(status === 200 ? (language === 'bs' ? 'Promjene su sačuvane.' : 'Changes saved.') : (language === 'bs' ? 'Nije moguće sačuvati promjene.' : 'Could not save the changes.'), { exact: true })).toBeVisible()
        if (status === 200) await expect.poll(() => catalogReads).toBeGreaterThan(0)
        else expect(catalogReads).toBe(0)
        expect(writes).toBe(1)
      } finally { gate.release() }
    })
  }
}
