import { expect, test, type Locator, type Page } from '@playwright/test'

async function tabTo(page: Page, target: Locator, limit = 150) {
  await expect(target).toBeVisible()
  for (let i = 0; i < limit && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

async function checkKeyboardFocus(target: Locator) {
  // Let Chromium apply focus-visible styles before measuring the computed ring.
  await target.page().evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  const state = await target.evaluate(el => {
    const rect = el.getBoundingClientRect()
    const top = document.elementFromPoint((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2)
    return { visible: el.matches(':focus-visible'), shadow: getComputedStyle(el).boxShadow, centerHit: !!top && (top === el || el.contains(top)) }
  })
  const diagnostic = JSON.stringify(state)
  expect(state.visible, diagnostic).toBe(true)
  expect(state.shadow, diagnostic).not.toBe('none')
  expect(state.centerHit, diagnostic).toBe(true)
  // Compare the computed solid ring to its solid offset only; this is not a full pixel or adjacent-surface audit.
  const colors = state.shadow.match(/rgba?\([\d.,\s]+\)/g) ?? []
  expect(colors.length).toBeGreaterThanOrEqual(2)
  const luminance = (color: string) => {
    const channels = (color.match(/[\d.]+/g) ?? []).map(Number)
    expect(channels.length === 3 || (channels.length === 4 && channels[3] === 1)).toBe(true)
    const linear = channels.slice(0, 3).map(value => {
      const channel = value / 255
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  }
  const offset = luminance(colors[0] ?? ''), ring = luminance(colors[1] ?? '')
  expect((Math.max(offset, ring) + 0.05) / (Math.min(offset, ring) + 0.05), diagnostic).toBeGreaterThanOrEqual(3)
}

// CI log archives are sometimes unavailable: keep bounded, fixture-only failure details in annotations.
test.afterEach(async ({}, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return
  const detail = testInfo.errors.map(error => error.message ?? String(error)).join('\n').slice(0, 2200)
  const escape = (text: string) => text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
  console.log(`::error title=${escape(testInfo.title)}::${escape(detail)}`)
})

const record = (reference: string) => ({ id: reference, publicReferenceCode: reference, date: '2026-03-04', status: 'COMPLETED', actualPrice: 50, tipAmount: 0, isManual: true, notes: null, completedAt: '2026-03-04T12:00:00Z', deletedAt: null, service: { id: 'service-1', name: 'Test service', price: 50 }, stylistProfile: { id: 'stylist-1', user: { username: 'ana', firstName: 'Ana', lastName: 'Test' } } })

// Every API write is blocked; response order is deliberately controlled.
for (const theme of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const viewport of ['desktop', 'mobile'] as const) {
      for (const scenario of ['filters', 'stale-success', 'stale-error', 'stale-late-success', 'stale-late-error', 'stale-latest-error', 'retry', 'retry-failure', 'retry-moved', 'table-scroll'] as const) {
        if (scenario === 'table-scroll' && (viewport === 'mobile')) continue
        test(`M1 daily log filters ${theme} ${language} ${viewport} ${scenario}`, async ({ page }) => {
          await page.setViewportSize(viewport === 'desktop' ? { width: 1280, height: 900 } : { width: 390, height: 844 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript(({ mode, locale }) => {
            localStorage.setItem('token', 'fixture-admin-token')
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', mode)
            localStorage.setItem('APP_LOCALE', locale)
          }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
          const queries: string[] = []
          let oldRelease!: () => void, newRelease!: () => void
          const oldGate = new Promise<void>(resolve => { oldRelease = resolve })
          const newGate = new Promise<void>(resolve => { newRelease = resolve })
          await page.route('**/api/**', async route => {
            const req = route.request(), url = new URL(req.url()), path = url.pathname
            if (req.method() !== 'GET') return route.abort()
            if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
            if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
            if (path === '/api/stylists') return route.fulfill({ json: [{ id: 'stylist-1', user: { username: 'ana', firstName: 'Ana', lastName: 'Test' } }] })
            if (path === '/api/services' || path === '/api/users/for-daily-log') return route.fulfill({ json: [] })
            if (path === '/api/daily-log') {
              queries.push(url.search)
              const count = queries.length
              if (scenario.startsWith('retry') && count === 1) return route.fulfill({ status: 503, json: {} })
              if (scenario.startsWith('retry') && count === 2) {
                await newGate
                return scenario === 'retry-failure' ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: [record('RETRY-RESULT')] })
              }
              if (scenario.startsWith('stale') && count === 2) {
                await oldGate
                return scenario === 'stale-error' || scenario === 'stale-late-error' ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: [record('STALE-RESULT')] })
              }
              if (scenario.startsWith('stale') && count === 3) {
                await newGate
                return scenario === 'stale-latest-error' ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: [record('LATEST-RESULT')] })
              }
              return route.fulfill({ json: [record('INITIAL-RESULT')] })
            }
            return route.fulfill({ json: {} })
          })
          await page.goto('/admin/daily-log', { waitUntil: 'networkidle' })
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          const from = page.locator('#daily-log-from-date'), to = page.locator('#daily-log-to-date')
          const stylist = page.locator('#daily-log-stylist'), deleted = page.getByRole('switch')
          const reset = page.getByRole('button', { name: /^resetuj$|^reset$/i })
          if (scenario.startsWith('retry')) {
            const alert = page.getByRole('alert')
            await expect(alert).toBeVisible()
            const retry = alert.getByRole('button')
            await tabTo(page, retry)
            await page.keyboard.press('Enter')
            await expect.poll(() => queries.length).toBe(2)
            // An interactive retry must not leave focus on a removed button or the document body.
            await expect(reset).toBeFocused()
            if (scenario === 'retry-moved') await tabTo(page, deleted)
            newRelease()
            if (scenario === 'retry-failure') await expect(alert).toBeVisible()
            else await expect(page.getByText('RETRY-RESULT').filter({ visible: true })).toBeVisible()
            await expect(scenario === 'retry-moved' ? deleted : reset).toBeFocused()
            return
          }
          await expect(page.getByText('INITIAL-RESULT').filter({ visible: true })).toBeVisible()
          if (scenario === 'table-scroll') {
            await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
            const region = page.locator('[data-m2-scroll-region]')
            await expect.poll(() => region.evaluate(el => el.scrollWidth - el.clientWidth)).toBeGreaterThan(0)
            await expect.poll(() => region.getAttribute('tabindex')).toBe('0')
            await tabTo(page, region)
            await page.keyboard.press('ArrowRight')
            await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)
            return
          }
          if (scenario.startsWith('stale')) {
            await tabTo(page, deleted)
            await page.keyboard.press('Space')
            await expect(deleted).toBeChecked()
            await expect.poll(() => queries.length).toBe(2)
            await page.keyboard.press('Space')
            await expect(deleted).not.toBeChecked()
            await expect.poll(() => queries.length).toBe(3)
            const oldResponse = page.waitForResponse(response => response.url().includes('/api/daily-log?') && response.url().includes('includeDeleted=1'))
            if (scenario.includes('late')) {
              newRelease()
              if (scenario === 'stale-latest-error') await expect(page.getByRole('alert')).toBeVisible()
              else await expect(page.getByText('LATEST-RESULT').filter({ visible: true })).toBeVisible()
            }
            oldRelease()
            await oldResponse
            // Allow React to process the old response before asserting the newer request still owns the UI.
            await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
            await expect(page.getByText('STALE-RESULT').filter({ visible: true })).toHaveCount(0)
            if (scenario === 'stale-latest-error') {
              await expect(page.getByRole('alert')).toBeVisible()
            } else {
              await expect(page.getByRole('alert')).toHaveCount(0)
              if (!scenario.includes('late')) {
                await expect(page.getByRole('status').filter({ hasText: /učitavanje|loading/i })).toBeVisible()
                newRelease()
              }
              await expect(page.getByText('LATEST-RESULT').filter({ visible: true })).toBeVisible()
            }
            await expect(deleted).toBeFocused()
            return
          }
          const initialFrom = await from.inputValue(), initialTo = await to.inputValue()
          await tabTo(page, from)
          // Native date widget input is filled by the fixture, not tested as OS keyboard interaction.
          await from.fill('2026-03-01')
          await to.fill('2026-03-31')
          await tabTo(page, stylist)
          await page.keyboard.press('ArrowDown')
          await expect(stylist).toHaveValue('stylist-1')
          await tabTo(page, deleted)
          await checkKeyboardFocus(deleted)
          await page.keyboard.press('Space')
          await expect(deleted).toBeChecked()
          await expect.poll(() => queries.some(q => q.includes('fromDate=2026-03-01') && q.includes('toDate=2026-03-31') && q.includes('stylistProfileId=stylist-1') && q.includes('includeDeleted=1'))).toBe(true)
          await tabTo(page, reset)
          await checkKeyboardFocus(reset)
          await page.keyboard.press('Enter')
          await expect(from).toHaveValue(initialFrom)
          await expect(to).toHaveValue(initialTo)
          await expect(stylist).toHaveValue('')
          await expect(deleted).not.toBeChecked()
          await expect(reset).toBeFocused()
          await expect.poll(() => queries[queries.length - 1]).toBe(queries[0])
        })
      }
    }
  }
}
