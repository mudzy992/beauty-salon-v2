import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, type TestInfo } from '@playwright/test'

import { AXE_RULE_TAGS, assertableViolations, defaultCoverageDir, recordAxeCoverage } from './axe-coverage.mjs'
import { settleAnimations } from './settle'
import { clippedSnapshot, hasVisibleFocusIndicator, overflowingElements } from './dom-metrics.mjs'

export type AurumChoice = 'classic' | 'aurum-light' | 'aurum-dark'

/** Supply the same public settings contract consumed by SettingsProvider, without mutating DOM state. */
export async function stubGlobalTheme(page: Page, choice: AurumChoice): Promise<void> {
  const skin = choice === 'classic' ? 'classic' : 'aurum'
  // Start Aurum in light mode. Dark mode is reached only through the visible ThemeSwitcher.
  await page.route('**/api/settings/public', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { key: 'theme_active_skin', value: skin },
        { key: 'theme_default_mode', value: 'light' },
      ]),
    }),
  )
}

/** Assert the effective theme, and exercise the public keyboard-operable mode control. */
export async function activateTheme(page: Page, choice: AurumChoice): Promise<void> {
  const root = page.locator('html')
  const expectedSkin = choice === 'classic' ? 'classic' : 'aurum'
  const expectedMode = choice === 'aurum-dark' ? 'dark' : 'light'

  await expect.poll(() => root.getAttribute('data-skin')).toBe(expectedSkin)
  if (choice !== 'classic') {
    await expect.poll(() => root.getAttribute('data-mode')).toBe('light')
    const toggle = page.getByRole('button', { name: /dark mode|tamni režim/i })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    if (choice === 'aurum-dark') {
      await toggle.focus()
      await page.keyboard.press('Enter')
      await expect(toggle).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByRole('status').filter({ hasText: /active theme|aktivna tema/i })).toContainText(
        /aurum dark|aurum tamna/i,
      )
    }
  }
  await expect.poll(() => root.getAttribute('data-mode')).toBe(expectedMode)
  await expect.poll(() => root.evaluate((element) => element.classList.contains('dark'))).toBe(choice === 'aurum-dark')
}

export async function assertThemeSwitcherKeyboard(page: Page, choice: AurumChoice): Promise<void> {
  if (choice === 'classic') {
    await expect(page.getByRole('button', { name: /dark mode|tamni režim/i })).toHaveCount(0)
    return
  }

  const toggle = page.getByRole('button', { name: /dark mode|tamni režim/i })
  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(toggle).toHaveAttribute('aria-pressed', choice === 'aurum-dark' ? 'false' : 'true')
  await expect(
    page.getByRole('status').filter({ hasText: /active theme|aktivna tema/i }),
  ).toContainText(choice === 'aurum-dark' ? /aurum light|aurum svijetla/i : /aurum dark|aurum tamna/i)
  await expect.poll(() => page.evaluate(hasVisibleFocusIndicator)).toBe(true)
  await expect.poll(() => page.locator('html').getAttribute('data-mode')).toBe(
    choice === 'aurum-dark' ? 'light' : 'dark',
  )
}

export async function assertS11Reflow(page: Page, route: string): Promise<void> {
  const originalViewport = page.viewportSize()
  const originalInlineFontSize = await page.evaluate(() => document.documentElement.style.fontSize)
  await page.setViewportSize({ width: 320, height: 800 })
  await page.waitForTimeout(100)
  const narrow = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }))
  const narrowOffenders = await page.evaluate(overflowingElements, 2)
  expect(narrow.viewport, `${route}: 320px probe viewport`).toBe(320)
  expect(narrow.document, `${route}: horizontal page overflow at 320px (${narrow.document}px)`).toBeLessThanOrEqual(322)
  expect(
    narrowOffenders,
    `${route}: content overflows its visible container at 320px\n${JSON.stringify(narrowOffenders, null, 2)}`,
  ).toEqual([])

  // Simulated text resize is an explicit DOM metric, not browser zoom. Real 200%/400% zoom
  // remains a manual checklist item because Playwright viewport/font simulation is not equivalent.
  await page.setViewportSize({ width: 1280, height: 900 })
  const beforeTextResize = await page.evaluate(clippedSnapshot)
  const baseFontSize = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
  await page.evaluate((size) => { document.documentElement.style.fontSize = `${size * 2}px` }, baseFontSize)
  await page.waitForTimeout(150)
  const afterTextResize = await page.evaluate(clippedSnapshot)
  const newlyClipped = Object.keys(afterTextResize).filter((entry) => !(entry in beforeTextResize))
  expect(newlyClipped, `${route}: text resize introduced clipping`).toEqual([])

  // WCAG text-spacing stress values, again measured as simulation rather than AT/browser zoom.
  const spacingStyle = await page.addStyleTag({ content: `*, *::before, *::after { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important } p { margin-bottom: 2em !important }` })
  await page.waitForTimeout(150)
  const afterSpacing = await page.evaluate(clippedSnapshot)
  const spacingClipped = Object.keys(afterSpacing).filter((entry) => !(entry in beforeTextResize))
  expect(spacingClipped, `${route}: text spacing introduced clipping`).toEqual([])

  await spacingStyle.evaluate((element) => element.parentNode?.removeChild(element))
  await page.evaluate((fontSize) => { document.documentElement.style.fontSize = fontSize }, originalInlineFontSize)
  if (originalViewport) await page.setViewportSize(originalViewport)
}

export async function scanBothAppLanguages(
  page: Page,
  testInfo: TestInfo,
  route: string,
  choice: AurumChoice,
): Promise<void> {
  let language = await page.locator('html').getAttribute('lang')
  expect(['bs', 'en'], `${route}: application locale must be Bosnian or English`).toContain(language)

  for (let index = 0; index < 2; index += 1) {
    await scanRenderedA11y(page, testInfo, `${route} [${choice}/${language}]`)
    await assertS11Reflow(page, `${route} [${choice}/${language}]`)
    if (index === 0) {
      const nextLanguage = language === 'bs' ? 'en' : 'bs'
      await page.getByRole('button', { name: /switch language to|prebaci jezik na/i }).click()
      await expect.poll(() => page.locator('html').getAttribute('lang')).toBe(nextLanguage)
      language = nextLanguage
    }
  }
}

export async function scanRenderedA11y(page: Page, testInfo: TestInfo, route: string): Promise<void> {
  await settleAnimations(page)
  const results = await new AxeBuilder({ page }).withTags(AXE_RULE_TAGS).analyze()
  recordAxeCoverage(testInfo.project.name, route, results, defaultCoverageDir())
  const blocking = assertableViolations(results.violations).filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  )
  expect(
    blocking,
    `${route}: ${blocking.length} critical/serious axe violation(s)\n` +
      blocking
        .map((violation) =>
          `  ${violation.id} (${violation.impact}) ×${violation.nodes.length} :: ` +
          violation.nodes
            .slice(0, 3)
            .map((node) => `[${(node.target || []).join(' ')}] ${String(node.html || '').slice(0, 140)}`)
            .join(' ~~ '),
        )
        .join('\n'),
  ).toEqual([])
}
