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

// Booking and token links: fixture-driven states, in both supported UI languages.
// These metrics do not replace browser zoom or a manual accessibility review.
const M2_BOOKING_TOKEN_STATES = [
  'date-error', 'dates', 'slot-error', 'slots', 'summary',
  'token-reservation', 'token-expired', 'unsubscribe-success', 'unsubscribe-failed',
] as const
for (const mode of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const state of M2_BOOKING_TOKEN_STATES) {
      for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
        test(`M2 booking-token ${mode} ${language} ${state} ${adjustment}`, async ({ page }) => {
          await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript(({ selectedMode, locale }) => {
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', selectedMode)
            localStorage.setItem('APP_LOCALE', locale)
          }, { selectedMode: mode, locale: language })
          await page.route('**/api/settings/public', async intercepted => {
            const response = await intercepted.fetch()
            if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
            const rows = await response.json() as Array<{ key: string; value: string }>
            await intercepted.fulfill({ response, json: [
              ...rows.filter(row => !['theme_active_skin', 'theme_default_mode'].includes(row.key)),
              { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode },
            ] })
          })
          const booking = ['date-error', 'dates', 'slot-error', 'slots', 'summary'].includes(state)
          let unsubscriptions = 0
          if (booking) {
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
            await page.route('**/api/reservations/availability/dates**', route => {
              if (state === 'date-error') return route.fulfill({ status: 503, json: {} })
              const date = new URL(route.request().url()).searchParams.get('fromDate')!
              return route.fulfill({ json: [{ date, available: true }] })
            })
            await page.route('**/api/reservations/availability/slots**', route => state === 'slot-error'
              ? route.fulfill({ status: 503, json: {} })
              : route.fulfill({ json: [
                { startTime: '23:59', endTime: '23:59', availableStylistCount: 1 },
                { startTime: '23:58', endTime: '23:59', availableStylistCount: 0, holdState: 'pending_hold' },
              ] }))
            await page.route('**/api/client-debts/me', route => route.fulfill({ json: [{ amount: 20 }] }))
            await page.route('**/api/loyalty/client/me**', route => route.fulfill({ json: {
              enabled: true, redeemEnabled: true, hasAccount: true, points: 100, tier: 'Gold', service: { id: 'book-test', maxDiscountPercent: 10 },
            } }))
          } else if (state.startsWith('token-')) {
            await page.route('**/api/public/reservations/by-token/m2-test-token', route => state === 'token-expired'
              ? route.fulfill({ status: 410, json: {} })
              : route.fulfill({ json: {
                publicReferenceCode: 'M2-2026-001', reservationDate: '2026-11-20', startTime: '10:00', endTime: '11:00',
                status: 'CONFIRMED', serviceName: 'Svečana frizura i profesionalna njega kose', stylistName: 'Ana Test',
                clientNotes: 'M2 napomena termina', cancelReason: null, cancelledAt: null, rescheduleStatus: 'PENDING',
                rescheduleProposedStartTime: '12:00', rescheduleProposedEndTime: '13:00',
              } }))
          } else {
            await page.route('**/api/notifications/campaigns/unsubscribe', route => {
              expect(route.request().method()).toBe('POST')
              expect(route.request().postDataJSON()).toEqual({ token: 'm2-test-token' })
              unsubscriptions++
              return state === 'unsubscribe-failed'
                ? route.fulfill({ status: 503, json: {} })
                : route.fulfill({ json: { ok: true, unsubscribed: true } })
            })
          }
          const path = booking ? '/rezervacija' : state.startsWith('token-') ? '/moj-termin/m2-test-token' : '/unsubscribe?token=m2-test-token'
          await page.goto(path, { waitUntil: 'networkidle' })
          const url = new URL(page.url())
          expect(url.pathname).toBe(booking ? '/rezervacija' : state.startsWith('token-') ? '/moj-termin/m2-test-token' : '/unsubscribe')
          if (state.startsWith('unsubscribe-')) expect(url.searchParams.get('token')).toBe('m2-test-token')
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          if (booking) {
            await page.locator('#public-service-search').focus()
            await page.getByRole('button', { name: /Svečana frizura/ }).first().click()
            await expect(page.locator('[data-reserve-selected-item]')).toContainText('Svečana frizura')
            if (state === 'date-error') {
              await expect(page.locator('[data-aurum-page="reserve"] [role="alert"]')).toBeVisible()
            } else {
              const date = page.locator('[data-reserve-calendar] button[aria-pressed="false"]:not([disabled])')
              await expect(date).toHaveCount(1)
              if (state !== 'dates') {
                await date.click()
                await expect(page.locator('[data-reserve-calendar] button[aria-pressed="true"]')).toBeVisible()
                if (state === 'slot-error') {
                  await expect(page.locator('[data-aurum-page="reserve"] [role="alert"]')).toBeVisible()
                } else {
                  const slot = page.locator('[data-reserve-slot]').filter({ hasText: '23:59' }).first()
                  await expect(slot).toBeEnabled()
                  await expect(page.locator('[data-reserve-slot]').filter({ hasText: '23:58' })).toBeDisabled()
                  if (state === 'summary') {
                    await slot.click()
                    await expect(page.locator('#reservation-notes')).toBeVisible()
                    await expect(page.locator('#loyalty-discount-percent')).toBeVisible()
                    await expect(page.getByRole('checkbox')).toBeVisible()
                    await page.locator('#reservation-notes').fill('M2 booking notes')
                    await page.locator('#loyalty-discount-percent').fill('5')
                    await page.getByRole('checkbox').check()
                    await expect(page.locator('[data-aurum-page="reserve"] button[type="submit"]')).toBeEnabled()
                  }
                }
              }
            }
          } else if (state === 'token-reservation') {
            await expect(page.locator('[data-aurum-page="reservation-view"]')).toContainText('M2-2026-001')
            await expect(page.locator('[data-aurum-page="reservation-view"]')).toContainText('M2 napomena termina')
            await expect(page.locator('[data-aurum-page="reservation-view"]')).toContainText('12:00')
          } else if (state === 'token-expired') {
            await expect(page.locator('[data-aurum-page="reservation-view"] [role="alert"]')).toBeVisible()
            await expect(page.locator('[data-aurum-page="reservation-view"] [role="alert"]')).toContainText(language === 'bs' ? 'Termin nije pronađen' : 'appointment was not found')
          } else {
            await page.getByRole('button', { name: /odjavi me|unsubscribe me/i }).click()
            await expect.poll(() => unsubscriptions).toBe(1)
            await expect(page.locator('[data-aurum-page="unsubscribe"] h1')).toHaveText(state === 'unsubscribe-success'
              ? (language === 'bs' ? 'Odjava je završena' : 'You are unsubscribed')
              : (language === 'bs' ? 'Odjavu trenutno nije moguće završiti' : 'We could not complete the unsubscribe right now'))
            if (state === 'unsubscribe-failed') await expect(page.getByRole('button', { name: /pokušaj ponovo|try again/i })).toBeVisible()
          }
          // The async result can start another transition after the first animation snapshot.
          await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1, { timeout: 10_000 }).toBe(0)
          if (adjustment === '320px') {
            const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
            if (widths.scroll > widths.viewport + 1) report(`M2 booking-token ${mode} ${language} ${state} 320`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
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
            const newlyClipped = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
            if (newlyClipped.length) report(`M2 booking-token ${mode} ${language} ${state} ${adjustment}`, JSON.stringify(newlyClipped.slice(0, 8)))
            expect(newlyClipped, `${state} ${mode} ${language} ${adjustment}: newly clipped elements`).toEqual([])
          }
        })
      }
    }
  }
}

// Tokenized reservation: cancelled data and transient error with a successful retry.
for (const mode of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const state of ['cancelled', 'retry'] as const) {
      for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
        test(`M2 token additional ${mode} ${language} ${state} ${adjustment}`, async ({ page }) => {
          await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript(({ selectedMode, locale }) => {
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', selectedMode)
            localStorage.setItem('APP_LOCALE', locale)
          }, { selectedMode: mode, locale: language })
          await page.route('**/api/settings/public', async route => {
            const response = await route.fetch()
            if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
            const rows = await response.json() as Array<{ key: string; value: string }>
            await route.fulfill({ response, json: [...rows.filter(row => !['theme_active_skin', 'theme_default_mode'].includes(row.key)), { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode }] })
          })
          let requests = 0
          const payload = { publicReferenceCode: 'M2-CANCEL-001', reservationDate: '2026-11-20', startTime: '10:00', endTime: '11:00', status: 'CANCELLED_BY_CLIENT', serviceName: 'Svečana frizura i njega duge kose', stylistName: 'Ana Test', clientNotes: 'Važna napomena termina', cancelReason: 'Klijent nije u mogućnosti doći na zakazani termin.', cancelledAt: '2026-11-19T10:00:00Z', rescheduleStatus: null, rescheduleProposedStartTime: null, rescheduleProposedEndTime: null }
          await page.route('**/api/public/reservations/by-token/m2-cancel-token', route => {
            expect(route.request().method()).toBe('GET')
            requests++
            return state === 'retry' && requests === 1 ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: payload })
          })
          const path = '/moj-termin/m2-cancel-token'
          await page.goto(path, { waitUntil: 'networkidle' })
          expect(new URL(page.url()).pathname).toBe(path)
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          const root = page.locator('[data-aurum-page="reservation-view"]')
          if (state === 'retry') {
            await expect(root.getByRole('alert')).toBeVisible()
            await expect(root.getByRole('button', { name: /pokušaj ponovo|retry|try again/i })).toBeVisible()
          } else {
            await expect(root).toContainText('M2-CANCEL-001')
            await expect(root).toContainText(payload.cancelReason)
            await expect(root).toContainText(payload.serviceName)
          }
          const settled = await settleAnimations(page)
          expect(settled?.stillRunning).toBe(0)
          if (adjustment === '320px') {
            const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
            if (widths.scroll > widths.viewport + 1) report(`M2 token additional ${mode} ${language} ${state}`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
            expect(widths.scroll - widths.viewport, JSON.stringify(widths)).toBeLessThanOrEqual(1)
          } else {
            const before = await page.evaluate(clippedSnapshot)
            if (adjustment === 'text-200') {
              const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
              await page.evaluate(size => { document.documentElement.style.fontSize = `${size * 2}px` }, base)
              await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(base * 2, 2)
            } else await page.addStyleTag({ content: TEXT_SPACING })
            await settleAnimations(page)
            const after = await page.evaluate(clippedSnapshot)
            const newlyClipped = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
            if (newlyClipped.length) report(`M2 token additional ${mode} ${language} ${state} ${adjustment}`, JSON.stringify(newlyClipped.slice(0, 8)))
            expect(newlyClipped).toEqual([])
          }
          if (state === 'retry') {
            await root.getByRole('button', { name: /pokušaj ponovo|retry|try again/i }).click()
            await expect(root.getByRole('alert')).toBeHidden()
            await expect(root).toContainText('M2-CANCEL-001')
            await expect(root).toContainText(payload.cancelReason)
            await expect.poll(() => requests).toBe(2)
          } else expect(requests).toBe(1)
        })
      }
    }
  }
}

// An uncertain booking submission is isolated and retried with the same idempotency key.
for (const mode of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
      test(`M2 booking failed-submit ${mode} ${language} ${adjustment}`, async ({ page }) => {
        await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.addInitScript(({ selectedMode, locale }) => {
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', selectedMode)
          localStorage.setItem('APP_LOCALE', locale)
          localStorage.setItem('token', 'test-fixture-token')
        }, { selectedMode: mode, locale: language })
        await page.route('**/api/settings/public', async route => {
          const response = await route.fetch()
          if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
          const rows = await response.json() as Array<{ key: string; value: string }>
          await route.fulfill({ response, json: [...rows.filter(row => !['theme_active_skin', 'theme_default_mode'].includes(row.key)), { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode }] })
        })
        await page.route('**/api/users/profile', route => route.fulfill({ json: { id: 'test-user', username: 'test', firstName: 'Test', lastName: 'User', createdAt: '2025-01-01T00:00:00.000Z', email: 'test@example.com', phone: '+387 61 123 456', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['CLIENT'] } }))
        await page.route('**/api/services**', route => route.fulfill({ json: [{ id: 'book-test', name: 'Svečana frizura', durationMinutes: 60, gender: 'FEMALE', subcategory: { name: 'Kosa', category: { name: 'Žene' } } }] }))
        await page.route('**/api/reservations/availability/dates**', route => route.fulfill({ json: [{ date: new URL(route.request().url()).searchParams.get('fromDate'), available: true }] }))
        await page.route('**/api/reservations/availability/slots**', route => route.fulfill({ json: [{ startTime: '23:59', endTime: '23:59', availableStylistCount: 1 }] }))
        await page.route('**/api/client-debts/me', route => route.fulfill({ json: [] }))
        await page.route('**/api/loyalty/client/me**', route => route.fulfill({ json: { enabled: false } }))
        const requests: { key: string | undefined; payload: unknown }[] = []
        await page.route('**/api/reservations', route => {
          expect(route.request().method()).toBe('POST')
          requests.push({ key: route.request().headers()['idempotency-key'], payload: route.request().postDataJSON() })
          return route.fulfill({ status: 503, json: {} })
        })
        await page.goto('/rezervacija', { waitUntil: 'networkidle' })
        expect(new URL(page.url()).pathname).toBe('/rezervacija')
        await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
        await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
        await expect(page.locator('html')).toHaveAttribute('lang', language)
        await page.locator('#public-service-search').focus()
        await page.getByRole('button', { name: /Svečana frizura/ }).first().click()
        const date = page.locator('[data-reserve-calendar] button[aria-pressed="false"]:not([disabled])')
        await expect(date).toHaveCount(1)
        await date.click()
        await page.locator('[data-reserve-slot]').filter({ hasText: '23:59' }).first().click()
        const note = page.locator('#reservation-notes')
        await note.fill('M2 retry note')
        const submit = page.locator('[data-aurum-page="reserve"] button[type="submit"]')
        await submit.click()
        await expect.poll(() => requests.length).toBe(1)
        await expect(submit).toBeEnabled()
        await expect(note).toHaveValue('M2 retry note')
        await expect(page.getByText(language === 'bs' ? 'Greška.' : 'Error.', { exact: true }).first()).toBeVisible()
        expect(requests[0].key).toBeTruthy()
        expect(requests[0].payload).toMatchObject({ serviceIds: ['book-test'], startTime: '23:59', clientNotes: 'M2 retry note' })
        await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1, { timeout: 10_000 }).toBe(0)
        if (adjustment === '320px') {
          const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
          if (widths.scroll > widths.viewport + 1) report(`M2 booking failed-submit ${mode} ${language}`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
          expect(widths.scroll - widths.viewport, JSON.stringify(widths)).toBeLessThanOrEqual(1)
        } else {
          const before = await page.evaluate(clippedSnapshot)
          if (adjustment === 'text-200') {
            const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
            await page.evaluate(size => { document.documentElement.style.fontSize = `${size * 2}px` }, base)
            await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(base * 2, 2)
            const header = page.locator('[data-aurum-shell="header"]')
            const headerHeight = await header.evaluate(el => el.getBoundingClientRect().height)
            expect(headerHeight).toBeGreaterThan(900 * 0.3)
            await expect.poll(() => header.evaluate(el => getComputedStyle(el).position)).toBe('static')
          } else await page.addStyleTag({ content: TEXT_SPACING })
          await settleAnimations(page)
          const after = await page.evaluate(clippedSnapshot)
          const lost = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
          if (lost.length) report(`M2 booking failed-submit ${mode} ${language} ${adjustment}`, JSON.stringify(lost.slice(0, 8)))
          expect(lost).toEqual([])
        }
        try {
          await submit.click({ timeout: 8_000 })
        } catch (error) {
          const geometry = await submit.evaluate(el => {
            const rect = el.getBoundingClientRect()
            const style = getComputedStyle(el)
            const x = Math.max(0, Math.min(window.innerWidth - 1, rect.left + rect.width / 2))
            const y = Math.max(0, Math.min(window.innerHeight - 1, rect.top + rect.height / 2))
            return { rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, viewport: { width: window.innerWidth, height: window.innerHeight }, overflow: style.overflow, hit: document.elementsFromPoint(x, y).slice(0, 5).map(item => ({ tag: item.tagName, class: String(item.className).slice(0, 100), text: (item.textContent || '').slice(0, 50) })) }
          })
          report(`M2 booking retry click ${mode} ${language} ${adjustment}`, JSON.stringify(geometry))
          throw error
        }
        await expect.poll(() => requests.length).toBe(2)
        expect(requests[1]).toEqual(requests[0])
        await expect(note).toHaveValue('M2 retry note')
        expect(new URL(page.url()).pathname).toBe('/rezervacija')
        if (adjustment === 'text-200') {
          await page.evaluate(() => { document.documentElement.style.removeProperty('font-size') })
          await expect.poll(() => page.locator('[data-aurum-shell="header"]').evaluate(el => getComputedStyle(el).position)).toBe('sticky')
        }
      })
    }
  }
}
