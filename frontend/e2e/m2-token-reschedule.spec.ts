import { expect, test } from '@playwright/test'

import { clippedSnapshot, overflowingElements } from './dom-metrics.mjs'
import { settleAnimations } from './settle'

const SPACING = `
  *, *::before, *::after { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
  p { margin-bottom: 2em !important; }
`
function report(title: string, detail: string) {
  const encoded = detail.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
  process.stdout.write(`::error title=${title}::${encoded}\n`)
}

test.afterEach(async ({}, info) => {
  if (info.status !== info.expectedStatus) report(`M2 token reschedule ${info.title}`, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2000))
})

// A read-only token view: the fixtures never accept or decline an appointment.
for (const mode of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const state of ['guest', 'signed-in', 'incomplete', 'invalid-retry'] as const) {
      for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
        test(`M2 token proposal ${mode} ${language} ${state} ${adjustment}`, async ({ page }) => {
          await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript(({ selectedMode, locale, signedIn }) => {
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', selectedMode)
            localStorage.setItem('APP_LOCALE', locale)
            if (signedIn) localStorage.setItem('token', 'fixture-client-token')
            else localStorage.removeItem('token')
          }, { selectedMode: mode, locale: language, signedIn: state === 'signed-in' })
          await page.route('**/api/settings/public', async route => {
            const response = await route.fetch()
            if (!response.ok()) throw new Error(`Public settings failed: ${response.status()}`)
            const rows = await response.json() as Array<{ key: string; value: string }>
            await route.fulfill({ response, json: [
              ...rows.filter(row => !['theme_active_skin', 'theme_default_mode'].includes(row.key)),
              { key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: mode },
            ] })
          })
          await page.route('**/api/users/profile', route => route.fulfill({ json: {
            id: 'fixture-user', username: 'test', firstName: 'Test', lastName: 'User', createdAt: '2025-01-01T00:00:00Z',
            email: 'test@example.com', phone: '+387 61 123 456', gender: 'FEMALE', genderOnboardingCompleted: true,
            isEmailVerified: true, mustChangePassword: false, roles: ['CLIENT'],
          } }))
          const payload = {
            publicReferenceCode: 'RZ-20260302-ABC', reservationDate: '2026-03-02', startTime: '09:00', endTime: '10:00',
            status: 'CONFIRMED', serviceName: 'Svečana frizura i njega za dugu kosu', stylistName: 'Ana Test',
            clientNotes: 'Molim pažljivu njegu kose i konsultaciju prije termina.', cancelReason: null, cancelledAt: null,
            rescheduleStatus: 'PENDING', rescheduleProposedStartTime: '11:30',
            rescheduleProposedEndTime: state === 'incomplete' ? null : '12:30',
          }
          const mutations: string[] = []
          let requests = 0
          await page.route('**/api/**', route => {
            if (route.request().method() === 'GET') return route.fallback()
            mutations.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`)
            return route.abort()
          })
          await page.route('**/api/public/reservations/by-token/m2-proposal-token', route => {
            if (route.request().method() !== 'GET') {
              mutations.push(route.request().method())
              return route.abort()
            }
            requests++
            return route.fulfill({ json: state === 'invalid-retry' && requests === 1 ? { publicReferenceCode: payload.publicReferenceCode } : payload })
          })
          const path = '/moj-termin/m2-proposal-token'
          await page.goto(path, { waitUntil: 'networkidle' })
          expect(new URL(page.url()).pathname).toBe(path)
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          const root = page.locator('[data-aurum-page="reservation-view"]')
          const proposalTitle = root.getByText(/predloženi novi termin|proposed new appointment time/i)
          if (state === 'invalid-retry') {
            await expect(root.getByRole('alert')).toBeVisible()
            await expect(root.getByRole('button', { name: /pokušaj ponovo|retry|try again/i })).toBeVisible()
            await expect(root).not.toContainText(payload.publicReferenceCode)
          } else {
            await expect(root).toContainText(payload.publicReferenceCode)
            await expect(root).toContainText(payload.serviceName)
            await expect(root).toContainText(payload.clientNotes)
            if (state === 'incomplete') {
              await expect(proposalTitle).toHaveCount(0)
            } else {
              await expect(proposalTitle).toBeVisible()
              await expect(root).toContainText('11:30 – 12:30')
              const proposal = proposalTitle.locator('..')
              if (state === 'signed-in') {
                await expect(proposal).toContainText(/otvorite moje rezervacije|open my reservations/i)
                await expect(proposal.getByRole('link')).toHaveAttribute('href', '/moje-rezervacije')
              } else {
                await expect(proposal).toContainText(/prijavite se ili otvorite mobilnu|sign in or open the mobile/i)
                await expect(proposal.getByRole('link')).toHaveAttribute('href', '/login')
              }
            }
          }
          await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1, { timeout: 10_000 }).toBe(0)
          if (adjustment === '320px') {
            const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
            if (widths.scroll > widths.viewport + 1) report(`M2 token proposal ${mode} ${language} ${state}`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
            expect(widths.scroll - widths.viewport, JSON.stringify(widths)).toBeLessThanOrEqual(1)
            // The combination caught labels wrapping into individual letters even though
            // the document width and differential clipping metrics both passed.
            await page.addStyleTag({ content: SPACING })
            await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1, { timeout: 10_000 }).toBe(0)
            if (state !== 'invalid-retry') {
              const labels = root.locator('[data-token-detail-row] > span:first-child')
              await expect(labels).toHaveCount(5)
              const measured = await labels.evaluateAll(elements => elements.map(el => ({
                text: el.textContent, height: el.getBoundingClientRect().height,
                line: parseFloat(getComputedStyle(el).lineHeight),
              })))
              for (const label of measured) expect(label.height, JSON.stringify(label)).toBeLessThanOrEqual(label.line + 1)
            }
            const spacedWidths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
            expect(spacedWidths.scroll - spacedWidths.viewport, JSON.stringify(spacedWidths)).toBeLessThanOrEqual(1)
          } else {
            const before = await page.evaluate(clippedSnapshot)
            if (adjustment === 'text-200') {
              const base = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
              await page.evaluate(size => { document.documentElement.style.fontSize = `${size * 2}px` }, base)
              await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBeCloseTo(base * 2, 2)
            } else await page.addStyleTag({ content: SPACING })
            await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1, { timeout: 10_000 }).toBe(0)
            const after = await page.evaluate(clippedSnapshot)
            const lost = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
            if (lost.length) report(`M2 token proposal ${mode} ${language} ${state} ${adjustment}`, JSON.stringify(lost.slice(0, 8)))
            expect(lost).toEqual([])
          }
          if (state === 'invalid-retry') {
            const retry = root.getByRole('button', { name: /pokušaj ponovo|retry|try again/i })
            await retry.focus()
            await expect(retry).toBeFocused()
            await page.keyboard.press('Enter')
            await expect(root.getByRole('alert')).toBeHidden()
            await expect(root).toContainText(payload.publicReferenceCode)
            await expect(proposalTitle).toBeVisible()
            await expect.poll(() => requests).toBe(2)
          } else expect(requests).toBe(1)
          if (state === 'guest' && adjustment === '320px') {
            // Real Tab traversal in Chromium, with emulated forced colors; this is not
            // a substitute for a human keyboard or operating-system contrast review.
            await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' })
            const proposalLink = proposalTitle.locator('..').getByRole('link')
            for (let i = 0; i < 30 && !(await proposalLink.evaluate(el => el === document.activeElement)); i++) {
              await page.keyboard.press('Tab')
            }
            await expect(proposalLink).toBeFocused()
            const focus = await proposalLink.evaluate(el => ({
              visible: el.matches(':focus-visible'),
              outlineStyle: getComputedStyle(el).outlineStyle,
              outlineWidth: parseFloat(getComputedStyle(el).outlineWidth),
            }))
            expect(focus.visible).toBe(true)
            expect(focus.outlineStyle).not.toBe('none')
            expect(focus.outlineWidth).toBeGreaterThanOrEqual(2)
            await page.keyboard.press('Enter')
            await expect(page).toHaveURL(/\/login$/)
          }
          expect(mutations).toEqual([])
        })
      }
    }
  }
}
