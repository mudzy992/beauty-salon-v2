import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { assertableViolations, AXE_RULE_TAGS } from './axe-coverage.mjs'
import { settleAnimations } from './settle'

// The HTTP response is intercepted only in this isolated test; all other public
// settings remain real. This does not write shared settings or touch production.
async function configure(page: Page, skin: 'classic' | 'aurum', mode: 'light' | 'dark', preference?: 'light' | 'dark', preserveOnReload = false, settings: Record<string, string> = {}) {
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
    const filtered = rows.filter((row) => row.key !== 'theme_active_skin' && row.key !== 'theme_default_mode' && !(row.key in settings))
    await route.fulfill({ response, json: [...filtered, { key: 'theme_active_skin', value: skin }, { key: 'theme_default_mode', value: mode }, ...Object.entries(settings).map(([key, value]) => ({ key, value }))] })
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

for (const mode of ['light', 'dark'] as const) {
  for (const viewport of ['desktop', 'mobile'] as const) {
    test(`services AAA ${mode} ${viewport}: populated filters and empty result`, async ({ page }) => {
      await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 320, height: 720 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await configure(page, 'aurum', mode, undefined, false, { public_services_image_badge: 'Njega i ljepota', public_services_image_caption: 'Posjetite nas', public_services_image_subcaption: 'Uživajte u tretmanu', public_services_step_1_title: 'Pronađite tretman', public_services_step_1_description: 'Pregledajte ponudu', public_services_step_2_title: 'Odaberite termin', public_services_step_2_description: 'Izaberite datum', public_services_step_3_title: 'Uživajte u posjeti', public_services_step_3_description: 'Dobro došli' })
      await page.route('**/api/services**', (route) => {
        const path = new URL(route.request().url()).pathname
        if (path === '/api/services/categories') return route.fulfill({ json: [{ id: 'cat-test', name: 'Testdugackinazivkategorijezareflow' }] })
        if (path === '/api/services/subcategories') return route.fulfill({ json: [{ id: 'sub-test', categoryId: 'cat-test', name: 'Test njega' }] })
        if (path === '/api/services') return route.fulfill({ json: [{ id: 'service-test', subcategoryId: 'sub-test', name: 'Test usluga', durationMinutes: 45 }] })
        return route.continue()
      })
      await page.goto('/usluge', { waitUntil: 'networkidle' })
      expect(new URL(page.url()).pathname).toBe('/usluge')
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      await expect(page.locator('main')).toHaveCount(1)
      const serviceLink = page.locator('a[href="/usluge/service-test"]')
      await expect(serviceLink).toBeVisible()
      const category = page.getByRole('button', { name: 'Testdugackinazivkategorijezareflow' })
      await category.focus()
      await page.keyboard.press('Enter')
      await expect(category).toHaveAttribute('aria-pressed', 'true')
      const categoryHeading = page.getByRole('heading', { name: 'Testdugackinazivkategorijezareflow' })
      await expect(categoryHeading).toBeVisible()
      expect(await categoryHeading.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
      await expect(serviceLink).toHaveAccessibleName(/Test usluga.*45 min/i)
      await expect(page.getByText('Pronađite tretman')).toBeVisible()
      for (const step of await page.locator('[data-service-step-number]').all()) {
        const geometry = await step.evaluate((el) => ({ height: el.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(el).lineHeight), width: el.scrollWidth, available: el.clientWidth }))
        expect(geometry.height).toBeLessThanOrEqual(geometry.lineHeight + 1)
        expect(geometry.width).toBeLessThanOrEqual(geometry.available + 1)
      }
      await expect(page.getByText('Njega i ljepota')).toBeVisible()
      const caption = page.locator('[data-service-image-caption]')
      const count = page.locator('[data-aurum-service-count]')
      const captionBox = await caption.boundingBox()
      const countBox = await count.boundingBox()
      expect(captionBox && countBox).not.toBeNull()
      if (captionBox && countBox) expect(captionBox.y + captionBox.height).toBeLessThanOrEqual(countBox.y + 1)
      await serviceLink.hover()
      const hoverResults = await new AxeBuilder({ page }).withTags(AXE_RULE_TAGS).analyze()
      const hoverViolations = hoverResults.violations.filter((item) => item.tags.includes('wcag2aaa') || assertableViolations([item]).length > 0)
      console.log(`SERVICES_HOVER_${mode}_${viewport} ${JSON.stringify({ violations: hoverViolations, incomplete: hoverResults.incomplete })}`)
      expect(hoverViolations).toEqual([])
      await page.mouse.move(0, 0)
      const settled = await settleAnimations(page)
      expect(settled?.stillRunning).toBe(0)
      const explore = page.locator('[data-aurum-page="services"] a[href="#service-catalog"]')
      const colors = await explore.evaluate((el) => { const style = getComputedStyle(el); return { foreground: style.color, background: style.backgroundColor } })
      expect(colors.foreground).not.toBe(colors.background)
      for (const state of ['populated', 'no-results'] as const) {
        if (state === 'no-results') await page.locator('#public-services-search').fill('no-matching-test-service')
        const results = await new AxeBuilder({ page }).withTags(AXE_RULE_TAGS).analyze()
        const relevant = results.violations.filter((item) => item.tags.includes('wcag2aaa') || assertableViolations([item]).length > 0)
        console.log(`SERVICES_AUDIT_${mode.toUpperCase()}_${viewport.toUpperCase()}_${state.toUpperCase()} ${JSON.stringify({ violations: relevant.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) })), incomplete: results.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, html: n.html, summary: n.failureSummary })) })) })}`)
        expect(relevant).toEqual([])
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
      }
      await page.locator('#public-services-search').fill('Test usluga')
      await expect(serviceLink).toBeVisible()
      const clearSearch = page.locator('button[aria-label]').filter({ has: page.locator('svg.lucide-x') }).last()
      await clearSearch.focus()
      await page.keyboard.press('Enter')
      await expect(page.locator('#public-services-search')).toHaveValue('')
    })
  }
}

for (const mode of ['light', 'dark'] as const) {
  for (const scenario of ['empty', 'error-retry'] as const) {
    test(`services AAA ${mode}: ${scenario} state`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 720 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await configure(page, 'aurum', mode)
      let fail = scenario === 'error-retry'
      await page.route('**/api/services**', (route) => {
        const path = new URL(route.request().url()).pathname
        if (!['/api/services/categories', '/api/services/subcategories', '/api/services'].includes(path)) return route.continue()
        if (fail && path === '/api/services/categories') return route.fulfill({ status: 503, json: { message: 'Unavailable' } })
        return route.fulfill({ json: [] })
      })
      await page.goto('/usluge', { waitUntil: 'networkidle' })
      await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
      if (scenario === 'error-retry') {
        const alert = page.locator('[data-aurum-page="services"] [role="alert"]')
        await expect(alert).toBeVisible()
        const results = await new AxeBuilder({ page }).withTags(AXE_RULE_TAGS).analyze()
        const relevant = results.violations.filter((item) => item.tags.includes('wcag2aaa') || assertableViolations([item]).length > 0)
        console.log(`SERVICES_ERROR_${mode.toUpperCase()} ${JSON.stringify({ violations: relevant.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) })), incomplete: results.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) })) })}`)
        expect(relevant).toEqual([])
        fail = false
        const retry = alert.getByRole('button')
        await retry.focus()
        await page.keyboard.press('Enter')
        await expect(alert).toBeHidden()
      }
      await expect(page.getByText(/Usluge će se prikazati ovdje|Services will appear here/i)).toBeVisible()
      const results = await new AxeBuilder({ page }).withTags(AXE_RULE_TAGS).analyze()
      const relevant = results.violations.filter((item) => item.tags.includes('wcag2aaa') || assertableViolations([item]).length > 0)
      console.log(`SERVICES_EMPTY_${mode.toUpperCase()} ${JSON.stringify({ violations: relevant.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) })), incomplete: results.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) })) })}`)
      expect(relevant).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    })
  }
}

for (const mode of ['light', 'dark'] as const) {
  for (const viewport of ['desktop', 'mobile'] as const) {
    for (const gallery of ['empty', 'populated'] as const) {
      test(`service detail ${mode} ${viewport} ${gallery}: contrast and reflow`, async ({ page }) => {
        await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 320, height: 720 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await configure(page, 'aurum', mode, undefined, false, { public_service_prices_enabled: 'true', public_contact_phone: '+387 62 568 580', public_contact_email: 'salon@example.com', public_contact_address: 'Veliko Čajno, Visoko' })
        await page.route('**/api/services/detail-test', (route) => route.fulfill({ json: { id: 'detail-test', name: 'Svečana frizura – elegancija za posebne trenutke', heroImage: '/brand/aurum-hero-editorial.jpg', shortDescription: 'Njega za posebne trenutke.', durationMinutes: 60, price: 50, subcategory: { name: 'Kosa', category: { name: 'Žene' } } } }))
        await page.route('**/api/daily-log/before-after**', (route) => route.fulfill({ json: { items: gallery === 'empty' ? [] : [{ id: 'pair-test', before: { pathOriginal: '/brand/aurum-hero-editorial.jpg' }, after: { pathOriginal: '/brand/aurum-hero-editorial.jpg' } }], hasMore: false, nextOffset: gallery === 'empty' ? 0 : 1 } }))
        await page.goto('/usluge/detail-test', { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
        await expect(page.locator('main')).toHaveCount(1)
        await expect(page.getByRole('heading', { name: 'Svečana frizura – elegancija za posebne trenutke', level: 1 })).toBeVisible()
        await expect(page.locator('[data-detail-image-caption]')).toHaveCount(0)
        await expect(page.locator('[data-aurum-page="service-detail"] img').first()).toBeVisible()
        const spacer = await page.locator('[data-aurum-page="service-detail"]').evaluate((el) => { const parent = el.parentElement!; return { bottom: getComputedStyle(parent).paddingBottom, background: getComputedStyle(parent).backgroundColor } })
        expect(spacer.bottom).toBe('0px')
        expect(spacer.background).not.toBe('rgb(255, 255, 255)')
        await expect(page.locator('[data-detail-fact]')).toHaveCount(3)
        await expect(page.locator('[data-detail-contact]')).toHaveCount(2)
        if (gallery === 'empty') await expect(page.locator('[data-detail-empty-gallery]')).toBeVisible()
        else await expect(page.locator('[data-aurum-spotlight]')).toBeVisible()
        await settleAnimations(page)
        for (const state of ['normal', 'contact-hover'] as const) {
          if (state === 'contact-hover') await page.locator('[data-detail-contact]').first().hover()
          const results = await new AxeBuilder({ page }).withTags(AXE_RULE_TAGS).analyze()
          const relevant = results.violations.filter((item) => item.tags.includes('wcag2aaa') || assertableViolations([item]).length > 0)
          console.log(`SERVICE_DETAIL_${mode}_${viewport}_${gallery}_${state} ${JSON.stringify({ violations: relevant.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) })), incomplete: results.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) })) })}`)
          expect(relevant).toEqual([])
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
      })
    }
  }
}

for (const mode of ['light', 'dark'] as const) {
  for (const viewport of ['desktop', 'mobile'] as const) {
    test(`gallery lightbox ${mode} ${viewport} fits image and keyboard closes`, async ({ page }) => {
      await page.setViewportSize(viewport === 'desktop' ? { width: 1440, height: 900 } : { width: 320, height: 720 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await configure(page, 'aurum', mode)
      const category = { id: 'gallery-test', name: 'Frizure', sortOrder: 0, _count: { images: 1 }, images: [{ id: 'image-test', sortOrder: 0, upload: { pathOriginal: '/brand/aurum-hero-editorial.jpg' } }] }
      await page.route('**/api/gallery/categories**', (route) => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/gallery-test') ? category : [category] }))
      await page.route('**/api/daily-log/before-after**', (route) => route.fulfill({ json: { items: [], hasMore: false, nextOffset: 0 } }))
      await page.goto('/galerija', { waitUntil: 'networkidle' })
      const trigger = page.getByRole('button', { name: /Frizure/ }).first()
      await expect(trigger).toBeVisible()
      await trigger.focus()
      await page.keyboard.press('Enter')
      const dialog = page.locator('[data-aurum-lightbox]')
      await expect(dialog).toBeVisible()
      const image = dialog.locator('img')
      await expect(image).toBeVisible()
      const dialogBox = await dialog.boundingBox()
      const imageBox = await image.boundingBox()
      expect(dialogBox && imageBox).not.toBeNull()
      if (dialogBox && imageBox) {
        expect(Math.abs((dialogBox.x + dialogBox.width / 2) - (imageBox.x + imageBox.width / 2))).toBeLessThan(3)
        expect(dialogBox.width).toBeLessThanOrEqual(page.viewportSize()!.width * 0.9 + 1)
      }
      const results = await new AxeBuilder({ page }).include('[data-aurum-lightbox]').withTags(AXE_RULE_TAGS).analyze()
      const violations = results.violations.filter((v) => v.tags.includes('wcag2aaa') || assertableViolations([v]).length > 0)
      console.log(`GALLERY_LIGHTBOX_${mode}_${viewport} ${JSON.stringify({ violations, incomplete: results.incomplete })}`)
      expect(violations).toEqual([])
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      await expect(trigger).toBeFocused()
    })
  }
}

for (const mode of ['light', 'dark'] as const) {
  test(`reservation and profile surfaces ${mode} with selected service`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await configure(page, 'aurum', mode)
    await page.addInitScript(() => localStorage.setItem('token', 'test-fixture-token'))
    await page.route('**/api/users/profile', (route) => route.fulfill({ json: { id: 'test-user', username: 'test', email: 'test@example.com', phone: '+387 61 123 456', gender: 'FEMALE', isEmailVerified: true, mustChangePassword: false, roles: ['CLIENT'] } }))
    await page.route('**/api/services**', (route) => route.fulfill({ json: [{ id: 'book-test', name: 'Svečana frizura', durationMinutes: 60, gender: 'FEMALE', subcategory: { name: 'Kosa', category: { name: 'Žene' } } }] }))
    await page.route('**/api/reservations/availability/dates**', (route) => route.fulfill({ json: [] }))
    await page.goto('/rezervacija', { waitUntil: 'networkidle' })
    expect(new URL(page.url()).pathname).toBe('/rezervacija')
    await page.locator('#public-service-search').focus()
    await expect(page.locator('[data-reserve-duration]').first()).toBeVisible()
    const measurePair = async (selector: string) => {
      const values = await page.locator(selector).first().evaluate((el) => ({ background: getComputedStyle(el).backgroundColor, foreground: getComputedStyle(el).color }))
      expect(values.foreground).not.toBe(values.background)
    }
    await measurePair('[data-reserve-duration]')
    await page.getByRole('button', { name: /Svečana frizura/ }).first().click()
    await expect(page.locator('[data-reserve-selected-item]')).toBeVisible()
    await expect(page.locator('[data-reserve-calendar]')).toBeVisible()
    await measurePair('[data-reserve-selected-item]')
    await measurePair('[data-reserve-total]')
    await measurePair('[data-reserve-calendar]')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
    await page.goto('/profil', { waitUntil: 'networkidle' })
    await expect(page.locator('[data-aurum-page="profile"]')).toBeVisible()
    const backgrounds = await page.evaluate(() => ({ shell: getComputedStyle(document.querySelector('[data-public-shell]')!).backgroundColor, surface: getComputedStyle(document.querySelector('[data-aurum-shell="header"]')!).backgroundColor }))
    if (mode === 'dark') expect(backgrounds.shell).not.toBe('rgb(255, 255, 255)')
  })
}

for (const mode of ['light', 'dark'] as const) {
  test(`stylist workbook ${mode} populated card uses Aurum surface`, async ({ page }) => {
    await configure(page, 'aurum', mode)
    await page.addInitScript(() => localStorage.setItem('token', 'test-fixture-token'))
    await page.route('**/api/users/profile', (route) => route.fulfill({ json: { id: 'stylist-user', username: 'stylist', email: 'stylist@example.com', phone: '+387 61 123 456', gender: 'FEMALE', isEmailVerified: true, roles: ['STYLIST'] } }))
    await page.route('**/api/stylists/me', (route) => route.fulfill({ json: { id: 'stylist-profile' } }))
    await page.route('**/api/daily-log?**', (route) => route.fulfill({ json: [{ id: 'entry-test', publicReferenceCode: 'DK-TEST', date: '2026-01-01', status: 'COMPLETED', images: [], tipAmount: 0 }] }))
    await page.goto('/stylist/workbook', { waitUntil: 'networkidle' })
    expect(new URL(page.url()).pathname).toBe('/stylist/workbook')
    const card = page.locator('[data-stylist-shell] a[href="/stylist/workbook/entry-test"] > div')
    await expect(card).toBeVisible()
    const colors = await card.evaluate((el) => ({ actual: getComputedStyle(el).backgroundColor, expected: getComputedStyle(document.querySelector('[data-stylist-header]')!).backgroundColor }))
    expect(colors.actual).toBe(colors.expected)
  })
}
