import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['OWNER'] }
const pair = (id: string) => ({ id, revision: '0', before: { pathOriginal: `/uploads/${id}-before.jpg` }, after: { pathOriginal: `/uploads/${id}-after.jpg` } })
const nextRevision = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

async function setup(page: Page, language: 'bs' | 'en') {
  await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang); Reflect.deleteProperty(window, 'IntersectionObserver') }, language)
  let order = ['a', 'b'], revision = '0', writeCount = 0
  let release!: () => void, block = false
  const gate = new Promise<void>(resolve => { release = resolve })
  const writes: unknown[] = []
  await page.route('**/uploads/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" />' }))
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/settings/public') return route.fulfill({ json: [] })
    if (url.pathname === '/api/users/profile') return route.fulfill({ json: profile })
    if (url.pathname === '/api/services/admin/services/svc') return route.fulfill({ json: { id: 'svc', name: 'Fixture', durationMinutes: 30 } })
    if (url.pathname === '/api/services/admin/services/svc2') return route.fulfill({ json: { id: 'svc2', name: 'Other service', durationMinutes: 30 } })
    if (url.pathname === '/api/services/admin/work-gallery/svc2/visible') return route.fulfill({ json: { items: [pair('other')], hasMore: false, nextOffset: 1, orderRevision: '0' } })
    if (url.pathname === '/api/daily-log/before-after') return route.fulfill({ json: { items: [], hasMore: false, nextOffset: 0 } })
    if (url.pathname === '/api/services/admin/work-gallery/svc/visible') {
      const offset = Number(url.searchParams.get('offset'))
      return route.fulfill({ json: { items: order.slice(offset, offset + 1).map(pair), hasMore: offset === 0, nextOffset: offset + 1, orderRevision: revision } })
    }
    if (url.pathname === '/api/services/admin/work-gallery/svc/order' && route.request().method() === 'PATCH') {
      writeCount++
      const payload = route.request().postDataJSON()
      writes.push(payload)
      if (block) await gate
      if (payload.expectedOrderRevision !== revision) return route.fulfill({ status: 409, json: {} })
      order = [order[1], order[0]]; revision = nextRevision
      return route.fulfill({ json: { orderRevision: revision } })
    }
    return route.fulfill({ json: {} })
  })
  return { writes, release, setBlocked: () => { block = true }, writeCount: () => writeCount, remoteReorder: () => { order.reverse(); revision = nextRevision } }
}

for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`keyboard reorder crosses loaded page boundary and sends revisions ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      const state = await setup(page, language)
      await page.goto('/admin/services/svc/work-gallery', { waitUntil: 'networkidle' })
      const firstLater = page.getByRole('button', { name: language === 'bs' ? 'Pomjeri poređenje 1 kasnije' : 'Move comparison 1 later' })
      await expect(firstLater).toHaveAttribute('aria-disabled', 'true')
      await page.getByRole('button', { name: language === 'bs' ? 'Učitaj još radova' : 'Load more work' }).click()
      await expect(firstLater).toHaveAttribute('aria-disabled', 'false')
      const scan = await new AxeBuilder({ page }).withRules(['button-name', 'aria-valid-attr', 'aria-allowed-attr']).analyze()
      expect(scan.violations).toEqual([])
      await firstLater.focus()
      await page.keyboard.press('Enter')
      await expect.poll(() => state.writes.length).toBe(1)
      expect(state.writes[0]).toEqual({ firstId: 'a', secondId: 'b', firstRevision: '0', secondRevision: '0', expectedOrderRevision: '0' })
      await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
      await expect(page.getByRole('status').filter({ hasText: language === 'bs' ? 'Redoslijed je sačuvan' : 'Order saved' })).toBeVisible()
      await expect(page.locator('img[src*="b-before.jpg"]')).toHaveCount(1)
    })
  }
}

test('concurrent reorder fails closed and duplicate clicks do not send a second request', async ({ page }) => {
  const state = await setup(page, 'en')
  await page.goto('/admin/services/svc/work-gallery', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Load more work' }).click()
  const move = page.getByRole('button', { name: 'Move comparison 1 later' })
  await expect(move).toHaveAttribute('aria-disabled', 'false')
  state.setBlocked()
  try {
    await move.click()
    await expect.poll(state.writeCount).toBe(1)
    await expect(move).toHaveAttribute('aria-disabled', 'true')
    await move.dispatchEvent('click')
    expect(state.writeCount()).toBe(1)
    state.remoteReorder()
    state.release()
    await expect(page.getByRole('alert')).toContainText('Refresh the page')
    expect(state.writeCount()).toBe(1)
  } finally { state.release() }
})

test('changed revision between pages does not combine different order snapshots', async ({ page }) => {
  const state = await setup(page, 'en')
  await page.goto('/admin/services/svc/work-gallery', { waitUntil: 'networkidle' })
  await expect(page.locator('img[src*="a-before.jpg"]')).toHaveCount(1)
  state.remoteReorder()
  await page.getByRole('button', { name: 'Load more work' }).click()
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('The order changed while loading')
  await expect(page.getByRole('button', { name: 'Move comparison 1 later' })).toHaveAttribute('aria-disabled', 'true')
  await alert.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('img[src*="b-before.jpg"]')).toHaveCount(1)
  expect(state.writes).toEqual([])
})

test('delayed order response does not steal focus from a later user action', async ({ page }) => {
  const state = await setup(page, 'en')
  await page.goto('/admin/services/svc/work-gallery', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Load more work' }).click()
  const move = page.getByRole('button', { name: 'Move comparison 1 later' })
  await expect(move).toHaveAttribute('aria-disabled', 'false')
  state.setBlocked()
  try {
    await move.click()
    await expect.poll(state.writeCount).toBe(1)
    const back = page.getByRole('link', { name: 'Back', exact: true })
    await back.focus()
    state.release()
    await expect(page.getByRole('status').filter({ hasText: 'Order saved' })).toBeVisible()
    await expect(back).toBeFocused()
  } finally { state.release() }
})

test('long order controls reflow at narrow width and enlarged text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await setup(page, 'bs')
  await page.goto('/admin/services/svc/work-gallery', { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: 'html { font-size: 200% !important }' })
  const buttons = page.getByRole('button', { name: /Pomjeri poređenje/ })
  await expect(buttons).toHaveCount(2)
  for (const button of await buttons.all()) {
    expect(await button.evaluate(el => ({ horizontal: el.scrollWidth > el.clientWidth + 1, vertical: el.scrollHeight > el.clientHeight + 1 }))).toEqual({ horizontal: false, vertical: false })
  }
})


test('late reorder for another service cannot refresh or alter the current gallery', async ({ page }) => {
  const state = await setup(page, 'en')
  await page.goto('/admin/services/svc/work-gallery', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Load more work' }).click()
  const move = page.getByRole('button', { name: 'Move comparison 1 later' })
  await expect(move).toHaveAttribute('aria-disabled', 'false')
  state.setBlocked()
  try {
    await move.click()
    await expect.poll(state.writeCount).toBe(1)
    await page.evaluate(() => { history.pushState(null, '', '/admin/services/svc2/work-gallery'); window.dispatchEvent(new PopStateEvent('popstate')) })
    await expect(page.getByText('Other service')).toBeVisible()
    await expect(page.locator('img[src*="other-before.jpg"]')).toHaveCount(1)
    const back = page.getByRole('link', { name: 'Back', exact: true })
    await back.focus()
    const response = page.waitForResponse(r => r.url().includes('/svc/order'))
    state.release()
    await response
    await expect(back).toBeFocused()
    await expect(page.locator('img[src*="other-before.jpg"]')).toHaveCount(1)
    await expect(page.getByRole('status').filter({ hasText: 'Order saved' })).toHaveCount(0)
  } finally { state.release() }
})
