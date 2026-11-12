import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { assertableViolations, AXE_RULE_TAGS } from './axe-coverage.mjs'
import { settleAnimations } from './settle'

// The HTTP response is intercepted only in this isolated test; all other public
// settings remain real. This does not write shared settings or touch production.
async function configure(page: Page, skin: 'classic' | 'aurum', mode: 'light' | 'dark', preference?: 'light' | 'dark', preserveOnReload = false) {
  await page.addInitScript(({ value, preserve }) => {
    if (preserve && sessionStorage.getItem('e2e.theme.initialized')) return
    if (preserve) sessionStorage.setItem('e2e.theme.initialized', 'true')
    localStorage.removeItem('nejra.theme')
    localStorage.removeItem('nejra.theme.mode')
    if (value) localStorage.setItem('nejra.theme.mode', value)
  }, { value: preference, preserve: preserveOnReload })
  await page.route('**/api/settings/public', async (route) => {
    const response = await route.fetch()
    if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
    const rows = await response.json() as Array<{key: string; value: string}>
    const filtered = rows.filter((row) => row.key !== 'theme_active_skin' && row.key !== 'theme_default_mode')
    await route.fulfill({ response, json: [...filtered, { key: 'theme_active_skin', value: skin }, { key: 'theme_default_mode', value: mode }] })
  })
}

for (const { skin, mode, preference, expected } of [
  { skin: 'classic', mode: 'dark', preference: 'dark', expected: 'classic' },
  { skin: 'aurum', mode: 'dark', preference: undefined, expected: 'dark' },
  { skin: 'aurum', mode: 'dark', preference: 'light', expected: 'light' },
] as const) {
  test(`global ${skin}/${mode}, local ${preference ?? 'none'}: ${expected}`, async ({ page }) => {
    await configure(page, skin, mode, preference)
    await page.goto('/login', { waitUntil: 'networkidle' })
    const root = page.locator('html')
    await expect(root).toHaveAttribute('data-skin', skin)
    if (skin === 'classic') {
      await expect(page.getByRole('button', { name: /Tamni režim|Dark mode/i })).toHaveCount(0)
    } else {
      await expect(root).toHaveAttribute('data-mode', expected)
      await expect(page.getByRole('button', { name: /Tamni režim|Dark mode/i })).toHaveCount(1)
    }
  })
}

for (const mode of ['light', 'dark'] as const) {
  for (const path of ['/', '/login']) {
    test(`rendered axe ${mode}: ${path}`, async ({ page }) => {
      await configure(page, 'aurum', mode)
      await page.goto(path, { waitUntil: 'networkidle' })
      await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      expect(await settleAnimations(page)).not.toBeNull()
      const results = await new AxeBuilder({ page }).withTags(AXE_RULE_TAGS).analyze()
      expect(assertableViolations(results.violations)).toEqual([])
    })
  }
}

for (const mode of ['light', 'dark'] as const) {
  test(`Aurum ${mode} home reflows at 320px with reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await configure(page, 'aurum', mode)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
    await expect(page.locator('[data-home-hero-content] h1')).toBeVisible()
    await expect(page.locator('[data-aurum-hero-image]')).toBeHidden()
    await expect(page.locator('[data-home-hero-actions] a')).toHaveCount(2)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    const settled = await settleAnimations(page)
    expect(settled).not.toBeNull()
    expect(settled?.stillRunning).toBe(0)
    const results = await new AxeBuilder({ page }).withTags(AXE_RULE_TAGS).analyze()
    expect(assertableViolations(results.violations)).toEqual([])
  })
}

for (const mode of ['light', 'dark'] as const) {
  for (const path of ['/usluge', '/blog', '/galerija', '/kontakt', '/register']) {
    test(`Aurum ${mode} rendered public surface: ${path}`, async ({ page }) => {
      await configure(page, 'aurum', mode)
      await page.goto(path, { waitUntil: 'networkidle' })
      expect(new URL(page.url()).pathname).toBe(path)
      await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      await expect(page.locator('main h1, [data-aurum-auth-page] h1').first()).toBeVisible()
      const settled = await settleAnimations(page)
      expect(settled).not.toBeNull()
      expect(settled?.stillRunning).toBe(0)
      const results = await new AxeBuilder({ page }).withTags(AXE_RULE_TAGS).analyze()
      expect(assertableViolations(results.violations)).toEqual([])
    })
  }
}

test('icon-only theme controls retain accessible names, keyboard operation and persistence', async ({ page }) => {
  await configure(page, 'aurum', 'light', undefined, true)
  await page.goto('/login', { waitUntil: 'networkidle' })
  const toggle = page.getByRole('button', { name: /Tamni režim|Dark mode/i })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(toggle.locator('svg.lucide-sun[aria-hidden="true"]')).toHaveCount(1)
  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(toggle).toBeFocused()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(toggle.locator('svg.lucide-moon[aria-hidden="true"]')).toHaveCount(1)
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark')
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark')
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.focus()
  await page.keyboard.press('Space')
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'light')
})

test('theme icon respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await configure(page, 'aurum', 'light')
  await page.goto('/login', { waitUntil: 'networkidle' })
  const toggle = page.getByRole('button', { name: /Tamni režim|Dark mode/i })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(toggle.locator('.theme-switcher-icon')).toHaveCSS('animation-name', 'none')
})

// First page-by-page AAA audit: deliberately include violations AND incomplete
// results in the log. Passing axe cannot establish full WCAG conformance.
for (const mode of ['light', 'dark'] as const) {
  test(`homepage AAA audit ${mode}: desktop`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await configure(page, 'aurum', mode)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
    await expect(page.locator('[data-aurum-hero-image]')).toBeVisible()
    const settled = await settleAnimations(page)
    expect(settled?.stillRunning).toBe(0)
    const results = await new AxeBuilder({ page }).withTags(AXE_RULE_TAGS).analyze()
    const detail = (items: typeof results.violations) => items.filter((item) => item.tags.includes('wcag2aaa')).map((item) => ({
      id: item.id,
      nodes: item.nodes.map((node) => ({ target: node.target, html: node.html, summary: node.failureSummary })),
    }))
    console.log(`HOME_AAA_${mode.toUpperCase()} ${JSON.stringify({ violations: detail(results.violations), incomplete: detail(results.incomplete) })}`)
    expect(assertableViolations(results.violations)).toEqual([])
    expect(detail(results.violations), 'homepage AAA axe violations require review').toEqual([])
  })
}

for (const mode of ['light', 'dark'] as const) {
  for (const viewport of ['desktop', 'mobile'] as const) {
    test(`homepage AAA audit ${mode}: ${viewport} with populated gallery and review`, async ({ page }) => {
      await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 320, height: 720 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await configure(page, 'aurum', mode)
      await page.route('**/api/daily-log/before-after**', (route) => route.fulfill({ json: {
        items: Array.from({ length: 5 }, (_, i) => ({ id: `test-${i}`, before: { pathOriginal: 'https://fixture.test/before.jpg' }, after: { pathOriginal: 'https://fixture.test/after.jpg' } })),
      } }))
      await page.route('**/api/reviews/featured/random', (route) => route.fulfill({ json: {
        id: 'test-review', serviceRating: 5, stylistRating: null, comment: 'Test review',
        service: { name: 'Test service' }, user: { firstName: 'Test', lastName: 'User', avatar: null },
      } }))
      await page.route('https://fixture.test/**', (route) => route.fulfill({ path: 'public/brand/aurum-hero-editorial.jpg', contentType: 'image/jpeg' }))
      await page.goto('/', { waitUntil: 'networkidle' })
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      await expect(page.locator('[data-home-review]')).toContainText('Test review')
      const slider = page.getByRole('slider').first()
      await expect(slider).toBeVisible()
      await slider.focus()
      await page.keyboard.press('ArrowRight')
      await expect(slider).toHaveAttribute('aria-valuenow', '52')
      const settled = await settleAnimations(page)
      expect(settled?.stillRunning).toBe(0)
      const results = await new AxeBuilder({ page }).withTags(AXE_RULE_TAGS).analyze()
      const aaa = results.violations.filter((item) => item.tags.includes('wcag2aaa'))
      console.log(`HOME_AAA_FIXTURE_${mode.toUpperCase()}_${viewport.toUpperCase()} ${JSON.stringify({ violations: aaa.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })), incomplete: results.incomplete.filter((item) => item.tags.includes('wcag2aaa')).map((item) => ({ id: item.id, count: item.nodes.length })) })}`)
      expect(assertableViolations(results.violations)).toEqual([])
      expect(aaa).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    })
  }
}

for (const mode of ['light', 'dark'] as const) {
  test(`public header and mobile menu AAA ${mode}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await configure(page, 'aurum', mode)
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
    const trigger = page.locator('[data-aurum-shell="header"] [aria-controls="public-mobile-navigation"]')
    await trigger.focus()
    await page.keyboard.press('Enter')
    const menu = page.locator('#public-mobile-navigation')
    await expect(menu).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(menu.locator('a[aria-current="page"]')).toHaveCount(1)
    const results = await new AxeBuilder({ page }).include('#public-mobile-navigation').withTags(AXE_RULE_TAGS).analyze()
    const relevant = results.violations.filter((item) => item.tags.includes('wcag2aaa') || assertableViolations([item]).length > 0)
    console.log(`PUBLIC_MENU_${mode.toUpperCase()} ${JSON.stringify({ violations: relevant.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) })), incomplete: results.incomplete.map((v) => ({ id: v.id, count: v.nodes.length })) })}`)
    expect(relevant).toEqual([])
    for (const control of await menu.locator('a:visible, button:visible').all()) {
      const box = await control.boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(44)
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
}
