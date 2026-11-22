import { expect, test, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { AXE_RULE_TAGS, assertableViolations } from './axe-coverage.mjs'
import { settleAnimations } from './settle'

async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 120 && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

// Synthetic pair and intercepted GETs. Browser emulation is not a Windows contrast theme or AT.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const palette of ['light', 'dark'] as const) {
      for (const photo of ['white', 'black'] as const) {
        test(`M4 M5 gallery slider ${theme} ${language} ${palette} ${photo}`, async ({ page }) => {
          await page.setViewportSize({ width: 1280, height: 900 })
          await page.emulateMedia({ forcedColors: 'active', colorScheme: palette, reducedMotion: 'reduce' })
          await page.addInitScript(({ mode, locale }) => {
            localStorage.removeItem('token')
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', mode)
            localStorage.setItem('APP_LOCALE', locale)
          }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
          const writes: string[] = []
          let imageRequests = 0
          await page.route('**/fixture-photo.svg', route => {
            imageRequests++
            return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450"><rect width="100%" height="100%" fill="${photo}"/></svg>` })
          })
          await page.route('**/api/**', route => {
            const request = route.request(), path = new URL(request.url()).pathname
            if (request.method() !== 'GET') { writes.push(`${request.method()} ${path}`); return route.abort() }
            if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
            if (path === '/api/gallery/categories') return route.fulfill({ json: [] })
            if (path === '/api/daily-log/before-after') return route.fulfill({ json: { items: [{ id: 'pair', before: { pathOriginal: '/fixture-photo.svg' }, after: { pathOriginal: '/fixture-photo.svg' } }] } })
            return route.fulfill({ json: {} })
          })
          await page.goto('/galerija', { waitUntil: 'networkidle' })
          await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
          if (theme !== 'classic') await expect(page.locator('html')).toHaveAttribute('data-mode', theme)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true)
          expect(await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)).toBe(palette === 'dark')
          const slider = page.getByRole('slider', { name: language === 'bs' ? 'Poređenje fotografija prije i poslije' : 'Before and after photo comparison' })
          await expect(slider).toBeVisible()
          await expect.poll(() => slider.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(600)
          await expect(slider.locator('img')).toHaveAttribute('src', /fixture-photo\.svg/)
          expect(imageRequests).toBeGreaterThan(0)
          await expect(slider).toHaveAttribute('aria-valuemin', '0')
          await expect(slider).toHaveAttribute('aria-valuemax', '100')
          await expect(slider).toHaveAttribute('aria-valuenow', '50')
          await expect(slider).toHaveAttribute('aria-valuetext', /50%/)
          await tabTo(page, slider)
          const focus = await slider.evaluate(el => {
            const css = getComputedStyle(el), rect = el.getBoundingClientRect()
            const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
            return { visible: el.matches(':focus-visible'), width: css.outlineWidth, style: css.outlineStyle, color: css.outlineColor, background: css.backgroundColor, center: !!hit && (hit === el || el.contains(hit)) }
          })
          expect(focus.visible, JSON.stringify(focus)).toBe(true)
          expect(focus.center, JSON.stringify(focus)).toBe(true)
          expect(focus.style, JSON.stringify(focus)).toBe('solid')
          expect(parseFloat(focus.width), JSON.stringify(focus)).toBeGreaterThanOrEqual(2)
          expect(focus.color, JSON.stringify(focus)).not.toBe('rgba(0, 0, 0, 0)')
          expect(focus.color, JSON.stringify(focus)).not.toBe(focus.background)
          const line = slider.locator('[data-before-after-divider]')
          const thumb = line.locator('[data-before-after-handle]')
          const lineStyle = await line.evaluate(el => {
            const css = getComputedStyle(el)
            return { background: css.backgroundColor, leftWidth: css.borderLeftWidth, leftStyle: css.borderLeftStyle, leftColor: css.borderLeftColor, rightWidth: css.borderRightWidth, rightStyle: css.borderRightStyle, rightColor: css.borderRightColor }
          })
          const thumbStyle = await thumb.evaluate(el => {
            const css = getComputedStyle(el)
            return { width: css.borderWidth, style: css.borderStyle, color: css.borderColor, background: css.backgroundColor }
          })
          console.log(`M5_GALLERY_HANDLE_${theme}_${language}_${palette}_${photo} ${JSON.stringify({ focus, lineStyle, thumbStyle })}`)
          if (theme === 'classic' && language === 'bs' && palette === 'light' && photo === 'white') {
            await test.info().attach('gallery-slider-forced-colors', { body: await slider.screenshot(), contentType: 'image/png' })
          }
          expect(lineStyle.leftStyle, JSON.stringify(lineStyle)).toBe('solid')
          expect(parseFloat(lineStyle.leftWidth), JSON.stringify(lineStyle)).toBeGreaterThanOrEqual(2)
          expect(lineStyle.rightStyle, JSON.stringify(lineStyle)).toBe('solid')
          expect(parseFloat(lineStyle.rightWidth), JSON.stringify(lineStyle)).toBeGreaterThanOrEqual(2)
          expect(lineStyle.leftColor, JSON.stringify(lineStyle)).not.toBe(lineStyle.rightColor)
          expect(thumbStyle.style, JSON.stringify(thumbStyle)).toBe('solid')
          expect(parseFloat(thumbStyle.width), JSON.stringify(thumbStyle)).toBeGreaterThanOrEqual(2)
          expect(thumbStyle.color, JSON.stringify(thumbStyle)).not.toBe(thumbStyle.background)
          for (const [key, value] of [['Home', '0'], ['ArrowRight', '2'], ['End', '100'], ['ArrowLeft', '98']] as const) {
            await page.keyboard.press(key)
            await expect(slider).toBeFocused()
            await expect(slider).toHaveAttribute('aria-valuenow', value)
            await expect(slider).toHaveAttribute('aria-valuetext', new RegExp(`${value}%`))
          }
          if (palette === 'light') {
            await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' })
            expect(await settleAnimations(page)).not.toBeNull()
            const results = await new AxeBuilder({ page }).include('[data-aurum-page="gallery"]').withTags(AXE_RULE_TAGS).analyze()
            const findings = { violations: results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), incomplete: results.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })) }
            console.log(`M7_GALLERY_SLIDER_${theme.toUpperCase()}_${language.toUpperCase()}_${photo.toUpperCase()} ${JSON.stringify(findings)}`)
            await test.info().attach('gallery-axe-findings', { body: JSON.stringify(findings, null, 2), contentType: 'application/json' })
            expect(assertableViolations(results.violations)).toEqual([])
            expect(results.violations.filter(item => item.tags.includes('wcag2aaa'))).toEqual([])
            const contrastPasses = results.passes.find(rule => rule.id === 'color-contrast-enhanced')?.nodes ?? []
            for (const label of language === 'bs' ? ['Prije', 'Poslije'] : ['Before', 'After']) {
              expect(contrastPasses.some(node => node.html.includes(`>${label}</span>`)), `${label}: AAA contrast not confirmed`).toBe(true)
            }
          }
          expect(writes).toEqual([])
        })
      }
    }
  }
}

// The same caption is rendered in the auto-published category branch.
for (const theme of ['classic', 'light', 'dark'] as const) {
  test(`M7 gallery auto-published comparison ${theme}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript(({ mode }) => {
      localStorage.removeItem('token')
      localStorage.removeItem('nejra.theme')
      localStorage.setItem('nejra.theme.mode', mode)
      localStorage.setItem('APP_LOCALE', 'en')
    }, { mode: theme === 'dark' ? 'dark' : 'light' })
    const writes: string[] = []
    const category = { id: 'fixture-cat', name: 'Fixture category', sortOrder: 0, autoPublishConsentedPairs: true, _count: { images: 0 }, images: [] }
    await page.route('**/api/**', route => {
      const req = route.request(), path = new URL(req.url()).pathname
      if (req.method() !== 'GET') { writes.push(`${req.method()} ${path}`); return route.abort() }
      if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
      if (path === '/api/gallery/categories') return route.fulfill({ json: [category] })
      if (path === '/api/gallery/categories/fixture-cat') return route.fulfill({ json: category })
      if (path === '/api/daily-log/before-after') return route.fulfill({ json: { items: [{ id: 'fixture', before: { pathOriginal: '/brand/aurum-hero-editorial.jpg' }, after: { pathOriginal: '/brand/aurum-hero-editorial.jpg' } }] } })
      return route.fulfill({ json: {} })
    })
    await page.goto('/galerija', { waitUntil: 'networkidle' })
    await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
    if (theme !== 'classic') await expect(page.locator('html')).toHaveAttribute('data-mode', theme)
    await expect(page.getByRole('heading', { name: 'Fixture category' })).toBeVisible()
    await expect(page.getByRole('slider', { name: 'Before and after photo comparison' })).toHaveCount(1)
    await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1).toBe(0)
    const results = await new AxeBuilder({ page }).include('article:has([data-before-after-slider])').withTags(AXE_RULE_TAGS).analyze()
    const findings = { violations: results.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })), incomplete: results.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })) }
    console.log(`M7_GALLERY_CATEGORY_${theme.toUpperCase()} ${JSON.stringify(findings)}`)
    expect(assertableViolations(results.violations)).toEqual([])
    expect(results.violations.filter(item => item.tags.includes('wcag2aaa'))).toEqual([])
    const contrastPasses = results.passes.find(rule => rule.id === 'color-contrast-enhanced')?.nodes ?? []
    for (const label of ['Before', 'After']) {
      expect(contrastPasses.some(node => node.html.includes(`>${label}</span>`)), `${label}: AAA contrast not confirmed`).toBe(true)
    }
    expect(writes).toEqual([])
  })
}
