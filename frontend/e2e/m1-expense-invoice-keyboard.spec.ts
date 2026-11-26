import { expect, test, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { AXE_RULE_TAGS, assertableViolations } from './axe-coverage.mjs'

async function tabTo(page: Page, target: Locator, limit = 180) {
  await expect(target).toBeVisible()
  for (let i = 0; i < limit && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

function contrast(foreground: string, background: string) {
  const luminance = (color: string) => {
    const channels = (color.match(/[\d.]+/g) ?? []).map(Number)
    expect(channels.length === 3 || (channels.length === 4 && channels[3] === 1), `opaque RGB required: ${color}`).toBe(true)
    const linear = channels.slice(0, 3).map(value => {
      const channel = value / 255
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  }
  const a = luminance(foreground), b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

async function checkFocusCenter(target: Locator) {
  await target.page().evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  const state = await target.evaluate(el => {
    const rect = el.getBoundingClientRect()
    const hit = document.elementFromPoint((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2)
    const css = getComputedStyle(el)
    let ancestor = el.parentElement
    while (ancestor && getComputedStyle(ancestor).backgroundColor === 'rgba(0, 0, 0, 0)') ancestor = ancestor.parentElement
    return { visible: el.matches(':focus-visible'), centerHit: !!hit && (hit === el || el.contains(hit)), outline: css.outlineColor, outlineWidth: css.outlineWidth, outlineStyle: css.outlineStyle, shadow: css.boxShadow, background: ancestor ? getComputedStyle(ancestor).backgroundColor : '' }
  })
  const diagnostic = JSON.stringify(state)
  expect(state.visible, diagnostic).toBe(true)
  expect(state.centerHit, diagnostic).toBe(true)
  if (state.outlineStyle === 'solid' && parseFloat(state.outlineWidth) >= 2 && state.outline !== 'rgba(0, 0, 0, 0)') {
    expect(contrast(state.outline, state.background), diagnostic).toBeGreaterThanOrEqual(3)
  } else {
    const colors = state.shadow.match(/rgba?\([\d.,\s]+\)/g) ?? []
    const spreads = [...state.shadow.matchAll(/rgba?\([\d.,\s]+\) 0px 0px 0px ([\d.]+)px/g)].map(match => Number(match[1]))
    expect(colors.length, diagnostic).toBeGreaterThanOrEqual(2)
    expect(spreads.length, diagnostic).toBeGreaterThanOrEqual(2)
    expect((spreads[1] ?? 0) - (spreads[0] ?? 0), diagnostic).toBeGreaterThanOrEqual(2)
    expect(contrast(colors[1] ?? '', colors[0] ?? ''), diagnostic).toBeGreaterThanOrEqual(3)
  }
}

// All writes blocked; invoice rows and attachments are synthetic, links are not opened.
for (const theme of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const viewport of ['desktop', 'mobile'] as const) {
      for (const scenario of ['preview', 'more', 'names', 'duplicate-names'] as const) {
        test(`M1 expense invoice ${theme} ${language} ${viewport} ${scenario}`, async ({ page }) => {
          await page.setViewportSize(viewport === 'desktop' ? { width: 1280, height: 900 } : { width: 390, height: 844 })
          await page.emulateMedia({ reducedMotion: 'reduce' })
          await page.addInitScript(({ mode, locale }) => {
            localStorage.setItem('token', 'fixture-admin-token')
            localStorage.removeItem('nejra.theme')
            localStorage.setItem('nejra.theme.mode', mode)
            localStorage.setItem('APP_LOCALE', locale)
          }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
          const category = { id: 'cat', name: 'Fixture category', isActive: true, isFixed: true, templateId: 't', template: { id: 't', name: 'Fixture', fields: [], requiresAttachmentPerItem: false } }
          const fields = ['Rent', 'Utilities', 'Insurance', 'Supplies'].map((name, i) => ({ id: `f${i}`, value: String((i + 1) * 10), field: { id: `field${i}`, fieldName: name } }))
          const expense = (id: string, title: string) => ({ id, title, expenseDate: '2026-03-01T00:00:00Z', dateEstimated: true, totalAmount: 100, notes: 'Synthetic note', createdAt: '2026-03-02T00:00:00Z', category, fieldValues: fields, attachments: [{ id: `file-${id}`, upload: { originalName: 'fixture.txt', pathOriginal: 'fixture.txt' } }] })
          const book = { id: 'expense-book-1', year: 2026, month: 3, isClosed: false, openedAt: '2026-03-01T00:00:00Z', closedAt: null, expenses: [expense('a', 'Alpha'), expense('b', scenario === 'duplicate-names' ? 'Alpha' : 'Beta')], totalExpenses: 200, lockEvents: [] }
          const writes: string[] = []
          await page.route('**/api/**', route => {
            const req = route.request(), path = new URL(req.url()).pathname
            if (req.method() !== 'GET') { writes.push(`${req.method()} ${path}`); return route.abort() }
            if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
            if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
            if (path === '/api/expense-books') return route.fulfill({ json: [book] })
            if (path === '/api/expense-books/expense-book-1') return route.fulfill({ json: book })
            if (path === '/api/expense-categories') return route.fulfill({ json: [category] })
            return route.fulfill({ json: {} })
          })
          await page.goto('/admin/finance?tab=expense', { waitUntil: 'networkidle' })
          await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          const open = page.getByRole('button', { name: /otvori knjigu.*2026|open book.*2026/i })
          await tabTo(page, open)
          await page.keyboard.press('Enter')
          const table = page.getByRole('table', { name: /stavke knjige rashoda|expense book entries/i })
          await expect(table.locator('tbody tr')).toHaveCount(2)
          const firstRow = table.locator('tbody tr').nth(0)
          const secondRow = table.locator('tbody tr').nth(1)
          const more = (row: Locator) => row.getByRole('button', { name: /^\+.*(?:pogledaj fakturu|view invoice)/i })
          if (scenario.endsWith('names')) {
            const a = more(firstRow), b = more(secondRow)
            await expect(a).toHaveAccessibleName(/Alpha/)
            await expect(b).toHaveAccessibleName(scenario === 'duplicate-names' ? /Alpha/ : /Beta/)
            await expect(a).toHaveAccessibleName(/(?:row|red) 1/i)
            await expect(b).toHaveAccessibleName(/(?:row|red) 2/i)
            expect(await a.getAttribute('aria-label')).not.toBe(await b.getAttribute('aria-label'))
            const actionPatterns = [/pregledaj fakturu|preview invoice/i, /uredi rashod|edit expense/i, /obriši rashod|delete expense/i]
            for (const pattern of actionPatterns) {
              const left = firstRow.getByRole('button', { name: pattern })
              const right = secondRow.getByRole('button', { name: pattern })
              expect(await left.getAttribute('aria-label'), String(pattern)).not.toBe(await right.getAttribute('aria-label'))
              await expect(left).toHaveAccessibleName(/(?:row|red) 1/i)
              await expect(right).toHaveAccessibleName(/(?:row|red) 2/i)
            }
            await tabTo(page, a)
            await tabTo(page, b)
            const sort = table.getByRole('button', { name: /sortiraj po koloni naziv|sort by name/i })
            await tabTo(page, sort)
            await page.keyboard.press('Enter')
            await page.keyboard.press('Space')
            await expect(sort.locator('..')).toHaveAttribute('aria-sort', 'descending')
            await expect(a).toHaveAccessibleName(/(?:row|red) 1/i)
            await expect(b).toHaveAccessibleName(/(?:row|red) 2/i)
            await expect(a).toHaveAccessibleName(scenario === 'duplicate-names' ? /Alpha/ : /Beta/)
            await expect(b).toHaveAccessibleName(/Alpha/)
            for (const pattern of actionPatterns) {
              await expect(firstRow.getByRole('button', { name: pattern })).toHaveAccessibleName(/(?:row|red) 1/i)
              await expect(secondRow.getByRole('button', { name: pattern })).toHaveAccessibleName(/(?:row|red) 2/i)
            }
            expect(writes).toEqual([])
            return
          }
          const trigger = scenario === 'more' ? more(firstRow) : firstRow.getByRole('button', { name: /pregledaj fakturu Alpha|preview invoice for Alpha/i })
          await tabTo(page, trigger)
          await checkFocusCenter(trigger)
          for (const close of ['escape', 'button'] as const) {
            await page.keyboard.press('Enter')
            const dialog = page.getByRole('dialog')
            await expect(dialog).toBeVisible()
            await expect(dialog).toHaveAccessibleName(/Alpha/)
            await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
            const items = dialog.getByRole('table', { name: /stavke fakture|invoice line items/i })
            await expect(items.locator('tbody tr')).toHaveCount(4)
            await expect(items).toContainText('Supplies')
            await expect(items.locator('tfoot')).toContainText(/100[.,]00/)
            await expect(dialog).toContainText('Synthetic note')
            const attachment = dialog.getByRole('link', { name: /otvori prilog fixture\.txt|open attachment fixture\.txt/i })
            await tabTo(page, attachment, 30)
            await checkFocusCenter(attachment)
            for (const key of ['Tab', 'Tab', 'Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
              await page.keyboard.press(key)
              await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
            }
            if (language === 'en' && viewport === 'desktop' && close === 'escape') {
              const axe = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(AXE_RULE_TAGS).analyze()
              expect(assertableViolations(axe.violations)).toEqual([])
            }
            if (close === 'escape') await page.keyboard.press('Escape')
            else {
              const closeButton = dialog.getByRole('button', { name: /^zatvori$|^close$/i }).last()
              await tabTo(page, closeButton, 30)
              await page.keyboard.press('Enter')
            }
            await expect(dialog).toHaveCount(0)
            await expect(trigger).toBeFocused()
            await checkFocusCenter(trigger)
          }
          expect(writes).toEqual([])
        })
      }
    }
  }
}
