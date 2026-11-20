import { expect, test, type Page } from '@playwright/test'

import { clippedSnapshot, overflowingElements } from './dom-metrics.mjs'
import { settleAnimations } from './settle'

// These fixtures only exercise the client display, not actual payments or reservations.
const TEXT_SPACING = `
  *, *::before, *::after {
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p { margin-bottom: 2em !important; }
`
type Adjustment = '320px' | 'text-200' | 'text-spacing'

function report(title: string, detail: string) {
  const encoded = detail.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
  process.stdout.write(`::error title=${title}::${encoded}\n`)
}

test.afterEach(async ({}, info) => {
  if (info.status !== info.expectedStatus) {
    report(`M2 client detail ${info.title}`, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2000))
  }
})

async function checkReflow(page: Page, adjustment: Adjustment, title: string) {
  await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1, { timeout: 10_000 }).toBe(0)
  if (adjustment === '320px') {
    const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
    if (widths.scroll > widths.viewport + 1) report(title, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
    expect(widths.viewport).toBe(320)
    expect(widths.scroll - widths.viewport, JSON.stringify(widths)).toBeLessThanOrEqual(1)
    return
  }
  const before = await page.evaluate(clippedSnapshot)
  if (adjustment === 'text-200') {
    const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
    await page.evaluate(size => { document.documentElement.style.fontSize = `${size * 2}px` }, base)
    await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(base * 2, 2)
  } else {
    await page.addStyleTag({ content: TEXT_SPACING })
  }
  await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1, { timeout: 10_000 }).toBe(0)
  const after = await page.evaluate(clippedSnapshot)
  const newlyClipped = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
  if (newlyClipped.length) report(title, JSON.stringify(newlyClipped.slice(0, 8)))
  expect(newlyClipped).toEqual([])
}

for (const mode of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const state of ['payment', 'unavailable', 'retry', 'forbidden'] as const) {
      for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
        test(`M2 client reservation ${mode} ${language} ${state} ${adjustment}`, async ({ page }) => {
          await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript(({ selectedMode, locale }) => {
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', selectedMode)
            localStorage.setItem('APP_LOCALE', locale)
            localStorage.setItem('token', 'test-fixture-token')
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
          await page.route('**/api/users/profile', route => route.fulfill({ json: {
            id: 'test-user', username: 'test', firstName: 'Test', lastName: 'User', createdAt: '2025-01-01T00:00:00.000Z',
            email: 'test@example.com', phone: '+387 61 123 456', gender: 'FEMALE', genderOnboardingCompleted: true,
            isEmailVerified: true, mustChangePassword: false, roles: ['CLIENT'],
          } }))
          const itemName = 'Svečana frizura i detaljna njega duge kose'
          const secondItem = 'Pranje i završno oblikovanje'
          const payment = {
            publicReferenceCode: 'DK-20260302-ABC', serviceAmount: 75, loyaltyDiscountAmount: 10,
            tipAmount: 5, actualPrice: 70, completedAt: '2026-03-02T10:00:00Z',
            items: [{ name: itemName, unitPrice: 50 }, { name: secondItem, unitPrice: 25 }],
          }
          const reservation = {
            id: 'client-detail-test', reservationDate: '2026-03-02', startTime: '09:00', endTime: '10:00',
            status: 'COMPLETED', clientNotes: null, cancelReason: null, createdAt: '2026-03-01T10:00:00Z',
            publicReferenceCode: 'RZ-20260302-ABC', confirmedStylist: { id: 'stylist-1', user: { firstName: 'Ana', lastName: 'Test' } },
            items: [{ id: 'item-1', sortOrder: 0, serviceId: 'service-1', service: { id: 'service-1', name: itemName, durationMinutes: 60 } },
              { id: 'item-2', sortOrder: 1, serviceId: 'service-2', service: { id: 'service-2', name: secondItem, durationMinutes: 30 } }],
            paymentSummary: state === 'unavailable' ? null : payment,
          }
          let requests = 0
          const mutations: string[] = []
          await page.route('**/api/reservations**', route => {
            const request = route.request()
            if (request.method() !== 'GET') {
              mutations.push(request.method())
              return route.abort()
            }
            if (new URL(request.url()).pathname !== '/api/reservations/client-detail-test') return route.fallback()
            requests++
            if (state === 'forbidden') return route.fulfill({ status: 403, json: { message: 'PRIVATE SERVER DETAIL' } })
            if (state === 'retry' && requests === 1) return route.fulfill({ status: 503, json: { message: 'PRIVATE SERVER DETAIL' } })
            return route.fulfill({ json: reservation })
          })
          const path = '/moje-rezervacije/client-detail-test'
          await page.goto(path, { waitUntil: 'networkidle' })
          expect(new URL(page.url()).pathname).toBe(path)
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          const root = page.locator('[data-aurum-page="reservation-detail"]')
          await expect(root.getByRole('heading', { level: 1 })).toBeVisible()
          await expect(root).not.toContainText('PRIVATE SERVER DETAIL')
          if (state === 'retry') {
            await expect(root.getByRole('alert')).toBeVisible()
            await expect(root.getByRole('button', { name: /pokušaj ponovo|retry|try again/i })).toBeVisible()
          } else if (state === 'forbidden') {
            await expect(root.getByText(/rezervacija nije pronađena|reservation (was )?not found/i)).toBeVisible()
            await expect(root).not.toContainText('RZ-20260302-ABC')
          } else {
            await expect(root).toContainText('RZ-20260302-ABC')
            await expect(root).toContainText('Ana Test')
            if (state === 'payment') {
              await expect(root).toContainText(payment.publicReferenceCode)
              await expect(root.getByText(itemName, { exact: true })).toBeVisible()
              await expect(root.getByText(secondItem, { exact: true })).toBeVisible()
              const amount = (value: number) => `${new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} KM`
              await expect(root.getByText(itemName, { exact: true }).locator('..')).toContainText(amount(50))
              await expect(root.getByText(secondItem, { exact: true }).locator('..')).toContainText(amount(25))
              await expect(root.getByText(/loyalty popust|loyalty discount/i).locator('..')).toContainText(amount(10))
              await expect(root.getByText(/napojnica|^tip$/i).locator('..')).toContainText(amount(5))
              await expect(root.getByText(/ukupno naplaćeno|total charged/i).locator('..')).toContainText(amount(70))
            } else {
              await expect(root.getByText(/detalji uplate još nisu dostupni|payment details are not available yet/i)).toBeVisible()
              await expect(root).not.toContainText(payment.publicReferenceCode)
            }
          }
          await checkReflow(page, adjustment, `M2 client reservation ${mode} ${language} ${state} ${adjustment}`)
          if (state === 'retry') {
            const retry = root.getByRole('button', { name: /pokušaj ponovo|retry|try again/i })
            await retry.focus()
            await expect(retry).toBeFocused()
            await page.keyboard.press('Enter')
            await expect(root.getByRole('alert')).toBeHidden()
            await expect(root).toContainText(payment.publicReferenceCode)
            await expect(root.getByText(itemName, { exact: true })).toBeVisible()
            await expect.poll(() => requests).toBe(2)
          } else expect(requests).toBe(1)
          expect(mutations).toEqual([])
        })
      }
    }
  }
}
