import { expect, test, type Page, type Route } from '@playwright/test'

const category = { id: 'cat', name: 'Category fixture', description: null, sortOrder: 0, isActive: true }
const sub = { id: 'sub', categoryId: 'cat', name: 'Subcategory fixture', description: null, sortOrder: 0, isActive: true }
async function setup(page: Page, handler: (route: Route, path: string) => Promise<void>) {
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
    if (path === '/api/services/admin/categories') return route.fulfill({ json: [category] })
    if (path === '/api/services/admin/subcategories') return route.fulfill({ json: [sub] })
    if (path === '/api/services/admin/services') return route.fulfill({ json: [] })
    return handler(route, path)
  })
  await page.goto('/admin/services', { waitUntil: 'networkidle' })
}

for (const width of [320, 1280]) {
  test(`catalog creation and service upload retain request contracts ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    const writes: Array<{ path: string; body: unknown }> = []
    let uploadBody = '', releaseUpload!: () => void
    const gate = new Promise<void>(resolve => { releaseUpload = resolve })
    await setup(page, async (route, path) => {
      if (path === '/api/uploads/public') {
        uploadBody = route.request().postDataBuffer()?.toString() ?? ''
        await gate
        return route.fulfill({ json: { pathMedium: '/uploads/fixture.webp', pathOriginal: '/uploads/original.jpg' } })
      }
      if (route.request().method() !== 'GET') { writes.push({ path, body: route.request().postDataJSON() }); return route.fulfill({ json: {} }) }
      return route.fulfill({ json: {} })
    })
    try {
      await page.getByRole('button', { name: 'New category' }).click()
      let dialog = page.getByRole('dialog', { name: 'New category' })
      await dialog.locator('#services-common-name').fill('New category fixture')
      await dialog.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(dialog).toBeHidden()
      expect(writes[0]).toEqual({ path: '/api/services/categories', body: { name: 'New category fixture', description: '', sortOrder: 0, isActive: true } })
      await page.getByRole('button', { name: 'Add subcategory: Category fixture', exact: true }).click()
      dialog = page.getByRole('dialog', { name: 'New subcategory' })
      await dialog.locator('#services-common-name-2').fill('New sub fixture')
      await dialog.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(dialog).toBeHidden()
      expect(writes[1]).toEqual({ path: '/api/services/subcategories', body: { name: 'New sub fixture', description: '', sortOrder: 0, isActive: true, categoryId: 'cat' } })
      await page.getByRole('button', { name: /Category fixture/, expanded: false }).click()
      await page.getByRole('button', { name: 'Add service', exact: true }).click()
      dialog = page.getByRole('dialog', { name: 'New service' })
      await dialog.locator('#services-service-name').fill('New service fixture')
      await dialog.locator('#services-price').fill('45.5')
      await dialog.locator('input[type=file]').setInputFiles({ name: 'fixture.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('synthetic-image-data') })
      await expect(dialog.getByRole('button', { name: 'Upload image' })).toBeDisabled()
      await expect.poll(() => uploadBody).toContain('name="assetKind"')
      expect(uploadBody).toContain('service')
      expect(uploadBody).toContain('filename="fixture.jpg"')
      releaseUpload()
      await expect(dialog.getByRole('button', { name: 'Change image' })).toBeEnabled()
      await dialog.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(dialog).toBeHidden()
      expect(writes[2]).toEqual({ path: '/api/services', body: { name: 'New service fixture', shortDescription: '', durationMinutes: 30, price: 45.5, gender: 'FEMALE', sortOrder: 0, isActive: true, heroImage: '/uploads/fixture.webp', loyaltyEnabled: false, loyaltyMaxDiscountPercent: 0, subcategoryId: 'sub' } })
      expect(writes).toHaveLength(3)
    } finally { releaseUpload() }
  })
}

test('service editor preserves fields after failed save and allows retry', async ({ page }) => {
  let saves = 0
  await setup(page, async (route, path) => {
    if (path === '/api/services/categories' && route.request().method() === 'POST') {
      saves += 1
      return route.fulfill({ status: saves === 1 ? 500 : 200, json: {} })
    }
    return route.fulfill({ json: {} })
  })
  await page.getByRole('button', { name: 'New category' }).click()
  const dialog = page.getByRole('dialog', { name: 'New category' })
  await dialog.locator('#services-common-name').fill('Retained on error')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.locator('[data-sonner-toast]')).toContainText('Could not save the changes.')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('#services-common-name')).toHaveValue('Retained on error')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).toBeHidden()
  expect(saves).toBe(2)
})
