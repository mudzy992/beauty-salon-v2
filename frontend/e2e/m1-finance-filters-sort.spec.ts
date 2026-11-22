import { expect, test, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { AXE_RULE_TAGS, assertableViolations } from './axe-coverage.mjs'

async function tabTo(page: Page, target: Locator, limit = 180) {
  await expect(target).toBeVisible()
  for (let i = 0; i < limit && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

// Calculated solid colors only; this is not a full rasterized outline or adjacent-surface audit.
function contrast(a: string, b: string) {
  const luminance = (color: string) => {
    const channels = (color.match(/[\d.]+/g) ?? []).map(Number)
    expect(channels.length === 3 || (channels.length === 4 && channels[3] === 1)).toBe(true)
    const linear = channels.slice(0, 3).map(value => {
      const channel = value / 255
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  }
  const x = luminance(a), y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

// Fixture-only GETs. All mutations and external writes are blocked.
for (const theme of ['classic', 'light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const viewport of ['desktop', 'mobile'] as const) {
      for (const kind of ['income', 'expense'] as const) {
        for (const scenario of ['clear', 'sort', 'filters', 'names', 'duplicate-names'] as const) {
          if (scenario.endsWith('names') && kind === 'expense') continue
          test(`M1 finance filters and sorting ${theme} ${language} ${viewport} ${kind} ${scenario}`, async ({ page }) => {
            await page.setViewportSize(viewport === 'desktop' ? { width: 1280, height: 900 } : { width: 390, height: 844 })
            await page.emulateMedia({ reducedMotion: 'reduce' })
            await page.addInitScript(({ mode, locale }) => {
              localStorage.setItem('token', 'fixture-admin-token')
              localStorage.removeItem('nejra.theme')
              localStorage.setItem('nejra.theme.mode', mode)
              localStorage.setItem('APP_LOCALE', locale)
            }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
            const ana = { id: 's1', user: { username: 'ana', firstName: 'Ana', lastName: 'Test' } }
            const bela = { id: 's2', user: { username: 'bela', firstName: 'Bela', lastName: 'Test' } }
            const service = (name: string) => ({ id: name, name, price: 50 })
            const manual = (id: string, name: string, amount: number, stylist: typeof ana) => ({ id, date: '2026-03-02T00:00:00Z', serviceId: name, stylistProfileId: stylist.id, clientId: null, amount, tipAmount: 5, notes: 'Fixture', service: service(name), stylistProfile: stylist, createdAt: '2026-03-02T00:00:00Z', updatedAt: '2026-03-02T00:00:00Z' })
            const automatic = { id: 'auto-1', date: '2026-03-03T00:00:00Z', amount: 70, tipAmount: 0, dailyLogEntry: { id: 'log-1', service: service('Gamma'), stylistProfile: bela, notes: 'Fixture' } }
            const incomeBook = { id: 'income-book-1', year: 2026, month: 3, totalRevenue: 150, totalTips: 10, openedAt: '2026-03-01T00:00:00Z', closedAt: null, entries: [automatic], manualEntries: [manual('manual-1', 'Alpha', 30, ana), manual('manual-2', scenario === 'duplicate-names' ? 'Alpha' : 'Beta', scenario === 'duplicate-names' ? 30 : 50, scenario === 'duplicate-names' ? ana : bela)], lockEvents: [], manualAudits: [] }
            const category = (id: string, name: string) => ({ id, name, isActive: true, isFixed: true, templateId: 'template-1', template: { id: 'template-1', name: 'Test', fields: [], requiresAttachmentPerItem: false } })
            const cat1 = category('cat-1', 'Kategorija A'), cat2 = category('cat-2', 'Kategorija B')
            const expense = (id: string, title: string, amount: number, cat: typeof cat1, attachments: object[]) => ({ id, title, expenseDate: '2026-03-01T00:00:00Z', dateEstimated: true, totalAmount: amount, notes: 'Fixture', createdAt: '2026-03-02T00:00:00Z', category: cat, fieldValues: [], attachments })
            const expenseBook = { id: 'expense-book-1', year: 2026, month: 3, isClosed: false, openedAt: '2026-03-01T00:00:00Z', closedAt: null, expenses: [expense('e1', 'Alpha', 30, cat1, []), expense('e2', 'Beta', 50, cat2, [{ id: 'file-1', description: 'Fixture file' }]), expense('e3', 'Gamma', 70, cat2, [])], totalExpenses: 150, lockEvents: [] }
            const writes: string[] = []
            await page.route('**/api/**', route => {
              const req = route.request(), path = new URL(req.url()).pathname
              if (req.method() !== 'GET') { writes.push(`${req.method()} ${path}`); return route.abort() }
              if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
              if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
              if (path === '/api/income-books') return route.fulfill({ json: [incomeBook] })
              if (path === '/api/income-books/income-book-1') return route.fulfill({ json: incomeBook })
              if (path === '/api/income-books/income-book-1/integrity') return route.fulfill({ json: { bookId: incomeBook.id, isLocked: false, missingCount: 0, orphanedCount: 0, isHealthy: true, missing: [], orphaned: [] } })
              if (path === '/api/expense-books') return route.fulfill({ json: [expenseBook] })
              if (path === '/api/expense-books/expense-book-1') return route.fulfill({ json: expenseBook })
              if (path === '/api/expense-categories') return route.fulfill({ json: [cat1, cat2] })
              if (path === '/api/stylists/admin') return route.fulfill({ json: [ana, bela] })
              return route.fulfill({ json: {} })
            })
            await page.goto(`/admin/finance?tab=${kind}`, { waitUntil: 'networkidle' })
            await expect(page.locator('html')).toHaveAttribute('data-skin', theme === 'classic' ? 'classic' : 'aurum')
            await expect(page.locator('html')).toHaveAttribute('lang', language)
            const open = page.getByRole('button', { name: /otvori knjigu.*2026|open book.*2026/i })
            await tabTo(page, open)
            await page.keyboard.press('Enter')
            const table = page.getByRole('table', { name: kind === 'income' ? /stavke knjige prihoda|income book entries/i : /stavke knjige rashoda|expense book entries/i })
            await expect(table.locator('tbody tr')).toHaveCount(3)
            const filters = page.locator(kind === 'income' ? '[data-finance-income-filters]' : '[data-finance-expense-filters]')
            const search = filters.locator(kind === 'income' ? '#income-search' : '#expense-search')
            const clear = filters.getByRole('button', { name: /^očisti$|^clear$/i })
            if (scenario.endsWith('names')) {
              const edits = table.getByRole('button', { name: /uredi ručni prihod|edit manual income entry/i })
              const deletes = table.getByRole('button', { name: /obriši ručni prihod|delete manual income entry/i })
              await expect(edits).toHaveCount(2)
              await expect(deletes).toHaveCount(2)
              await expect(edits.nth(0)).toHaveAccessibleName(/Alpha/)
              await expect(edits.nth(1)).toHaveAccessibleName(scenario === 'duplicate-names' ? /Alpha/ : /Beta/)
              await expect(deletes.nth(0)).toHaveAccessibleName(/Alpha/)
              await expect(deletes.nth(1)).toHaveAccessibleName(scenario === 'duplicate-names' ? /Alpha/ : /Beta/)
              const editNames = await edits.evaluateAll(elements => elements.map(el => el.getAttribute('aria-label')))
              const deleteNames = await deletes.evaluateAll(elements => elements.map(el => el.getAttribute('aria-label')))
              expect(new Set(editNames).size).toBe(2)
              expect(new Set(deleteNames).size).toBe(2)
              await tabTo(page, edits.nth(0))
              await tabTo(page, edits.nth(1))
              const serviceSort = table.getByRole('button', { name: /sortiraj po koloni servis|sort by service/i })
              await tabTo(page, serviceSort)
              await page.keyboard.press('Enter')
              await page.keyboard.press('Space')
              await expect(serviceSort.locator('..')).toHaveAttribute('aria-sort', 'descending')
              await expect(edits.nth(0)).toHaveAccessibleName(/(?:row|red) 2/i)
              await expect(edits.nth(1)).toHaveAccessibleName(/(?:row|red) 3/i)
              await expect(deletes.nth(0)).toHaveAccessibleName(/(?:row|red) 2/i)
              await expect(deletes.nth(1)).toHaveAccessibleName(/(?:row|red) 3/i)
            } else if (scenario === 'clear') {
              for (const key of ['Enter', 'Space']) {
                await tabTo(page, search)
                await page.keyboard.type('Beta')
                await expect(table.locator('tbody tr')).toHaveCount(1)
                await expect(table.locator('tbody')).toContainText('Beta')
                await tabTo(page, clear)
                await page.keyboard.press(key)
                await expect(search).toBeFocused()
                const focused = await search.evaluate(el => {
                  const rect = el.getBoundingClientRect(), top = document.elementFromPoint((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2)
                  return { focusVisible: el.matches(':focus-visible'), centerHit: !!top && (top === el || el.contains(top)) }
                })
                expect(focused.focusVisible).toBe(true)
                expect(focused.centerHit).toBe(true)
                await expect(search).toHaveValue('')
                await expect(clear).toHaveCount(0)
                await expect(table.locator('tbody tr')).toHaveCount(3)
              }
              await page.keyboard.type('No matching fixture')
              await expect(table).toHaveCount(0)
              await expect(filters).toContainText(language === 'bs' ? 'Prikazano 0 od 3' : 'Showing 0 of 3')
              await expect(search).toBeFocused()
              await tabTo(page, clear)
              await page.keyboard.press('Enter')
              await expect(search).toBeFocused()
              await expect(table.locator('tbody tr')).toHaveCount(3)
            } else if (scenario === 'sort') {
              const sort = table.getByRole('button', { name: kind === 'income' ? /sortiraj po koloni servis|sort by service/i : /sortiraj po koloni naziv|sort by name/i })
              await tabTo(page, sort)
              if (viewport === 'mobile') {
                const header = await table.locator('thead').evaluate(el => ({ height: el.getBoundingClientRect().height, clip: getComputedStyle(el).clipPath }))
                expect(header.height).toBeGreaterThan(20)
                expect(header.clip).toBe('none')
              }
              // A 1px clipped mobile header is focusable but not visually available.
              const visual = await sort.evaluate(el => {
                const r = el.getBoundingClientRect(), top = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2)
                const style = getComputedStyle(el)
                let ancestor = el.parentElement
                while (ancestor && getComputedStyle(ancestor).backgroundColor === 'rgba(0, 0, 0, 0)') ancestor = ancestor.parentElement
                return { width: r.width, height: r.height, focusVisible: el.matches(':focus-visible'), centerHit: !!top && (top === el || el.contains(top)), outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor, background: ancestor ? getComputedStyle(ancestor).backgroundColor : '' }
              })
              expect(visual.focusVisible).toBe(true)
              expect(visual.outlineStyle).toBe('solid')
              expect(parseFloat(visual.outlineWidth)).toBeGreaterThanOrEqual(3)
              expect(contrast(visual.outlineColor, visual.background)).toBeGreaterThanOrEqual(3)
              expect(visual.width).toBeGreaterThan(20)
              expect(visual.height).toBeGreaterThan(20)
              expect(visual.centerHit).toBe(true)
              await page.keyboard.press('Enter')
              await expect(sort.locator('..')).toHaveAttribute('aria-sort', 'ascending')
              const rows = table.locator('tbody tr')
              await expect(rows.nth(0)).toContainText('Alpha')
              await expect(rows.nth(1)).toContainText('Beta')
              await expect(rows.nth(2)).toContainText('Gamma')
              await page.keyboard.press('Space')
              await expect(sort.locator('..')).toHaveAttribute('aria-sort', 'descending')
              await expect(rows.nth(0)).toContainText('Gamma')
              await expect(rows.nth(2)).toContainText('Alpha')
              await expect(sort).toBeFocused()
              if (language === 'en' && viewport === 'desktop') {
                const axe = await new AxeBuilder({ page }).include(kind === 'income' ? '[data-finance-income-content]' : '[data-finance-expense-content]').withTags(AXE_RULE_TAGS).analyze()
                expect(assertableViolations(axe.violations)).toEqual([])
              }
            } else {
              await tabTo(page, search)
              await page.keyboard.type('Beta')
              await expect(table.locator('tbody tr')).toHaveCount(1)
              await expect(table.locator('tbody')).toContainText('Beta')
              await page.keyboard.press('Control+A')
              await page.keyboard.press('Backspace')
              if (kind === 'income') {
                const stylist = filters.locator('#income-stylist')
                await tabTo(page, stylist)
                await page.keyboard.type('Bela')
                await expect(table.locator('tbody tr')).toHaveCount(2)
                const manualButton = filters.getByRole('button', { name: /^ručne$|^manual$/i })
                await tabTo(page, manualButton)
                await page.keyboard.press('Enter')
                await expect(manualButton).toHaveAttribute('aria-pressed', 'true')
                await expect(table.locator('tbody tr')).toHaveCount(1)
                await expect(table.locator('tbody')).toContainText('Beta')
              } else {
                const categorySelect = filters.locator('#expense-category')
                await tabTo(page, categorySelect)
                await page.keyboard.press('ArrowDown')
                await page.keyboard.press('ArrowDown')
                await expect(categorySelect).toHaveValue('cat-2')
                await expect(table.locator('tbody tr')).toHaveCount(2)
                const checkbox = filters.getByRole('checkbox')
                await tabTo(page, checkbox)
                await page.keyboard.press('Space')
                await expect(checkbox).toBeChecked()
                await expect(table.locator('tbody tr')).toHaveCount(1)
                await expect(table.locator('tbody')).toContainText('Beta')
              }
              const min = filters.locator(kind === 'income' ? '#income-min' : '#expense-min')
              const max = filters.locator(kind === 'income' ? '#income-max' : '#expense-max')
              await tabTo(page, min)
              await page.keyboard.type('40')
              await tabTo(page, max)
              await page.keyboard.type('45')
              await expect(table).toHaveCount(0)
              await expect(filters).toContainText(language === 'bs' ? 'Prikazano 0 od 3' : 'Showing 0 of 3')
              await expect(max).toBeFocused()
              await page.keyboard.press('Control+A')
              await page.keyboard.type('60')
              await expect(table.locator('tbody tr')).toHaveCount(1)
              await expect(table.locator('tbody')).toContainText('Beta')
              await expect(filters).toContainText(language === 'bs' ? 'Prikazano 1 od 3' : 'Showing 1 of 3')
              await tabTo(page, clear)
              await page.keyboard.press('Enter')
              await expect(search).toBeFocused()
              await expect(table.locator('tbody tr')).toHaveCount(3)
            }
            expect(writes).toEqual([])
          })
        }
      }
    }
  }
}
