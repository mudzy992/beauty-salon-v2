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
      await expect(page.getByRole('button', { name: /Aurum (svijetla|tamna|light|dark)/i })).toHaveCount(0)
    } else {
      await expect(root).toHaveAttribute('data-mode', expected)
      await expect(page.getByRole('button', { name: /Aurum (svijetla|tamna|light|dark)/i })).toHaveCount(2)
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
  const light = page.getByRole('button', { name: /Aurum (svijetla|light)/i })
  const dark = page.getByRole('button', { name: /Aurum (tamna|dark)/i })
  await expect(light).toHaveAttribute('aria-pressed', 'true')
  await expect(light.locator('svg[aria-hidden="true"]')).toHaveCount(1)
  await expect(dark.locator('svg[aria-hidden="true"]')).toHaveCount(1)
  await dark.focus()
  await page.keyboard.press('Enter')
  await expect(dark).toBeFocused()
  await expect(dark).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark')
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark')
})
