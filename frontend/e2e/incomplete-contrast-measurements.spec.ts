import { expect, test, type Locator, type Page } from '@playwright/test'
import sharp from 'sharp'

// Measure the rendered background beneath every pixel of the text's bounding box.
// The text alone is temporarily made transparent without changing its layout. The
// minimum is deliberately conservative: it includes pixels where there is no glyph.
// This covers the actual fixture imagery and overlay, not arbitrary future CSS or photos.
async function measureBackgroundContrast(target: Locator) {
  await expect(target).toBeVisible()
  await target.scrollIntoViewIfNeeded()
  const foreground = await target.evaluate(el => {
    const style = getComputedStyle(el)
    const previous = el.getAttribute('style')
    const color = style.color
    ;(el as HTMLElement).style.setProperty('color', 'transparent', 'important')
    return { color, previous }
  })
  try {
    const rgb = foreground.color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/)
    if (!rgb || (rgb[4] !== undefined && Number(rgb[4]) !== 1)) throw new Error(`Unsupported foreground ${foreground.color}`)
    const luminance = (r: number, g: number, b: number) => {
      const linear = (x: number) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
      return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
    }
    const fg = luminance(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]))
    const { data, info } = await sharp(await target.screenshot({ animations: 'disabled' })).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    let min = Infinity, worst = 0
    for (let i = 0; i < data.length; i += info.channels) {
      const bg = luminance(data[i], data[i + 1], data[i + 2])
      const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
      if (ratio < min) { min = ratio; worst = i / info.channels }
    }
    return { min, foreground: foreground.color, pixels: info.width * info.height, worstPixel: { x: worst % info.width, y: Math.floor(worst / info.width), rgb: [...data.subarray(worst * info.channels, worst * info.channels + 3)] } }
  } finally {
    await target.evaluate((el, previous) => previous === null ? el.removeAttribute('style') : el.setAttribute('style', previous), foreground.previous)
  }
}

async function installFixtures(page: Page, theme: 'classic' | 'light' | 'dark', image: 'black' | 'white') {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(mode => {
    localStorage.setItem('token', 'fixture-admin-token')
    localStorage.setItem('APP_LOCALE', 'en')
    localStorage.removeItem('nejra.theme')
    localStorage.setItem('nejra.theme.mode', mode)
  }, theme === 'dark' ? 'dark' : 'light')
  const svg = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="${image}"/></svg>`)}`
  const book = { id: 'book-1', year: 2026, month: 3, totalRevenue: 0, totalTips: 0, openedAt: '2026-03-01T00:00:00Z', closedAt: null, entries: [], manualEntries: [], lockEvents: [], manualAudits: [] }
  await page.route('**/api/**', route => {
    const req = route.request(), path = new URL(req.url()).pathname
    if (req.method() !== 'GET') return route.abort()
    if (path === '/api/settings/public') return route.fulfill({ json: [
      { key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' },
      { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' },
      ...['public_blog_bg', 'public_gallery_bg', 'public_contact_bg'].map(key => ({ key, value: svg })),
    ] })
    if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
    if (path === '/api/blog/posts') return route.fulfill({ json: { items: [], hasMore: false, nextOffset: 0 } })
    if (path === '/api/gallery/categories') return route.fulfill({ json: [] })
    if (path === '/api/daily-log/before-after') return route.fulfill({ json: { items: [], hasMore: false, nextOffset: 0 } })
    if (path === '/api/analytics/dashboard') return route.fulfill({ json: {
      fromDate: '2026-01-01', toDate: '2026-01-31', monthlyFinance: [{ year: 2026, month: 1, label: '2026-01', income: 100, expenses: 30, tips: 5 }],
      stylistPerformance: [], topServices: [], conversionRate: 50, totalPending: 2, totalCompleted: 2,
      periodFinance: { servicesRevenue: 95, tips: 5, totalIncome: 100, expensesByCategory: [], totalExpenses: 30, netProfit: 70 },
    } })
    if (path === '/api/income-books') return route.fulfill({ json: [book] })
    if (path === '/api/income-books/book-1') return route.fulfill({ json: book })
    if (path === '/api/income-books/book-1/integrity') return route.fulfill({ json: { bookId: 'book-1', isLocked: false, missingCount: 0, orphanedCount: 0, isHealthy: true, missing: [], orphaned: [] } })
    if (path === '/api/stylists/admin') return route.fulfill({ json: [] })
    if (path === '/api/users/clients') return route.fulfill({ json: { items: [] } })
    return route.fulfill({ json: {} })
  })
}

test('measurement detects deliberately unreadable text over the real hero', async ({ page }) => {
  await installFixtures(page, 'light', 'white')
  await page.goto('/galerija', { waitUntil: 'networkidle' })
  const title = page.locator('[data-aurum-page-hero] h1')
  await title.evaluate(el => (el as HTMLElement).style.setProperty('color', 'rgb(245, 245, 245)', 'important'))
  const result = await measureBackgroundContrast(title)
  expect(result.min).toBeLessThan(4.5)
})

for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const image of ['black', 'white'] as const) {
    for (const path of ['/blog', '/galerija', '/kontakt'] as const) {
      test(`rendered hero contrast ${theme} ${image} ${path}`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await installFixtures(page, theme, image)
        await page.goto(path, { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
        if (theme !== 'classic') await expect(page.locator('html')).toHaveAttribute('data-mode', theme)
        const hero = page.locator('[data-aurum-page-hero]')
        await expect(hero.locator('h1')).toBeVisible()
        const imageLayer = hero.locator('div[style*="background-image"]').first()
        await expect(imageLayer).toHaveCSS('opacity', '0.08')
        expect(await imageLayer.evaluate(el => getComputedStyle(el).backgroundImage)).toContain('data:image/svg+xml')
        const targets = hero.locator('h1, p, div.text-xs')
        expect(await targets.count()).toBeGreaterThanOrEqual(2)
        for (let i = 0; i < await targets.count(); i++) {
          const result = await measureBackgroundContrast(targets.nth(i))
          console.log(`HERO_CONTRAST ${theme} ${image} ${path} ${i} ${JSON.stringify(result)}`)
          expect(result.min, JSON.stringify(result)).toBeGreaterThanOrEqual(4.5)
        }
      })
    }
  }
  test(`rendered analytics legend contrast ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await installFixtures(page, theme, 'white')
    await page.goto('/admin/analytics', { waitUntil: 'networkidle' })
    const legend = page.locator('.recharts-legend-item-text')
    await expect(legend).toHaveCount(3)
    for (let i = 0; i < 3; i++) {
      const result = await measureBackgroundContrast(legend.nth(i))
      console.log(`LEGEND_CONTRAST ${theme} ${i} ${JSON.stringify(result)}`)
      expect(result.min, JSON.stringify(result)).toBeGreaterThanOrEqual(4.5)
    }
  })
  for (const viewport of ['desktop', 'mobile'] as const) test(`rendered income dialog description contrast ${theme} ${viewport}`, async ({ page }) => {
    await page.setViewportSize(viewport === 'desktop' ? { width: 1280, height: 900 } : { width: 390, height: 844 })
    await installFixtures(page, theme, 'white')
    await page.goto('/admin/finance?tab=income', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /open book.*2026/i }).click()
    await page.getByRole('button', { name: /^manual income$/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const descriptionId = await dialog.getAttribute('aria-describedby')
    expect(descriptionId).toBeTruthy()
    const description = dialog.locator(`[id="${descriptionId}"]`)
    await expect(description).toContainText(/enter|service|payment/i)
    const close = dialog.getByRole('button', { name: 'Close', exact: true })
    const overlap = await description.evaluate((el, closeElement) => {
      const a = el.getBoundingClientRect(), b = closeElement.getBoundingClientRect()
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
    }, await close.elementHandle())
    expect(overlap, 'dialog description must not overlap the close control').toBe(false)
    const result = await measureBackgroundContrast(description)
    console.log(`DIALOG_CONTRAST ${theme} ${JSON.stringify(result)}`)
    expect(result.min, JSON.stringify(result)).toBeGreaterThanOrEqual(4.5)
  })
}
