import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { assertableViolations, AXE_RULE_TAGS } from './axe-coverage.mjs'
import { settleAnimations } from './settle'

// The HTTP response is intercepted only in this isolated test; all other public
// settings remain real. This does not write shared settings or touch production.
async function configure(page: Page, skin: 'classic' | 'aurum', mode: 'light' | 'dark', preference?: 'light' | 'dark') {
  await page.addInitScript((value) => {
    localStorage.removeItem('nejra.theme')
    localStorage.removeItem('nejra.theme.mode')
    if (value) localStorage.setItem('nejra.theme.mode', value)
  }, preference)
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
