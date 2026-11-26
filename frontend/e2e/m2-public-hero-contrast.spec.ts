import { expect, test } from '@playwright/test'

// A conservative screenshot check of text over the hero's actual overlays, with the
// configurable photo replaced by solid black/white. No public settings are changed.
const routes = [
  { path: '/blog', targets: ['.tracking-wide', 'h1'] },
  { path: '/galerija', targets: ['h1', '.text-base'] },
  { path: '/kontakt', targets: ['h1', '.mt-1'] },
] as const

test.use({ deviceScaleFactor: 1 })
for (const route of routes) {
  for (const mode of ['light', 'dark'] as const) {
    for (const locale of ['bs', 'en'] as const) {
      test(`M2 hero contrast ${route.path} ${mode} ${locale}`, async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.addInitScript(({ selectedMode, language }) => {
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', selectedMode)
          localStorage.setItem('APP_LOCALE', language)
        }, { selectedMode: mode, language: locale })
        await page.route('**/api/settings/public', async routeHandler => {
          const response = await routeHandler.fetch()
          if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
          const rows = await response.json() as Array<{ key: string; value: string }>
          await routeHandler.fulfill({ response, json: [
            ...rows.filter(row => row.key !== 'theme_default_mode'),
            { key: 'theme_default_mode', value: mode },
          ] })
        })
        await page.goto(route.path, { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
        await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
        await expect(page.locator('html')).toHaveAttribute('lang', locale)
        const hero = page.locator('[data-aurum-page-hero]').first()
        await hero.scrollIntoViewIfNeeded()
        for (const selector of route.targets) await expect(hero.locator(selector).first()).toBeVisible()
        const regions = await hero.evaluate((el, selectors) => {
          const bounds = el.getBoundingClientRect()
          return selectors.map(selector => {
            const child = el.querySelector(selector)!
            const rect = child.getBoundingClientRect()
            const color = getComputedStyle(child).color.match(/\d+/g)!.slice(0, 3).map(Number)
            return { selector, x: rect.x - bounds.x, y: rect.y - bounds.y, width: rect.width, height: rect.height, color, heroWidth: bounds.width, heroHeight: bounds.height }
          })
        }, [...route.targets])
        for (const region of regions) {
          expect(region.x).toBeGreaterThanOrEqual(0)
          expect(region.y).toBeGreaterThanOrEqual(0)
          expect(region.x + region.width).toBeLessThanOrEqual(region.heroWidth + 1)
          expect(region.y + region.height).toBeLessThanOrEqual(region.heroHeight + 1)
        }
        await hero.evaluate((el, selectors) => selectors.forEach(selector => {
          ;(el.querySelector(selector) as HTMLElement).style.visibility = 'hidden'
        }), [...route.targets])
        for (const replacement of ['black', 'white'] as const) {
          await hero.evaluate((el, color) => {
            const photo = el.querySelector('.bg-cover') as HTMLElement
            photo.style.backgroundImage = 'none'
            photo.style.backgroundColor = color
          }, replacement)
          await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
          const image = await hero.screenshot({ animations: 'disabled' })
          const ratios = await page.evaluate(async ({ png, boxes }) => {
            const image = new Image()
            image.src = `data:image/png;base64,${png}`
            await image.decode()
            const canvas = document.createElement('canvas')
            canvas.width = image.width; canvas.height = image.height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(image, 0, 0)
            const pixels = ctx.getImageData(0, 0, image.width, image.height).data
            const luminance = (rgb: number[]) => rgb.map(c => {
              const s = c / 255
              return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
            }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
            return boxes.map(box => {
              const foreground = luminance(box.color)
              let minimum = Infinity
              // Measure all pixels of the element's rectangle, including whitespace.
              for (let y = Math.max(0, Math.floor(box.y)); y < Math.min(image.height, Math.ceil(box.y + box.height)); y++) {
                for (let x = Math.max(0, Math.floor(box.x)); x < Math.min(image.width, Math.ceil(box.x + box.width)); x++) {
                  const offset = (y * image.width + x) * 4
                  const background = luminance([pixels[offset], pixels[offset + 1], pixels[offset + 2]])
                  minimum = Math.min(minimum, (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05))
                }
              }
              return minimum
            })
          }, { png: image.toString('base64'), boxes: regions })
          expect(ratios).toHaveLength(2)
          for (const ratio of ratios) expect(ratio, `${route.path} ${mode} ${locale} ${replacement}`).toBeGreaterThanOrEqual(4.5)
        }
      })
    }
  }
}
