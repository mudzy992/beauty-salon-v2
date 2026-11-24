import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['OWNER'] }
const pair = { id: 'entry-1', before: { pathOriginal: '/uploads/before.jpg' }, after: { pathOriginal: '/uploads/after.jpg' } }

async function setup(page: Page, language: 'bs' | 'en') {
  await page.addInitScript(lang => {
    localStorage.setItem('token', 'fixture-admin-token')
    localStorage.setItem('APP_LOCALE', lang)
    Reflect.deleteProperty(window, 'IntersectionObserver')
  }, language)
  let hidden = false
  const writes: unknown[] = []
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
    if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
    if (url.pathname === '/api/services/admin/services/svc-1') return route.fulfill({ json: { id: 'svc-1', name: 'Fixture service', durationMinutes: 30 } })
    if (url.pathname === '/api/daily-log/before-after') return route.fulfill({ json: { items: hidden ? [] : [pair], hasMore: false, nextOffset: hidden ? 0 : 1 } })
    if (url.pathname === '/api/services/admin/work-gallery/svc-1/hidden') return route.fulfill({ json: { items: hidden ? [{ id: 'entry-1', completedAt: '2026-01-01T12:00:00.000Z' }] : [], hasMore: false, nextOffset: hidden ? 1 : 0 } })
    if (url.pathname === '/api/services/admin/work-gallery/svc-1/entries/entry-1/visibility' && route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON()
      writes.push(body)
      if (body.expectedHidden !== hidden) return route.fulfill({ status: 409, json: {} })
      hidden = body.hidden
      return route.fulfill({ json: { hidden } })
    }
    return route.fulfill({ json: {} })
  })
  await page.route('**/uploads/**', route => route.fulfill({ status: 404 }))
  return { writes }
}

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`hide and restore retain consent and focus with explicit confirmation ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      const { writes } = await setup(page, language)
      await page.goto('/admin/services/svc-1/work-gallery', { waitUntil: 'networkidle' })
      const hide = page.getByRole('button', { name: language === 'bs' ? 'Sakrij poređenje 1 iz galerije' : 'Hide comparison 1 from gallery' })
      await expect(hide).toBeVisible()
      await hide.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toContainText(language === 'bs' ? 'Izvorne fotografije i saglasnosti' : 'Original photos and client consent')
      await page.keyboard.press('Escape')
      await expect(hide).toBeFocused()
      expect(writes).toEqual([])
      await hide.click()
      const scan = await new AxeBuilder({ page }).include('[role="dialog"]').withRules(['button-name', 'aria-valid-attr', 'aria-required-attr']).analyze()
      expect(scan.violations).toEqual([])
      await dialog.getByRole('button', { name: language === 'bs' ? 'Sakrij iz galerije' : 'Hide from gallery' }).click()
      await expect(hide).toHaveCount(0)
      await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
      expect(writes).toEqual([{ hidden: true, expectedHidden: false }])
      await page.getByText(language === 'bs' ? 'Skrivena poređenja' : 'Hidden comparisons', { exact: true }).click()
      const restore = page.getByRole('button', { name: language === 'bs' ? 'Vrati poređenje iz zapisa entry-1' : 'Restore comparison from entry entry-1' })
      await expect(restore).toBeVisible()
      await restore.click()
      await expect(dialog).toContainText(language === 'bs' ? 'važeću saglasnost' : 'valid client consent')
      await dialog.getByRole('button', { name: language === 'bs' ? 'Vrati u galeriju' : 'Restore to gallery' }).click()
      await expect(hide).toBeVisible()
      await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
      expect(writes).toEqual([{ hidden: true, expectedHidden: false }, { hidden: false, expectedHidden: true }])
    })
  }
}

test('a delayed successful hide does not steal focus after the user moves away', async ({ page }) => {
  await setup(page, 'en')
  let release!: () => void, started = false, hidden = false
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/daily-log/before-after?**', route => route.fulfill({ json: { items: hidden ? [] : [pair], hasMore: false, nextOffset: hidden ? 0 : 1 } }))
  await page.route('**/api/services/admin/work-gallery/svc-1/entries/entry-1/visibility', async route => {
    started = true
    await gate
    hidden = true
    return route.fulfill({ json: { hidden: true } })
  })
  try {
    await page.goto('/admin/services/svc-1/work-gallery', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Hide comparison 1 from gallery' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Hide from gallery' }).click()
    await expect.poll(() => started).toBe(true)
    const back = page.getByRole('link', { name: 'Back', exact: true })
    await back.focus()
    release()
    await expect(page.getByText('There are no available transformations for this service.')).toBeVisible()
    await expect(back).toBeFocused()
  } finally { release() }
})

test('a failed hide retains the pair and rejects duplicate submissions', async ({ page }) => {
  await setup(page, 'en')
  let release!: () => void, writes = 0
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/services/admin/work-gallery/svc-1/entries/entry-1/visibility', async route => {
    writes++
    await gate
    return route.fulfill({ status: 409, json: {} })
  })
  try {
    await page.goto('/admin/services/svc-1/work-gallery', { waitUntil: 'networkidle' })
    const hide = page.getByRole('button', { name: 'Hide comparison 1 from gallery' })
    await hide.click()
    await page.getByRole('dialog').getByRole('button', { name: 'Hide from gallery' }).click()
    await expect.poll(() => writes).toBe(1)
    await expect(hide).toHaveAttribute('aria-disabled', 'true')
    await hide.dispatchEvent('click')
    expect(writes).toBe(1)
    const response = page.waitForResponse(result => result.url().includes('/entries/entry-1/visibility'))
    release()
    await response
    await expect(page.getByRole('alert')).toContainText('The change failed or the data is stale')
    await expect(hide).toBeVisible()
    await expect(hide).toHaveAttribute('aria-disabled', 'false')
  } finally { release() }
})

test('stale in-flight page cannot reintroduce a just-hidden pair', async ({ page }) => {
  await setup(page, 'en')
  let release!: () => void, appendStarted = false, hidden = false
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/daily-log/before-after?**', async route => {
    const offset = Number(new URL(route.request().url()).searchParams.get('offset'))
    if (offset === 1) { appendStarted = true; await gate; return route.fulfill({ json: { items: [pair], hasMore: false, nextOffset: 2 } }) }
    return route.fulfill({ json: { items: hidden ? [] : [pair], hasMore: !hidden, nextOffset: hidden ? 0 : 1 } })
  })
  await page.route('**/api/services/admin/work-gallery/svc-1/entries/entry-1/visibility', route => { hidden = true; return route.fulfill({ json: { hidden: true } }) })
  try {
    await page.goto('/admin/services/svc-1/work-gallery', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Load more work' }).click()
    await expect.poll(() => appendStarted).toBe(true)
    await page.getByRole('button', { name: 'Hide comparison 1 from gallery' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Hide from gallery' }).click()
    await expect(page.getByText('There are no available transformations for this service.')).toBeVisible()
    const oldResponse = page.waitForResponse(response => response.url().includes('/api/daily-log/before-after?') && new URL(response.url()).searchParams.get('offset') === '1')
    release()
    await oldResponse
    await expect(page.getByRole('button', { name: 'Hide comparison 1 from gallery' })).toHaveCount(0)
  } finally { release() }
})
