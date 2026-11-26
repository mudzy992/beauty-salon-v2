import { expect, test, type Locator, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { AXE_RULE_TAGS, assertableViolations } from './axe-coverage.mjs'

function contrastOverSurface(foreground: string, background: string, surface: string) {
  const color = (s: string) => {
    const parts = s.match(/[\d.]+/g)?.map(Number) ?? []
    if (parts.length < 3) throw new Error(`Expected RGB color: ${s}`)
    return [parts[0], parts[1], parts[2], parts[3] ?? 1]
  }
  const fg = color(foreground), bg = color(background), base = color(surface)
  if (fg[3] !== 1 || base[3] !== 1) throw new Error(`Expected opaque outline and surface: ${foreground}, ${surface}`)
  const mixed = bg.slice(0, 3).map((c, i) => c * bg[3] + base[i] * (1 - bg[3]))
  const luminance = (rgb: number[]) => {
    const linear = rgb.slice(0, 3).map(v => { const n = v / 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4 })
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  }
  const a = luminance(fg), b = luminance(mixed)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

async function tabTo(page: Page, target: Locator, limit = 150) {
  await expect(target).toBeVisible()
  for (let i = 0; i < limit && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

for (const theme of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const viewport of ['desktop', 'mobile'] as const) {
      test(`M1 daily log pickers and focus ${theme} ${language} ${viewport}`, async ({ page }) => {
        await page.setViewportSize(viewport === 'desktop' ? { width: 1280, height: 900 } : { width: 390, height: 844 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.addInitScript(({ mode, locale }) => {
          localStorage.setItem('token', 'fixture-admin-token')
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', mode)
          localStorage.setItem('APP_LOCALE', locale)
        }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
        const clients = Array.from({ length: 12 }, (_, i) => ({ id: `client-${i}`, username: `client${i}`, firstName: 'Test', lastName: `Client ${i}`, gender: null }))
        const services = Array.from({ length: 12 }, (_, i) => ({ id: `service-${i}`, name: `Service ${i}`, price: 50 }))
        const writes: { method: string; path: string; body: unknown }[] = []
        let saveAttempts = 0
        let releaseSearch!: () => void
        let searchStarted!: () => void
        const delayedSearch = new Promise<void>(resolve => { releaseSearch = resolve })
        const searchSeen = new Promise<void>(resolve => { searchStarted = resolve })
        await page.route('**/api/**', async route => {
          const req = route.request(), path = new URL(req.url()).pathname
          if (req.method() !== 'GET') {
            writes.push({ method: req.method(), path, body: req.postDataJSON() })
            if (req.method() === 'POST' && path === '/api/daily-log') {
              saveAttempts++
              return route.fulfill(saveAttempts === 1 ? { status: 503, json: {} } : { json: { id: 'synthetic-entry' } })
            }
            return route.abort()
          }
          if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
          if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
          if (path === '/api/daily-log') return route.fulfill({ json: [] })
          if (path === '/api/stylists') return route.fulfill({ json: [{ id: 'stylist-1', user: { username: 'ana', firstName: 'Ana', lastName: 'Test' } }] })
          if (path === '/api/services') return route.fulfill({ json: services })
          if (path === '/api/users/for-daily-log') {
            if (new URL(req.url()).searchParams.get('q') === 'Test') {
              searchStarted()
              await delayedSearch
              return route.fulfill({ json: { items: clients.slice(0, 1), total: 1, page: 0, pageSize: 50 } })
            }
            return route.fulfill({ json: { items: clients, total: clients.length, page: 0, pageSize: 50 } })
          }
          if (path === '/api/client-debts') return route.fulfill({ json: [] })
          return route.fulfill({ json: {} })
        })
        await page.goto('/admin/daily-log', { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
        await expect(page.locator('html')).toHaveAttribute('lang', language)
        const trigger = page.getByRole('button', { name: /novi unos|new entry/i }).first()
        await tabTo(page, trigger)
        await page.keyboard.press('Enter')
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        const client = dialog.locator('#dailylog-client')
        await tabTo(page, client, 40)
        await expect(client).toHaveAttribute('aria-expanded', 'true')
        await page.keyboard.type('Test')
        await searchSeen
        await page.keyboard.press('ArrowUp')
        await expect(client).toHaveAttribute('aria-activedescendant', 'dailylog-client-opt-client-11')
        await page.keyboard.press('Home')
        await expect(client).toHaveAttribute('aria-activedescendant', 'dailylog-client-opt-client-0')
        await page.keyboard.press('End')
        await expect(client).toHaveAttribute('aria-activedescendant', 'dailylog-client-opt-client-11')
        releaseSearch()
        await expect(dialog.locator('#dailylog-client-listbox [role=option]')).toHaveCount(1)
        await expect(client).not.toHaveAttribute('aria-activedescendant')
        await page.keyboard.press('Escape')
        await expect(dialog).toBeVisible()
        await expect(client).toBeFocused()
        await expect(client).toHaveAttribute('aria-expanded', 'false')
        await page.keyboard.press('ArrowDown')
        await expect(client).toHaveAttribute('aria-expanded', 'true')
        await expect(client).toHaveAttribute('aria-activedescendant', 'dailylog-client-opt-client-0')
        await page.keyboard.press('Enter')
        await expect(client).toHaveValue('Test Client 0')
        await expect(client).toBeFocused()
        const service = dialog.locator('#dailylog-services')
        await tabTo(page, service, 40)
        await expect(service).toHaveAttribute('aria-expanded', 'true')
        await page.keyboard.press('End')
        await expect(service).toHaveAttribute('aria-activedescendant', 'dailylog-service-opt-service-11')
        const lastOption = dialog.locator('#dailylog-service-opt-service-11')
        const visibleInList = await lastOption.evaluate(el => {
          const option = el.getBoundingClientRect(), list = el.parentElement!.getBoundingClientRect()
          return option.top >= list.top && option.bottom <= list.bottom
        })
        expect(visibleInList).toBe(true)
        await expect(lastOption).toHaveAttribute('data-daily-log-active-option', '')
        await expect(lastOption).toHaveCSS('outline-style', 'solid')
        await expect(lastOption).toHaveCSS('outline-width', '2px')
        const colors = await lastOption.evaluate(el => ({
          outline: getComputedStyle(el).outlineColor,
          background: getComputedStyle(el).backgroundColor,
          surface: getComputedStyle(el.parentElement!).backgroundColor,
        }))
        expect(contrastOverSurface(colors.outline, colors.background, colors.surface), JSON.stringify(colors)).toBeGreaterThanOrEqual(3)
        await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' })
        await expect.poll(async () => lastOption.evaluate(el => {
          const probe = document.createElement('span')
          probe.style.color = 'Highlight'
          document.body.appendChild(probe)
          const result = { outline: getComputedStyle(el).outlineColor, highlight: getComputedStyle(probe).color }
          probe.remove()
          return result.outline === result.highlight
        })).toBe(true)
        await expect(service).toBeFocused()
        await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' })
        if (language === 'en' && viewport === 'desktop') {
          const axe = await new AxeBuilder({ page }).include('[role=dialog]').withTags(AXE_RULE_TAGS).analyze()
          expect(assertableViolations(axe.violations)).toEqual([])
        }
        await page.keyboard.press('Enter')
        await expect(lastOption).toHaveAttribute('aria-selected', 'true')
        await page.keyboard.press('Escape')
        await expect(dialog).toBeVisible()
        await expect(service).toBeFocused()
        await page.keyboard.press('ArrowDown')
        await expect(service).toHaveAttribute('aria-expanded', 'true')
        const chip = dialog.getByRole('button', { name: /Service 11/ })
        await tabTo(page, chip, 40)
        await page.keyboard.press('Enter')
        await expect(chip).toHaveCount(0)
        await expect(service).toBeFocused()
        await page.keyboard.press('Escape')
        await expect(service).toHaveAttribute('aria-expanded', 'false')
        await page.keyboard.press('Escape')
        await expect(dialog).toBeHidden()
        await expect(trigger).toBeFocused()
        expect(writes).toEqual([])

        // A fresh form: validate, then submit a synthetic entry; first simulate a
        // server error and retry successfully. No write reaches a backend.
        await page.keyboard.press('Enter')
        await expect(dialog).toBeVisible()
        const save = dialog.getByRole('button', { name: /^sačuvaj$|^save$/i })
        await tabTo(page, save, 40)
        await page.keyboard.press('Enter')
        const summary = dialog.locator('[role=alert][tabindex="-1"]')
        await expect(summary).toBeFocused()
        const stylist = dialog.locator('#dailylog-stylist')
        await tabTo(page, stylist, 40)
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('Enter')
        await expect(stylist).toHaveValue('stylist-1')
        await tabTo(page, client, 40)
        await expect(client).toHaveAttribute('aria-expanded', 'true')
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('Enter')
        await expect(client).toHaveValue('Test Client 0')
        await tabTo(page, service, 40)
        await expect(service).toHaveAttribute('aria-expanded', 'true')
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('Enter')
        await expect(dialog.locator('#dailylog-service-opt-service-0')).toHaveAttribute('aria-selected', 'true')
        await tabTo(page, save, 40)
        await page.keyboard.press('Enter')
        await expect(summary).toBeFocused()
        await expect(dialog).toBeVisible()
        await tabTo(page, save, 40)
        await page.keyboard.press('Enter')
        await expect(dialog).toBeHidden()
        await expect(trigger).toBeFocused()
        expect(writes).toHaveLength(2)
        for (const write of writes) expect(write).toMatchObject({
          method: 'POST', path: '/api/daily-log',
          body: { stylistProfileId: 'stylist-1', clientId: 'client-0', items: [{ serviceId: 'service-0', unitPrice: 50 }], paidAmount: 50, isManual: true, debtHandling: 'IGNORE_DEBT' },
        })

        // Pointer selection still works despite blur handling and native Tab fixes.
        await page.keyboard.press('Enter')
        await client.click()
        await dialog.locator('#dailylog-client-opt-client-0').click()
        await expect(client).toHaveValue('Test Client 0')
        await service.click()
        await dialog.locator('#dailylog-service-opt-service-0').click()
        const pointerChip = dialog.getByRole('button', { name: /Service 0/ })
        await expect(pointerChip).toBeVisible()
        // The multi-select list is intentionally left open; click outside to dismiss it.
        await stylist.click()
        await expect(service).toHaveAttribute('aria-expanded', 'false')
        await pointerChip.click()
        await expect(pointerChip).toHaveCount(0)
        await expect(service).toBeFocused()
        await page.keyboard.press('Escape')
        await page.keyboard.press('Escape')
        await expect(dialog).toBeHidden()
        await expect(trigger).toBeFocused()
        expect(writes).toHaveLength(2)
      })
    }
  }
}
