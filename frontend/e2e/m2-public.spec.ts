import { expect, test } from '@playwright/test'
import { clippedSnapshot, overflowingElements } from './dom-metrics.mjs'
import { settleAnimations } from './settle'

// Initial unauthenticated screens only; token/ID details and authenticated flows need fixtures.
const PUBLIC_SCREENS = [
  '/', '/usluge', '/galerija', '/kontakt', '/rezervacija',
  '/zadovoljni-klijenti', '/blog', '/login', '/register', '/reset-password', '/unsubscribe',
] as const
const TEXT_SPACING = `
  *, *::before, *::after {
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p { margin-bottom: 2em !important; }
`
function report(title: string, detail: string) {
  const encoded = detail.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
  process.stdout.write(`::error title=${title}::${encoded}\n`)
}

for (const mode of ['light', 'dark'] as const) {
  for (const path of PUBLIC_SCREENS) {
    for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
      test(`M2 public ${mode} ${adjustment}: ${path}`, async ({ page }) => {
        await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.addInitScript(selectedMode => {
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', selectedMode)
        }, mode)
        // Enable public features only in this isolated test's settings response; gate itself is unchanged.
        await page.route('**/api/settings/public', async intercepted => {
          const response = await intercepted.fetch()
          if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
          const rows = await response.json() as Array<{ key: string; value: string }>
          const settings: Record<string, string> = {
            theme_active_skin: 'aurum', theme_default_mode: mode,
            public_feature_blog: 'true', public_feature_gallery: 'true', public_feature_reviews: 'true',
          }
          await intercepted.fulfill({ response, json: [
            ...rows.filter(row => !(row.key in settings)),
            ...Object.entries(settings).map(([key, value]) => ({ key, value })),
          ] })
        })
        await page.goto(path, { waitUntil: 'networkidle' })
        expect(new URL(page.url()).pathname).toBe(path)
        await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
        await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
        await expect(page.locator('main')).toBeVisible()
        const settled = await settleAnimations(page)
        expect(settled).not.toBeNull()
        expect(settled?.stillRunning).toBe(0)
        if (adjustment === '320px') {
          const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
          expect(widths.viewport).toBe(320)
          if (widths.scroll > widths.viewport + 1) report(`M2 public ${mode} 320 ${path}`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
          expect(widths.scroll - widths.viewport, JSON.stringify(widths)).toBeLessThanOrEqual(1)
        } else {
          const before = await page.evaluate(clippedSnapshot)
          if (adjustment === 'text-200') {
            const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
            await page.evaluate(size => { document.documentElement.style.fontSize = `${size * 2}px` }, base)
            await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(base * 2, 2)
          } else {
            await page.addStyleTag({ content: TEXT_SPACING })
          }
          await settleAnimations(page)
          const after = await page.evaluate(clippedSnapshot)
          const newlyClipped = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
          if (newlyClipped.length) report(`M2 public ${mode} ${adjustment} ${path}`, JSON.stringify(newlyClipped.slice(0, 8)))
          expect(newlyClipped, `${path} ${mode} ${adjustment}: newly clipped elements`).toEqual([])
        }
      })
    }
  }
}
