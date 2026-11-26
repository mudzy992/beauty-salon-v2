import { expect, test } from '@playwright/test'

// Stress the administrator-configurable copy against the brightest possible image.
// The real image and all writes remain untouched; only this page's rendered fixture is changed.
for (const path of ['/login', '/register'] as const) {
  for (const mode of ['light', 'dark'] as const) {
    for (const locale of ['bs', 'en'] as const) {
      for (const adjustment of ['normal', 'text-200'] as const) {
        test(`M2 auth banner contrast ${path} ${mode} ${locale} ${adjustment}`, async ({ page }) => {
          await page.setViewportSize({ width: 1024, height: 700 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript(({ selectedMode, language }) => {
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', selectedMode)
            localStorage.setItem('APP_LOCALE', language)
          }, { selectedMode: mode, language: locale })
          await page.route('**/api/settings/public', async route => {
            const response = await route.fetch()
            if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
            const rows = await response.json() as Array<{ key: string; value: string }>
            const copy = 'This deliberately long fixture describes the salon and its services to visitors in several sentences. '
            const key = path === '/login' ? 'public_login_subtitle' : 'public_register_subtitle'
            await route.fulfill({ response, json: [
              ...rows.filter(row => row.key !== 'theme_default_mode' && row.key !== key),
              { key: 'theme_default_mode', value: mode },
              { key, value: copy.repeat(5) },
            ] })
          })
          await page.goto(path, { waitUntil: 'networkidle' })
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
          if (adjustment === 'text-200') {
            const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
            await page.evaluate(size => { document.documentElement.style.fontSize = `${size * 2}px` }, base)
            await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(base * 2, 2)
          }
          const panel = page.locator('[data-aurum-auth-banner]')
          const copy = panel.locator('[data-aurum-auth-copy]')
          await expect(copy).toBeVisible()
          await expect(copy.locator(':scope > div').nth(1)).toContainText('deliberately long fixture')
          await panel.scrollIntoViewIfNeeded()
          const items = await copy.evaluate(el => {
            const panel = el.closest('[data-aurum-auth-banner]')!
            const bounds = panel.getBoundingClientRect()
            return Array.from(el.children, child => {
              const rect = child.getBoundingClientRect()
              const color = getComputedStyle(child).color.match(/\d+/g)!.slice(0, 3).map(Number)
              return { x: rect.x - bounds.x, y: rect.y - bounds.y, width: rect.width, height: rect.height, color, panelWidth: bounds.width, panelHeight: bounds.height }
            })
          })
          expect(items).toHaveLength(2)
          for (const item of items) {
            expect(item.x).toBeGreaterThanOrEqual(0)
            expect(item.y).toBeGreaterThanOrEqual(0)
            expect(item.x + item.width).toBeLessThanOrEqual(item.panelWidth + 1)
            expect(item.y + item.height).toBeLessThanOrEqual(item.panelHeight + 1)
          }
          // Keep the copy's own backing visible but remove its glyphs from the capture.
          await panel.evaluate(el => {
            ;(el as HTMLElement).style.background = '#fff'
            el.querySelector('img')!.style.visibility = 'hidden'
            el.querySelectorAll('[data-aurum-auth-copy] > div').forEach(child => { (child as HTMLElement).style.visibility = 'hidden' })
          })
          await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
          const image = await panel.screenshot({ animations: 'disabled' })
          const ratios = await page.evaluate(async ({ png, regions }) => {
            const img = new Image()
            img.src = `data:image/png;base64,${png}`
            await img.decode()
            const canvas = document.createElement('canvas')
            canvas.width = img.width; canvas.height = img.height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0)
            const pixels = ctx.getImageData(0, 0, img.width, img.height).data
            const luminance = (rgb: number[]) => rgb.map(c => {
              const s = c / 255
              return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
            }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
            return regions.map(region => {
              const fg = luminance(region.color)
              let min = Infinity
              // Conservative: every pixel in the text box, including whitespace, not just glyph locations.
              for (let y = Math.max(0, Math.floor(region.y)); y < Math.min(img.height, Math.ceil(region.y + region.height)); y++) {
                for (let x = Math.max(0, Math.floor(region.x)); x < Math.min(img.width, Math.ceil(region.x + region.width)); x++) {
                  const offset = (y * img.width + x) * 4
                  const bg = luminance([pixels[offset], pixels[offset + 1], pixels[offset + 2]])
                  min = Math.min(min, (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05))
                }
              }
              return min
            })
          }, { png: image.toString('base64'), regions: items })
          expect(ratios.length).toBe(2)
          for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5)
        })
      }
    }
  }
}
