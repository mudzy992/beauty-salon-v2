import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { AXE_RULE_TAGS, assertableViolations } from './axe-coverage.mjs'
import { clippedSnapshot, overflowingElements } from './dom-metrics.mjs'
import { settleAnimations } from './settle'

const SPACING = `*, *::before, *::after { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }`
const first = 'Svečana frizura i profesionalna njega posebno duge i osjetljive kose'
const second = 'Konsultacija i kompletna regeneracija oštećenih vrhova duge kose'

function report(title: string, detail: string) {
  const encoded = detail.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
  process.stdout.write(`::error title=${title}::${encoded}\n`)
}
test.afterEach(async ({}, info) => {
  if (info.status !== info.expectedStatus) report(`M2 multi-service ${info.title}`, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2000))
})

async function scanBooking(page: Page, state: string) {
  const results = await new AxeBuilder({ page }).include('[data-aurum-page="reserve"]').withTags(AXE_RULE_TAGS).analyze()
  const findings = {
    violations: results.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map(node => node.target) })),
    incomplete: results.incomplete.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) })),
  }
  await test.info().attach(`axe-${state.replace(/ /g, '-')}`, { body: JSON.stringify(findings, null, 2), contentType: 'application/json' })
  const blocking = assertableViolations(results.violations).filter(violation => violation.impact === 'critical' || violation.impact === 'serious')
  expect(blocking, `${state}: ${JSON.stringify(blocking.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) })))}`).toEqual([])
}

async function expectFocusUnobscured(target: Locator) {
  const sample = () => target.evaluate(el => {
    const rect = el.getBoundingClientRect()
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2
    const hit = document.elementFromPoint(x, y)
    const header = document.querySelector('[data-aurum-shell="header"]')?.getBoundingClientRect()
    return {
      unobscured: Boolean(hit && (hit === el || el.contains(hit))),
      focused: document.activeElement === el,
      center: { x, y },
      viewport: { width: innerWidth, height: innerHeight },
      scrollY,
      headerBottom: header?.bottom ?? null,
      scrollPaddingTop: getComputedStyle(document.documentElement).scrollPaddingTop,
      hitTag: hit?.tagName ?? null,
    }
  })
  try {
    await expect.poll(async () => (await sample()).unobscured, { message: 'Focused control must not be covered or outside the viewport' }).toBe(true)
  } catch (error) {
    const detail = await sample()
    throw new Error(`Focused control coverage: ${JSON.stringify(detail)}\n${String(error)}`)
  }
}

// All writes are aborted; availability and client data are isolated test fixtures.
for (const mode of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const state of ['selected', 'remove-one', 'remove-last', 'clear', 'escape-add', 'change-after-slot'] as const) {
      for (const adjustment of ['320-spacing', 'text-200', 'text-spacing'] as const) {
        test(`M2 multi-service ${mode} ${language} ${state} ${adjustment}`, async ({ page }) => {
          await page.setViewportSize(adjustment === '320-spacing' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript(({ selectedMode, locale }) => {
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', selectedMode)
            localStorage.setItem('APP_LOCALE', locale)
            localStorage.setItem('token', 'fixture-client-token')
          }, { selectedMode: mode, locale: language })
          const writes: string[] = []
          await page.route('**/api/**', route => {
            if (route.request().method() === 'GET') return route.fallback()
            writes.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`)
            return route.abort()
          })
          await page.route('**/api/settings/public', async route => {
            const response = await route.fetch()
            if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
            const rows = await response.json() as Array<{ key: string; value: string }>
            await route.fulfill({ response, json: [
              ...rows.filter(row => row.key !== 'theme_default_mode'),
              { key: 'theme_default_mode', value: mode },
            ] })
          })
          await page.route('**/api/users/profile', route => route.fulfill({ json: {
            id: 'fixture-user', username: 'test', email: 'test@example.test', phone: '+387 61 123 456',
            gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['CLIENT'],
          } }))
          await page.route('**/api/services**', route => route.fulfill({ json: [
            { id: 'service-one', name: first, durationMinutes: 60, gender: 'FEMALE', subcategory: { name: 'Kosa', category: { name: 'Žene' } } },
            { id: 'service-two', name: second, durationMinutes: 45, gender: 'FEMALE', subcategory: { name: 'Kosa', category: { name: 'Žene' } } },
          ] }))
          const dateQueries: string[] = []
          const slotQueries: string[] = []
          await page.route('**/api/reservations/availability/dates**', route => {
            const query = new URL(route.request().url()).searchParams
            dateQueries.push(query.get('serviceIds') ?? '')
            return route.fulfill({ json: [{ date: query.get('fromDate'), available: true }] })
          })
          await page.route('**/api/reservations/availability/slots**', route => {
            const query = new URL(route.request().url()).searchParams
            slotQueries.push(query.get('serviceIds') ?? '')
            return route.fulfill({ json: [{ startTime: '23:59', endTime: '23:59', availableStylistCount: 1 }] })
          })
          await page.route('**/api/client-debts/me', route => route.fulfill({ json: [] }))
          await page.route('**/api/loyalty/client/me**', route => route.fulfill({ json: { enabled: false, hasAccount: false } }))
          await page.goto('/rezervacija', { waitUntil: 'networkidle' })
          expect(new URL(page.url()).pathname).toBe('/rezervacija')
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          if (adjustment === 'text-200') {
            const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
            await page.evaluate(size => { document.documentElement.style.fontSize = `${size * 2}px` }, base)
            await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(base * 2, 2)
          } else await page.addStyleTag({ content: SPACING })
          const root = page.locator('[data-aurum-page="reserve"]')
          const search = page.locator('#public-service-search')
          await search.focus()
          await search.fill('Svečana')
          const firstOption = root.getByRole('button', { name: /^Svečana frizura/ })
          await expect(firstOption).toBeVisible()
          await page.keyboard.press('Tab')
          await expect(firstOption).toBeFocused()
          await page.keyboard.press('Enter')
          const add = root.getByRole('button', { name: /^dodaj još$|^add more$/i })
          await expect(add).toBeFocused()
          await expectFocusUnobscured(add)
          await page.keyboard.press('Enter')
          await expect(search).toBeFocused()
          await expectFocusUnobscured(search)
          await search.fill('Konsultacija')
          const secondOption = root.getByRole('button', { name: /^Konsultacija i kompletna/ })
          await expect(secondOption).toBeVisible()
          await page.keyboard.press('Tab')
          await expect(secondOption).toBeFocused()
          await page.keyboard.press('Enter')
          await expect(add).toBeFocused()
          const items = root.locator('[data-reserve-selected-item]')
          await expect(items).toHaveCount(2)
          await expect(root.locator('[data-reserve-total]')).toContainText('105')
          await expect.poll(() => dateQueries.includes('service-one,service-two')).toBe(true)
          for (const [index, name] of [first, second].entries()) {
            const item = items.nth(index)
            await expect(item).toContainText(name)
            await expect(item.getByRole('button')).toHaveAccessibleName(new RegExp(name))
            const size = await item.getByText(name, { exact: true }).evaluate(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth, height: el.clientHeight, scrollHeight: el.scrollHeight }))
            expect(size.scrollWidth - size.width, JSON.stringify(size)).toBeLessThanOrEqual(1)
            expect(size.scrollHeight - size.height, JSON.stringify(size)).toBeLessThanOrEqual(1)
          }
          if (state === 'selected' && adjustment === '320-spacing') {
            await scanBooking(page, 'two selected services')
            const firstRemove = items.nth(0).getByRole('button')
            const secondRemove = items.nth(1).getByRole('button')
            await expect(page.locator('[data-aurum-shell="header"]')).toHaveCSS('position', 'sticky')
            await page.keyboard.press('Shift+Tab')
            await expect(secondRemove).toBeFocused()
            await firstRemove.evaluate(el => {
              const header = document.querySelector('[data-aurum-shell="header"]')!
              const rect = el.getBoundingClientRect()
              const bottom = header.getBoundingClientRect().bottom
              window.scrollBy(0, rect.top + rect.height / 2 - bottom + 5)
            })
            await expectFocusUnobscured(secondRemove)
            expect(await firstRemove.evaluate(el => {
              const rect = el.getBoundingClientRect()
              return Boolean(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest('[data-aurum-shell="header"]'))
            })).toBe(true)
            await page.keyboard.press('Shift+Tab')
            await expect(firstRemove).toBeFocused()
            await expectFocusUnobscured(firstRemove)
            await page.keyboard.press('Tab')
            await page.keyboard.press('Tab')
            await expect(add).toBeFocused()
          }
          if (state === 'change-after-slot') {
            const day = root.locator('[data-reserve-calendar] button[aria-pressed="false"]:not([disabled])')
            await expect(day).toHaveCount(1)
            await day.focus()
            await page.keyboard.press('Enter')
            const slot = root.locator('[data-reserve-slot]').filter({ hasText: '23:59' })
            await expect(slot).toBeEnabled()
            await slot.focus()
            await page.keyboard.press('Enter')
            await expect(root.locator('#reservation-notes')).toBeVisible()
            expect(slotQueries).toContain('service-one,service-two')
            if (adjustment === '320-spacing') await scanBooking(page, 'booking summary')
          }
          if (state === 'remove-one' || state === 'remove-last' || state === 'change-after-slot') {
            const remove = items.nth(0).getByRole('button')
            await remove.focus()
            await page.keyboard.press('Enter')
            await expect(items).toHaveCount(1)
            await expect(items.first()).toContainText(second)
            await expect(add).toBeFocused()
            await expect(root.locator('[data-reserve-total]')).toContainText('45')
            await expect.poll(() => dateQueries[dateQueries.length - 1]).toBe('service-two')
            if (state === 'change-after-slot') {
              await expect(root.locator('#reservation-notes')).toHaveCount(0)
              await expect(root.locator('[data-reserve-slot]')).toHaveCount(0)
            } else if (state === 'remove-last') {
              await items.first().getByRole('button').focus()
              await page.keyboard.press('Enter')
              await expect(items).toHaveCount(0)
              await expect(search).toBeFocused()
              await expect(root.locator('[data-reserve-calendar]')).toHaveCount(0)
            }
          } else if (state === 'escape-add') {
            await page.keyboard.press('Enter')
            await expect(search).toBeFocused()
            await search.fill('Svečana')
            await expect(firstOption).toBeVisible()
            await page.keyboard.press('Escape')
            await expect(firstOption).toHaveCount(0)
            await expect(search).toBeFocused()
            await search.fill('Konsultacija')
            await expect(secondOption).toBeVisible()
            await page.keyboard.press('Tab')
            await expect(secondOption).toBeFocused()
            await page.keyboard.press('Enter')
            await expect(items).toHaveCount(2)
            await expect(add).toBeFocused()
          } else if (state === 'clear') {
            const clear = root.getByRole('button', { name: /^očisti$|^clear$/i })
            await clear.focus()
            await page.keyboard.press('Enter')
            await expect(items).toHaveCount(0)
            await expect(search).toBeFocused()
            await expect(root.locator('[data-reserve-calendar]')).toHaveCount(0)
          }
          if (state === 'selected' && adjustment === '320-spacing') {
            await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
            await expect(add).toBeFocused()
            const focus = await add.evaluate(el => ({ visible: el.matches(':focus-visible'), style: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth) }))
            expect(focus.visible).toBe(true)
            expect(focus.style).not.toBe('none')
            expect(focus.width).toBeGreaterThanOrEqual(1)
          }
          await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1, { timeout: 10_000 }).toBe(0)
          if (adjustment === '320-spacing') {
            const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
            if (widths.scroll > widths.viewport + 1) report('M2 multi-service overflow', JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
            expect(widths.scroll - widths.viewport, JSON.stringify(widths)).toBeLessThanOrEqual(1)
          } else {
            // This snapshot is diagnostic rather than proof of all clipping.
            const clipped = await page.evaluate(clippedSnapshot)
            const selectedClipped = Object.keys(clipped).filter(key => key.includes('data-reserve-selected'))
            expect(selectedClipped).toEqual([])
          }
          expect(writes).toEqual([])
        })
      }
    }
  }
}
