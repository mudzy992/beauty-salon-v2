import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Route } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['OWNER'] }
const entry = { id: 'entry-1', completedAt: '2026-01-01T12:00:00.000Z', date: '2026-01-01', reference: 'REF-1', clientName: 'Amir B.' }
const jpeg = { name: 'before.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake-jpeg-bytes') }

type UploadState = {
  posts: string[]
  pending: Array<Record<string, unknown>>
  failWith: { status: number; code: string } | null
}

async function setup(page: Page, language: 'bs' | 'en', state: UploadState) {
  await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang); Reflect.deleteProperty(window, 'IntersectionObserver') }, language)
  await page.route('**/uploads/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" />' }))
  await page.route('**/api/**', async (route: Route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
    if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
    if (url.pathname === '/api/services/admin/services/svc') return route.fulfill({ json: { id: 'svc', name: 'Fixture', durationMinutes: 30 } })
    if (url.pathname === '/api/services/admin/work-gallery/svc/visible') return route.fulfill({ json: { items: [], hasMore: false, nextOffset: 0, orderRevision: '0' } })
    if (url.pathname === '/api/services/admin/work-gallery/svc/eligible-entries') return route.fulfill({ json: { items: [entry], hasMore: false, nextOffset: 1 } })
    if (url.pathname === '/api/services/admin/work-gallery/svc/pending-consent') return route.fulfill({ json: { items: state.pending, hasMore: false, nextOffset: state.pending.length } })
    if (url.pathname === '/api/services/admin/work-gallery/svc/private-pair' && route.request().method() === 'POST') {
      const body = route.request().postDataBuffer()?.toString('latin1') ?? ''
      state.posts.push(body)
      if (state.failWith) return route.fulfill({ status: state.failWith.status, json: { code: state.failWith.code, message: 'Zapis već ima before/after par fotografija.' } })
      state.pending.push({
        id: entry.id,
        completedAt: entry.completedAt,
        date: entry.date,
        reference: entry.reference,
        clientName: entry.clientName,
        images: [
          { id: 'image-1', role: 'before', private: true, consented: false },
          { id: 'image-2', role: 'after', private: true, consented: false },
        ],
      })
      return route.fulfill({ status: 201, json: { entryId: entry.id, beforeImageId: 'image-1', afterImageId: 'image-2', storageClass: 'PRIVATE', consentRequired: true } })
    }
    return route.fulfill({ json: {} })
  })
}

const newState = (): UploadState => ({ posts: [], pending: [], failWith: null })

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`private pair upload keeps the photos private and waits for consent ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const state = newState()
      await setup(page, language, state)
      await page.goto('/admin/services/svc/work-gallery', { waitUntil: 'networkidle' })

      const select = page.getByLabel(language === 'bs' ? 'Završeni zapis usluge' : 'Completed service record')
      await expect(select).toBeVisible()
      await expect(select).toHaveValue('entry-1')

      const before = page.getByLabel(language === 'bs' ? 'Fotografija prije' : 'Photo before')
      const after = page.getByLabel(language === 'bs' ? 'Fotografija poslije' : 'Photo after')
      await before.setInputFiles(jpeg)
      await after.setInputFiles({ name: 'after.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake-jpeg-after') })

      const scan = await new AxeBuilder({ page }).withRules(['button-name', 'label', 'aria-valid-attr', 'aria-allowed-attr']).analyze()
      expect(scan.violations).toEqual([])

      await page.getByRole('button', { name: language === 'bs' ? 'Sačuvaj privatni par' : 'Save private pair' }).click()
      await expect.poll(() => state.posts.length).toBe(1)
      expect(state.posts[0]).toContain('entry-1')
      expect(state.posts[0]).toContain('before')
      expect(state.posts[0]).toContain('after')
      expect(state.posts[0]).toContain('before.jpg')
      expect(state.posts[0]).toContain('after.jpg')

      await expect(page.getByRole('status').filter({ hasText: language === 'bs' ? 'Par je sačuvan privatno' : 'The pair was saved privately' })).toBeVisible()
      // The new pair stays out of the gallery until the client consents.
      await expect(page.locator('img[src*="before.jpg"]')).toHaveCount(0)

      await page.getByText(language === 'bs' ? 'Privatni parovi koji čekaju saglasnost' : 'Private pairs waiting for consent').click()
      await expect(page.getByText(language === 'bs' ? 'Čeka saglasnost klijenta.' : "Waiting for the client's consent.")).toBeVisible()
    })
  }
}

test('a rejected file type never reaches the server', async ({ page }) => {
  const state = newState()
  await setup(page, 'en', state)
  await page.goto('/admin/services/svc/work-gallery', { waitUntil: 'networkidle' })

  await page.getByLabel('Photo before').setInputFiles({ name: 'notes.pdf', mimeType: 'application/pdf', buffer: Buffer.from('pdf') })
  await page.getByLabel('Photo after').setInputFiles({ name: 'after.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake-jpeg-after') })
  await expect(page.getByRole('alert').filter({ hasText: 'Only JPEG, PNG, WebP and GIF photos are allowed.' })).toBeVisible()
  await page.getByRole('button', { name: 'Save private pair' }).click()
  expect(state.posts).toEqual([])
  await expect(page.getByLabel('Photo before')).toBeFocused()
})

test('a conflicting pair is reported with the translated server code', async ({ page }) => {
  const state = newState()
  state.failWith = { status: 409, code: 'WORK_GALLERY_PAIR_ALREADY_EXISTS' }
  await setup(page, 'en', state)
  await page.goto('/admin/services/svc/work-gallery', { waitUntil: 'networkidle' })

  await page.getByLabel('Photo before').setInputFiles(jpeg)
  await page.getByLabel('Photo after').setInputFiles({ name: 'after.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake-jpeg-after') })
  await page.getByRole('button', { name: 'Save private pair' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'The record already has a before/after photo pair.' })).toBeVisible()
  expect(state.posts.length).toBe(1)
})

test('a duplicate click sends only one request', async ({ page }) => {
  const state = newState()
  await setup(page, 'en', state)
  await page.goto('/admin/services/svc/work-gallery', { waitUntil: 'networkidle' })

  await page.getByLabel('Photo before').setInputFiles(jpeg)
  await page.getByLabel('Photo after').setInputFiles({ name: 'after.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake-jpeg-after') })
  const submit = page.getByRole('button', { name: 'Save private pair' })
  await submit.click()
  await submit.dispatchEvent('click')
  await expect.poll(() => state.posts.length).toBe(1)
})

test('the upload panel is hidden from sessions without the admin role', async ({ page }) => {
  const state = newState()
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/users/profile') return route.fulfill({ json: { ...profile, roles: ['CLIENT'] } })
    if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
    if (url.pathname === '/api/services/admin/services/svc') return route.fulfill({ json: { id: 'svc', name: 'Fixture', durationMinutes: 30 } })
    if (url.pathname === '/api/daily-log/before-after') return route.fulfill({ json: { items: [], hasMore: false, nextOffset: 0 } })
    return route.fulfill({ json: {} })
  })
  await page.goto('/admin/services/svc/work-gallery', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { level: 2, name: 'Add a private photo pair' })).toHaveCount(0)
  expect(state.posts).toEqual([])
})
