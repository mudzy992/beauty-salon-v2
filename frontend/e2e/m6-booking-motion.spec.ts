import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { AXE_RULE_TAGS, assertableViolations } from './axe-coverage.mjs'

function contrast(foreground: string, background: string) {
  const luminance = (color: string) => {
    const values = (color.match(/[\d.]+/g) ?? []).map(Number)
    expect(values.length === 3 || (values.length === 4 && values[3] === 1), `opaque RGB required: ${color}`).toBe(true)
    const [r, g, b] = values.slice(0, 3).map(value => {
      const v = value / 255
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const a = luminance(foreground), b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

// Isolated client and availability fixtures. No API writes are allowed.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const preference of ['reduce', 'no-preference'] as const) {
    test(`M6 booking preselected service ${theme} ${preference}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.emulateMedia({ reducedMotion: preference })
      await page.addInitScript(({ mode }) => {
        localStorage.setItem('token', 'fixture-client-token')
        localStorage.setItem('APP_LOCALE', 'en')
        localStorage.removeItem('nejra.theme')
        localStorage.setItem('nejra.theme.mode', mode)
        const telemetry = { scrolls: [] as Array<{ behavior: string | undefined; block: string | undefined }> }
        ;(window as unknown as { motionFixture: typeof telemetry }).motionFixture = telemetry
        const original = Element.prototype.scrollIntoView
        Element.prototype.scrollIntoView = function (options?: boolean | ScrollIntoViewOptions) {
          if (this.querySelector('legend')?.textContent?.includes('Select a date')) {
            const value = typeof options === 'object' ? options : undefined
            telemetry.scrolls.push({ behavior: value?.behavior, block: value?.block })
          }
          return original.call(this, options)
        }
      }, { mode: theme === 'dark' ? 'dark' : 'light' })
      const writes: string[] = []
      await page.route('**/api/**', route => {
        const request = route.request(), path = new URL(request.url()).pathname
        if (request.method() !== 'GET') { writes.push(`${request.method()} ${path}`); return route.abort() }
        if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
        if (path === '/api/users/profile') return route.fulfill({ json: { id: 'fixture-client', username: 'test', email: 'test@example.test', phone: '+387 61 123 456', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['CLIENT'] } })
        if (path === '/api/services') return route.fulfill({ json: [{ id: 'service-one', name: 'Fixture service', durationMinutes: 60, gender: 'FEMALE' }] })
        if (path === '/api/reservations/availability/dates') return route.fulfill({ json: [] })
        if (path === '/api/client-debts/me') return route.fulfill({ json: [] })
        if (path === '/api/loyalty/client/me') return route.fulfill({ json: { enabled: false, hasAccount: false } })
        return route.fulfill({ json: {} })
      })
      await page.goto('/rezervacija?serviceId=service-one', { waitUntil: 'domcontentloaded' })
      await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
      await expect(page.getByText('Fixture service', { exact: true })).toBeVisible()
      await expect(page.getByRole('group', { name: /select a date/i })).toBeVisible()
      const progressBar = page.getByRole('progressbar', { name: /reservation progress/i })
      await expect(progressBar).toHaveAttribute('aria-valuemin', '1')
      await expect(progressBar).toHaveAttribute('aria-valuemax', '4')
      await expect(progressBar).toHaveAttribute('aria-valuenow', '2')
      await expect(progressBar).toHaveAttribute('aria-valuetext', 'Step 2 of 4')
      const read = () => page.evaluate(() => (window as unknown as { motionFixture: { scrolls: Array<{ behavior: string; block: string }> } }).motionFixture)
      await expect.poll(async () => (await read()).scrolls.length).toBeGreaterThan(0)
      const { scrolls } = await read()
      expect(scrolls).toEqual([{ behavior: preference === 'reduce' ? 'auto' : 'smooth', block: 'start' }])
      if (preference === 'reduce') {
        const results = await new AxeBuilder({ page }).include('[data-aurum-page="reserve"]').withTags(AXE_RULE_TAGS).analyze()
        const findings = { violations: results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })), incomplete: results.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })) }
        const progress = await page.locator('[data-aurum-progress] > div > div:first-child').evaluateAll(elements => elements.map(el => ({ text: el.textContent, color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor })))
        console.log(`M7_BOOKING_${theme.toUpperCase()} ${JSON.stringify({ ...findings, progress })}`)
        for (const item of progress.filter(item => item.text === '3' || item.text === '4')) {
          expect(contrast(item.color, item.background), JSON.stringify(item)).toBeGreaterThanOrEqual(7)
        }
        expect(progress.filter(item => item.text === '3' || item.text === '4')).toHaveLength(2)
        await test.info().attach('booking-axe-findings', { body: JSON.stringify(findings, null, 2), contentType: 'application/json' })
        expect(assertableViolations(results.violations)).toEqual([])
      }
      expect(writes).toEqual([])
    })
  }
}
