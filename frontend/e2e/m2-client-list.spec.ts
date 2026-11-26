import { expect, test, type Page } from '@playwright/test'

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
  if (info.status !== info.expectedStatus) report(`M2 client list ${info.title}`, info.errors.map(error => error.message || String(error)).join(' | ').slice(0, 2000))
})

async function settle(page: Page) {
  await expect.poll(async () => (await settleAnimations(page))?.stillRunning ?? -1, { timeout: 10_000 }).toBe(0)
}

// All reservation requests are isolated. Cancellation success and reschedule failure are simulated; no real booking is changed.
for (const mode of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const state of ['list', 'cancel-dialog', 'cancel-success', 'decline-error', 'load-retry'] as const) {
      for (const adjustment of ['320px', 'text-200', 'text-spacing'] as const) {
        test(`M2 client list ${mode} ${language} ${state} ${adjustment}`, async ({ page }) => {
          await page.setViewportSize(adjustment === '320px' ? { width: 320, height: 720 } : { width: 1280, height: 900 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript(({ selectedMode, locale }) => {
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', selectedMode)
            localStorage.setItem('APP_LOCALE', locale)
            localStorage.setItem('token', 'fixture-client-token')
          }, { selectedMode: mode, locale: language })
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
            id: 'fixture-user', username: 'test', firstName: 'Test', lastName: 'User', createdAt: '2025-01-01T00:00:00Z',
            email: 'test@example.com', phone: '+387 61 123 456', gender: 'FEMALE', genderOnboardingCompleted: true,
            isEmailVerified: true, mustChangePassword: false, roles: ['CLIENT'],
          } }))
          const note = 'Molim detaljnu konsultaciju prije tretmana i nježno postupanje zbog osjetljivog vlasišta. Želim razgovarati o njezi duge kose nakon šišanja. Završna napomena fiksure.'
          const service = 'Svečana frizura i njega za dugu kosu'
          const upcoming = {
            id: 'client-upcoming', reservationDate: '2099-03-02', startTime: '09:00', endTime: '10:00',
            status: 'CONFIRMED', clientNotes: note, cancelReason: null, createdAt: '2026-03-01T10:00:00Z',
            publicReferenceCode: 'RZ-20990302-ABC', attendancePolicy: 'CLIENT_REQUIRED', attendanceConfirmedAt: null,
            attendanceClientDeadlineAt: '2099-03-01T08:00:00Z', rescheduleStatus: 'PENDING',
            rescheduleProposedStartTime: '11:30', rescheduleProposedEndTime: '12:30',
            service: { id: 'service-1', name: service, durationMinutes: 60 },
            confirmedStylist: { id: 'stylist-1', user: { firstName: 'Ana', lastName: 'Test' } },
          }
          const past = { ...upcoming, id: 'client-past', reservationDate: '2020-03-02', status: 'COMPLETED', clientNotes: null, rescheduleStatus: null, publicReferenceCode: 'RZ-20200302-OLD', service: { id: 'service-2', name: 'Pranje i završno oblikovanje', durationMinutes: 30 } }
          let reads = 0
          let cancelled = false
          const writes: string[] = []
          await page.route('**/api/reservations**', route => {
            const request = route.request()
            const path = new URL(request.url()).pathname
            if (request.method() === 'GET' && path === '/api/reservations') {
              reads++
              if (state === 'load-retry' && reads === 1) return route.fulfill({ status: 503, json: { message: 'PRIVATE FIXTURE ERROR' } })
              return route.fulfill({ json: { items: [cancelled ? { ...upcoming, status: 'CANCELLED_BY_CLIENT', rescheduleStatus: null } : upcoming, past], total: 2, page: 0, pageSize: 50 } })
            }
            if (request.method() !== 'GET') {
              writes.push(`${request.method()} ${path}`)
              if (state === 'cancel-success' && path === '/api/reservations/client-upcoming/cancel' && request.method() === 'POST') {
                cancelled = true
                return route.fulfill({ json: { success: true } })
              }
              if (state === 'decline-error' && path === '/api/reservations/client-upcoming/reschedule/decline' && request.method() === 'POST') {
                return route.fulfill({ status: 503, json: { message: 'PRIVATE FIXTURE ERROR' } })
              }
              return route.abort()
            }
            return route.fallback()
          })
          await page.goto('/moje-rezervacije', { waitUntil: 'networkidle' })
          expect(new URL(page.url()).pathname).toBe('/moje-rezervacije')
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('data-mode', mode)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          const root = page.locator('[data-aurum-page="my-reservations"]')
          await expect(root.getByRole('heading', { level: 1 })).toBeVisible()
          await expect(root).not.toContainText('PRIVATE FIXTURE ERROR')
          if (state === 'load-retry') {
            await expect(root.getByRole('alert')).toBeVisible()
          } else {
            await expect(root).toContainText(upcoming.publicReferenceCode)
            await expect(root).toContainText(past.publicReferenceCode)
            await expect(root).toContainText('11:30')
            await expect(root.getByRole('button', { name: /potvrdi dolazak|confirm attendance/i })).toBeVisible()
            const detail = root.getByRole('button', { name: /otvori detalje rezervacije —|open reservation details —/i }).filter({ hasText: upcoming.publicReferenceCode })
            await expect(detail).toHaveAccessibleDescription(/RZ-20990302-ABC.*Ana Test.*Završna napomena fiksure/)
            const notes = root.getByText(note, { exact: true })
            await expect(notes).toBeVisible()
            const dimensions = await notes.evaluate(el => ({ height: el.clientHeight, scroll: el.scrollHeight, overflow: getComputedStyle(el).overflowY }))
            expect(dimensions.scroll - dimensions.height, JSON.stringify(dimensions)).toBeLessThanOrEqual(1)
            if (state === 'cancel-dialog' || state === 'cancel-success') {
              const cancel = root.getByRole('button', { name: /otkaži rezervaciju —|cancel reservation —/i })
              if (state === 'cancel-dialog') {
                for (let i = 0; i < 100 && !(await cancel.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
              } else await cancel.focus()
              await expect(cancel).toBeFocused()
              await page.keyboard.press('Enter')
              const dialog = page.getByRole('dialog')
              await expect(dialog).toBeVisible()
              await dialog.locator('#cancel-reason').fill('Promjena plana fiksura')
              await expect(dialog.locator('#cancel-reason')).toHaveValue('Promjena plana fiksura')
            }
          }
          await settle(page)
          if (adjustment === '320px') {
            const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
            if (widths.scroll > widths.viewport + 1) report(`M2 client list ${mode} ${language} ${state}`, JSON.stringify({ ...widths, offenders: await page.evaluate(overflowingElements, 1) }))
            expect(widths.scroll - widths.viewport, JSON.stringify(widths)).toBeLessThanOrEqual(1)
            if (state === 'cancel-dialog' || state === 'cancel-success') {
              const box = await page.getByRole('dialog').boundingBox()
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
            } else await page.addStyleTag({ content: SPACING })
            await settle(page)
            const after = await page.evaluate(clippedSnapshot)
            const lost = Object.keys(after).filter(key => !(key in before)).map(key => ({ element: key, ...after[key] }))
            if (lost.length) report(`M2 client list ${mode} ${language} ${state} ${adjustment}`, JSON.stringify(lost.slice(0, 8)))
            expect(lost).toEqual([])
          }
          if (state === 'cancel-dialog') {
            const dialog = page.getByRole('dialog')
            const reason = dialog.locator('#cancel-reason')
            const dismiss = dialog.getByRole('button', { name: /^odustani$|^cancel$/i })
            const confirm = dialog.getByRole('button', { name: /^otkaži rezervaciju$|^cancel reservation$/i })
            const visited = new Set<string>()
            for (let i = 0; i < 8; i++) {
              await page.keyboard.press('Tab')
              const within = await dialog.evaluate(el => el.contains(document.activeElement))
              expect(within, 'Tab must stay inside the open modal').toBe(true)
              const focused = page.locator(':focus')
              expect(await focused.evaluate(el => el.matches(':focus-visible'))).toBe(true)
              const unobscured = await focused.evaluate(el => {
                const rect = el.getBoundingClientRect()
                const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
                return Boolean(hit && (hit === el || el.contains(hit)))
              })
              expect(unobscured, 'focused modal control center must be visible and unobscured').toBe(true)
              if (await reason.evaluate(el => el === document.activeElement)) visited.add('reason')
              if (await dismiss.evaluate(el => el === document.activeElement)) visited.add('dismiss')
              if (await confirm.evaluate(el => el === document.activeElement)) visited.add('confirm')
            }
            expect([...visited].sort()).toEqual(['confirm', 'dismiss', 'reason'])
            const reverse = new Set<string>()
            for (let i = 0; i < 8; i++) {
              await page.keyboard.press('Shift+Tab')
              expect(await dialog.evaluate(el => el.contains(document.activeElement)), 'Shift+Tab must stay inside the open modal').toBe(true)
              if (await reason.evaluate(el => el === document.activeElement)) reverse.add('reason')
              if (await dismiss.evaluate(el => el === document.activeElement)) reverse.add('dismiss')
              if (await confirm.evaluate(el => el === document.activeElement)) reverse.add('confirm')
            }
            expect([...reverse].sort()).toEqual(['confirm', 'dismiss', 'reason'])
            await page.keyboard.press('Escape')
            await expect(page.getByRole('dialog')).toBeHidden()
            await expect(root.getByRole('button', { name: /otkaži rezervaciju —|cancel reservation —/i })).toBeFocused()
            expect(writes).toEqual([])
          } else if (state === 'cancel-success') {
            const dialog = page.getByRole('dialog')
            await dialog.getByRole('button', { name: /otkaži rezervaciju|cancel reservation/i }).click()
            await expect(dialog).toBeHidden()
            await expect.poll(() => reads).toBe(2)
            await expect(root.getByRole('heading', { level: 1 })).toBeFocused()
            expect(writes).toEqual(['POST /api/reservations/client-upcoming/cancel'])
          } else if (state === 'decline-error') {
            const decline = root.getByRole('button', { name: /odbij|decline/i })
            await decline.click()
            await expect.poll(() => writes.length).toBe(1)
            await expect(decline).toBeEnabled()
            await expect(root).toContainText(upcoming.publicReferenceCode)
            await expect(page.locator('body')).not.toContainText('PRIVATE FIXTURE ERROR')
            await decline.click()
            await expect.poll(() => writes.length).toBe(2)
            expect(writes).toEqual(Array(2).fill('POST /api/reservations/client-upcoming/reschedule/decline'))
          } else if (state === 'load-retry') {
            const retry = root.getByRole('button', { name: /pokušaj ponovo|retry|try again/i })
            await retry.focus()
            await page.keyboard.press('Enter')
            await expect(root.getByRole('alert')).toBeHidden()
            await expect(root).toContainText(upcoming.publicReferenceCode)
            await expect.poll(() => reads).toBe(2)
            expect(writes).toEqual([])
          } else expect(writes).toEqual([])
          const visibleNote = root.getByText(note, { exact: true })
          await expect(visibleNote).toBeVisible()
          const noteSize = await visibleNote.evaluate(el => ({ height: el.clientHeight, scroll: el.scrollHeight }))
          expect(noteSize.scroll - noteSize.height, JSON.stringify(noteSize)).toBeLessThanOrEqual(1)
        })
      }
    }
  }
}
