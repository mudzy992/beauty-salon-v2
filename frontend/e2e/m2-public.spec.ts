import { expect, test } from '@playwright/test'
import { clippedSnapshot, overflowingElements } from './dom-metrics.mjs'
import { settleAnimations } from './settle'

// Initial public screens; reservation uses an isolated authenticated-client fixture.
// Token/ID detail pages and other authenticated flows need separate fixtures.
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

test.afterEach(async ({}, info) => {
  if (info.status !== info.expectedStatus) {
    report(`M2 public failure ${info.title}`, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2000))
  }
})

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
        if (path === '/rezervacija') {
          await page.addInitScript(() => localStorage.setItem('token', 'test-fixture-token'))
          await page.route('**/api/users/profile', route => route.fulfill({ json: {
            id: 'test-user', username: 'test', firstName: 'Test', lastName: 'User',
            createdAt: '2025-01-01T00:00:00.000Z', email: 'test@example.com', phone: '+387 61 123 456',
            gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['CLIENT'],
          } }))
          await page.route('**/api/services**', route => route.fulfill({ json: [{
            id: 'book-test', name: 'Svečana frizura', durationMinutes: 60, gender: 'FEMALE',
            subcategory: { name: 'Kosa', category: { name: 'Žene' } },
          }] }))
          await page.route('**/api/reservations/availability/dates**', route => route.fulfill({ json: [] }))
        }
        await page.goto(path, { waitUntil: 'networkidle' })
        expect(new URL(page.url()).pathname).toBe(path)
        if (path === '/rezervacija') await expect(page.locator('#public-service-search')).toBeVisible()
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

// Populated service and article details: separate from the initial-screen sweep.
for (const mode of ['light', 'dark'] as const) {
  for (const state of ['service-detail', 'blog-post'] as const) {
    for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
      test(`M2 public populated ${mode} ${state} ${adjustment}`, async ({ page }) => {
        await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.addInitScript(selectedMode => {
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', selectedMode)
        }, mode)
        await page.route('**/api/settings/public', async intercepted => {
          const response = await intercepted.fetch()
          if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
          const rows = await response.json() as Array<{ key: string; value: string }>
          const settings: Record<string, string> = {
            theme_active_skin: 'aurum', theme_default_mode: mode, public_feature_blog: 'true',
            public_service_prices_enabled: 'true', public_contact_phone: '+387 62 568 580',
            public_contact_email: 'salon@example.test', public_contact_address: 'Visoko',
          }
          await intercepted.fulfill({ response, json: [
            ...rows.filter(row => !(row.key in settings)),
            ...Object.entries(settings).map(([key, value]) => ({ key, value })),
          ] })
        })
        await page.route('**/api/services/detail-test', route => route.fulfill({ json: {
          id: 'detail-test', name: 'Svečana frizura – elegancija za posebne trenutke',
          heroImage: '/brand/aurum-hero-editorial.jpg', shortDescription: 'Njega za posebne trenutke.',
          durationMinutes: 60, price: 50, subcategory: { name: 'Kosa', category: { name: 'Žene' } },
        } }))
        await page.route('**/api/daily-log/before-after**', route => route.fulfill({ json: {
          items: [{ id: 'pair-test', before: { pathOriginal: '/brand/aurum-hero-editorial.jpg' }, after: { pathOriginal: '/brand/aurum-hero-editorial.jpg' } }],
          hasMore: false, nextOffset: 1,
        } }))
        await page.route('**/api/blog/slug/test-article', route => route.fulfill({ json: {
          id: 'article-1', slug: 'test-article', title: 'Njega kose i savjeti za svakodnevnu ljepotu',
          excerpt: 'Praktični savjeti za zdraviju kosu i njegu kod kuće.',
          content: '<p>Koristan članak o njezi kose. <a href="/usluge">Pogledajte usluge</a>.</p>',
          language: 'bs', heroImage: null, publishedAt: '2025-01-01T12:00:00Z',
        } }))
        await page.route('**/api/blog/article-1/comments**', route => route.fulfill({ json: [{
          id: 'comment-1', content: 'Odličan članak o njezi kose!', createdAt: '2025-01-02T12:00:00Z', user: { firstName: 'Ana', lastName: 'Test' },
        }] }))
        const path = state === 'service-detail' ? '/usluge/detail-test' : '/blog/test-article'
        await page.goto(path, { waitUntil: 'networkidle' })
        expect(new URL(page.url()).pathname).toBe(path)
        await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
        await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
        if (state === 'service-detail') {
          await expect(page.getByRole('heading', { level: 1, name: 'Svečana frizura – elegancija za posebne trenutke' })).toBeVisible()
          await expect(page.locator('[data-aurum-spotlight]')).toBeVisible()
        } else {
          await expect(page.locator('[data-aurum-page="blog-post"] h1')).toHaveText('Njega kose i savjeti za svakodnevnu ljepotu')
          await expect(page.locator('[data-aurum-comment]')).toContainText('Odličan članak')
        }
        const settled = await settleAnimations(page)
        expect(settled).not.toBeNull()
        expect(settled?.stillRunning).toBe(0)
        if (adjustment === '320px') {
          const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
          if (widths.scroll > widths.viewport + 1) report(`M2 public populated ${mode} ${state} 320`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
          expect(widths.viewport).toBe(320)
          expect(widths.scroll - widths.viewport).toBeLessThanOrEqual(1)
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
          const lost = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
          if (lost.length) report(`M2 public populated ${mode} ${state} ${adjustment}`, JSON.stringify(lost.slice(0, 8)))
          expect(lost, `${state} ${mode} ${adjustment}: newly clipped elements`).toEqual([])
        }
      })
    }
  }
}

// Interactive public states: selected booking service and gallery lightbox.
for (const mode of ['light', 'dark'] as const) {
  for (const state of ['booking-selected', 'gallery-lightbox'] as const) {
    for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
      test(`M2 public interactive ${mode} ${state} ${adjustment}`, async ({ page }) => {
        await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.addInitScript(selectedMode => {
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', selectedMode)
        }, mode)
        await page.route('**/api/settings/public', async intercepted => {
          const response = await intercepted.fetch()
          if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
          const rows = await response.json() as Array<{ key: string; value: string }>
          const settings: Record<string, string> = { theme_active_skin: 'aurum', theme_default_mode: mode, public_feature_gallery: 'true' }
          await intercepted.fulfill({ response, json: [
            ...rows.filter(row => !(row.key in settings)),
            ...Object.entries(settings).map(([key, value]) => ({ key, value })),
          ] })
        })
        if (state === 'booking-selected') {
          await page.addInitScript(() => localStorage.setItem('token', 'test-fixture-token'))
          await page.route('**/api/users/profile', route => route.fulfill({ json: {
            id: 'test-user', username: 'test', firstName: 'Test', lastName: 'User', createdAt: '2025-01-01T00:00:00.000Z',
            email: 'test@example.com', phone: '+387 61 123 456', gender: 'FEMALE', genderOnboardingCompleted: true,
            isEmailVerified: true, mustChangePassword: false, roles: ['CLIENT'],
          } }))
          await page.route('**/api/services**', route => route.fulfill({ json: [{
            id: 'book-test', name: 'Svečana frizura', durationMinutes: 60, gender: 'FEMALE',
            subcategory: { name: 'Kosa', category: { name: 'Žene' } },
          }] }))
          await page.route('**/api/reservations/availability/dates**', route => route.fulfill({ json: [] }))
        } else {
          const category = { id: 'gallery-test', name: 'Frizure', sortOrder: 0, _count: { images: 1 }, images: [{ id: 'image-test', sortOrder: 0, upload: { pathOriginal: '/brand/aurum-hero-editorial.jpg' } }] }
          await page.route('**/api/gallery/categories**', route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/gallery-test') ? category : [category] }))
          await page.route('**/api/daily-log/before-after**', route => route.fulfill({ json: { items: [], hasMore: false, nextOffset: 0 } }))
        }
        const path = state === 'booking-selected' ? '/rezervacija' : '/galerija'
        await page.goto(path, { waitUntil: 'networkidle' })
        expect(new URL(page.url()).pathname).toBe(path)
        await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
        await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
        if (state === 'booking-selected') {
          await page.locator('#public-service-search').focus()
          await page.getByRole('button', { name: /Svečana frizura/ }).first().click()
          await expect(page.locator('[data-reserve-selected-item]')).toBeVisible()
          await expect(page.locator('[data-reserve-calendar]')).toBeVisible()
        } else {
          const trigger = page.getByRole('button', { name: /Frizure/ }).first()
          await trigger.focus()
          await page.keyboard.press('Enter')
          await expect(page.locator('[data-aurum-lightbox] img')).toBeVisible()
        }
        const settled = await settleAnimations(page)
        expect(settled).not.toBeNull()
        expect(settled?.stillRunning).toBe(0)
        if (adjustment === '320px') {
          const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
          if (widths.scroll > widths.viewport + 1) report(`M2 public interactive ${mode} ${state} 320`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
          expect(widths.viewport).toBe(320)
          expect(widths.scroll - widths.viewport).toBeLessThanOrEqual(1)
          if (state === 'gallery-lightbox') {
            const box = await page.locator('[data-aurum-lightbox]').boundingBox()
            expect(box).not.toBeNull()
            expect(box!.x).toBeGreaterThanOrEqual(-1)
            expect(box!.x + box!.width).toBeLessThanOrEqual(321)
          }
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
          const lost = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
          if (lost.length) report(`M2 public interactive ${mode} ${state} ${adjustment}`, JSON.stringify(lost.slice(0, 8)))
          expect(lost, `${state} ${mode} ${adjustment}: newly clipped elements`).toEqual([])
        }
        if (state === 'gallery-lightbox') {
          await page.keyboard.press('Escape')
          await expect(page.locator('[data-aurum-lightbox]')).toBeHidden()
          await expect(page.getByRole('button', { name: /Frizure/ }).first()).toBeFocused()
        }
      })
    }
  }
}
