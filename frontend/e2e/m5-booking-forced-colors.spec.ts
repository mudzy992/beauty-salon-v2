import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { AXE_RULE_TAGS, assertableViolations } from './axe-coverage.mjs'
import { settleAnimations } from './settle'

// Chromium forced-colors emulation, synthetic client and GETs, all writes blocked.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const palette of ['light', 'dark'] as const) {
      test(`M5 booking state forced-colors ${theme} ${language} ${palette}`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce', colorScheme: palette })
        await page.clock.setFixedTime(new Date('2026-03-04T12:00:00Z'))
        await page.addInitScript(({ mode, locale }) => {
          localStorage.setItem('token', 'fixture-client-token')
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', mode)
          localStorage.setItem('APP_LOCALE', locale)
        }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
        const writes: string[] = []
        await page.route('**/api/**', route => {
          const req = route.request(), url = new URL(req.url()), path = url.pathname
          if (req.method() !== 'GET') { writes.push(`${req.method()} ${path}`); return route.abort() }
          if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
          if (path === '/api/users/profile') return route.fulfill({ json: { id: 'fixture-client', username: 'test', email: 'test@example.test', phone: '+387 61 123 456', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['CLIENT'] } })
          if (path === '/api/services') return route.fulfill({ json: [{ id: 'service-one', name: 'Fixture service', durationMinutes: 60, gender: 'FEMALE' }] })
          if (path === '/api/reservations/availability/dates') return route.fulfill({ json: [{ date: url.searchParams.get('fromDate'), available: true }, { date: '2026-03-05', available: true }] })
          if (path === '/api/reservations/availability/slots') return route.fulfill({ json: [{ startTime: '23:58', endTime: '23:58', availableStylistCount: 1 }, { startTime: '23:59', endTime: '23:59', availableStylistCount: 1 }] })
          if (path === '/api/client-debts/me') return route.fulfill({ json: [] })
          if (path === '/api/loyalty/client/me') return route.fulfill({ json: { enabled: false, hasAccount: false } })
          return route.fulfill({ json: {} })
        })
        await page.goto('/rezervacija', { waitUntil: 'networkidle' })
        expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true)
        expect(await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)).toBe(palette === 'dark')
        await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
        await expect(page.locator('html')).toHaveAttribute('lang', language)
        const progress = page.getByRole('progressbar', { name: /napredak rezervacije|reservation progress/i })
        await expect(progress).toHaveAttribute('aria-valuemin', '1')
        await expect(progress).toHaveAttribute('aria-valuemax', '4')
        const steps = page.locator('[data-aurum-progress] > div > div:first-child')
        await expect(steps).toHaveCount(4)
        const connectors = page.locator('[data-reserve-progress-connector]')
        await expect(connectors).toHaveCount(3)
        const connectorStyles = await connectors.evaluateAll(elements => elements.map(el => {
          const css = getComputedStyle(el)
          return { style: css.borderTopStyle, width: css.borderTopWidth }
        }))
        expect(connectorStyles.every(css => css.style === 'solid' && parseFloat(css.width) >= 1), JSON.stringify(connectorStyles)).toBe(true)
        async function checkStep(number: number) {
          await expect(progress).toHaveAttribute('aria-valuenow', String(number))
          await expect(progress).toHaveAttribute('aria-valuetext', language === 'bs' ? `Korak ${number} od 4` : `Step ${number} of 4`)
          const styles = await steps.evaluateAll(elements => elements.map(el => {
            const css = getComputedStyle(el)
            return { border: css.borderWidth, borderStyle: css.borderStyle, color: css.outlineColor, background: css.backgroundColor, outline: css.outlineStyle, width: css.outlineWidth }
          }))
          const active = styles[number - 1]
          expect(active.outline, JSON.stringify(styles)).toBe('solid')
          expect(parseFloat(active.width), JSON.stringify(styles)).toBeGreaterThanOrEqual(2)
          expect(active.color, JSON.stringify(styles)).not.toBe(active.background)
          expect(styles.filter((_, index) => index !== number - 1).every(style => style.outline === 'none'), JSON.stringify(styles)).toBe(true)
          expect(styles.every(style => style.borderStyle === 'solid' && parseFloat(style.border) >= 1), JSON.stringify(styles)).toBe(true)
        }
        await checkStep(1)
        const search = page.locator('#public-service-search')
        await search.focus()
        await page.keyboard.type('Fixture')
        const option = page.getByRole('button', { name: /Fixture service/i })
        await option.focus()
        await page.keyboard.press('Enter')
        await checkStep(2)
        const days = page.locator('[data-reserve-calendar] button[aria-pressed]:not([disabled])')
        await expect(days).toHaveCount(2)
        const day = days.first()
        await expect(day).toHaveAttribute('aria-pressed', 'false')
        await day.focus()
        await page.keyboard.press('Enter')
        await checkStep(3)
        const slot = page.locator('[data-reserve-slot]').filter({ hasText: '23:59' })
        await expect(slot).toBeEnabled()
        await slot.focus()
        await page.keyboard.press('Enter')
        await checkStep(4)
        await page.locator('#reservation-notes').focus()
        for (const target of [day, slot]) {
          await expect(target).toHaveAttribute('aria-pressed', 'true')
          const state = await target.evaluate(el => {
            const css = getComputedStyle(el)
            return { style: css.borderStyle, width: css.borderWidth, color: css.borderColor, background: css.backgroundColor }
          })
          expect(state.style, JSON.stringify(state)).toBe('solid')
          expect(parseFloat(state.width), JSON.stringify(state)).toBeGreaterThanOrEqual(2)
          expect(state.color, JSON.stringify(state)).not.toBe(state.background)
        }
        for (const target of [days.last(), page.locator('[data-reserve-slot]').filter({ hasText: '23:58' })]) {
          await expect(target).toHaveAttribute('aria-pressed', 'false')
          const border = await target.evaluate(el => parseFloat(getComputedStyle(el).borderWidth))
          expect(border).toBeLessThan(3)
        }
        // Contrast scanning runs in normal colors, separately from the forced-colors checks.
        if (palette === 'light') {
          await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' })
          expect(await settleAnimations(page)).not.toBeNull()
          const result = await new AxeBuilder({ page }).include('[data-aurum-page="reserve"]').withTags(AXE_RULE_TAGS).analyze()
          const findings = { violations: result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })), incomplete: result.incomplete.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })) }
          console.log(`M7_BOOKING_SUMMARY_${theme.toUpperCase()}_${language.toUpperCase()} ${JSON.stringify(findings)}`)
          await test.info().attach('booking-summary-axe', { body: JSON.stringify(findings, null, 2), contentType: 'application/json' })
          expect(assertableViolations(result.violations)).toEqual([])
        }
        expect(writes).toEqual([])
      })
    }
  }
}
