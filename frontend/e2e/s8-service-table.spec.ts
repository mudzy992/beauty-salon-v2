import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Synthetic catalogue only. The same assertions run before and after the S8
// extraction; no backend writes are made by this fixture.
for (const theme of ['light', 'dark'] as const) {
  for (const language of ['bs', 'en'] as const) {
    for (const width of [320, 639, 640, 1280]) {
      test(`S8 service rows retain fields and actions ${theme} ${language} ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.addInitScript(({ mode, locale }) => {
          localStorage.setItem('token', 'fixture-admin-token')
          localStorage.setItem('APP_LOCALE', locale)
          localStorage.removeItem('nejra.theme')
          localStorage.setItem('nejra.theme.mode', mode)
        }, { mode: theme === 'dark' ? 'dark' : 'light', locale: language })
        const category = { id: 'cat', name: 'Category fixture', isActive: true, sortOrder: 0 }
        const sub = { id: 'sub', categoryId: 'cat', name: 'Subcategory fixture', isActive: true, sortOrder: 0 }
        const longDescription = `Description one ${'longunbrokentext'.repeat(6)} end`
        const services = [
          { id: 'svc-1', name: 'Repeated service', subcategoryId: 'sub', durationMinutes: 45, price: '12.50', gender: 'MALE', isActive: true, sortOrder: 0, heroImage: null, shortDescription: longDescription, loyaltyEnabled: true, loyaltyMaxDiscountPercent: 25 },
          { id: 'svc-2', name: 'Repeated service', subcategoryId: 'sub', durationMinutes: 60, price: '70.00', gender: 'FEMALE', isActive: false, sortOrder: 1, heroImage: null, shortDescription: 'Description two', loyaltyEnabled: false },
        ]
        await page.route('**/api/**', async route => {
          const request = route.request(), path = new URL(request.url()).pathname
          if (request.method() !== 'GET') return route.abort()
          if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
          if (path === '/api/users/profile') return route.fulfill({ json: { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] } })
          if (path === '/api/services/admin/categories') return route.fulfill({ json: [category] })
          if (path === '/api/services/admin/subcategories') return route.fulfill({ json: [sub] })
          if (path === '/api/services/admin/services') return route.fulfill({ json: services })
          return route.fulfill({ json: {} })
        })
        await page.goto('/admin/services', { waitUntil: 'networkidle' })
        await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
        await page.getByRole('button', { name: /Category fixture/, expanded: false }).click()
        const table = page.locator('table').filter({ hasText: 'Repeated service' })
        const rows = table.locator('tbody tr')
        await expect(rows).toHaveCount(2)
        const first = rows.nth(0), second = rows.nth(1)
        await expect(first.locator('td')).toHaveCount(8)
        await expect(second.locator('td')).toHaveCount(8)
        for (const cell of await first.locator('td').all()) {
          await expect(cell).toBeVisible()
          await expect(cell).toHaveAttribute('data-label', /.+/)
        }
        if (width < 640) {
          const geometry = await first.locator('td').nth(1).evaluate(cell => {
            const outer = cell.getBoundingClientRect()
            const inner = cell.querySelector('span')!.getBoundingClientRect()
            return { cellLeft: outer.left, cellRight: outer.right, textLeft: inner.left, textRight: inner.right, viewport: window.innerWidth }
          })
          expect(geometry.cellLeft).toBeGreaterThanOrEqual(0)
          expect(geometry.cellRight).toBeLessThanOrEqual(geometry.viewport)
          expect(geometry.textLeft).toBeGreaterThanOrEqual(geometry.cellLeft)
          expect(geometry.textRight).toBeLessThanOrEqual(geometry.cellRight + 1)
          expect(await table.evaluate(el => {
            const region = el.parentElement!
            return region.scrollWidth <= region.clientWidth + 1
          }), 'mobile service cards must not require horizontal scrolling').toBe(true)
          expect(await first.locator('td').nth(1).evaluate(cell => ({
            display: getComputedStyle(cell).display,
            label: getComputedStyle(cell, '::before').content,
          }))).toEqual({ display: 'flex', label: language === 'en' ? '"Description"' : '"Opis"' })
        }
        await expect(first.locator('td').nth(0)).toHaveText('Repeated service')
        await expect(first.locator('td').nth(1)).toBeVisible()
        const description = first.locator('td').nth(1).locator('span')
        await expect(description).toHaveText(longDescription)
        expect(await description.evaluate(el => ({
          truncated: getComputedStyle(el).textOverflow === 'ellipsis',
          overflows: el.scrollWidth > el.clientWidth + 1,
        }))).toEqual({ truncated: false, overflows: false })
        await expect(second.locator('td').nth(1)).toHaveText('Description two')
        await expect(first.locator('td').nth(2)).toHaveText('45 min')
        await expect(first.locator('td').nth(3)).toHaveText(/12[.,]50/)
        await expect(first.locator('td').nth(4)).toHaveText(language === 'en' ? 'Male' : 'Muško')
        await expect(first.locator('td').nth(5)).toContainText('25%')
        await expect(second.locator('td').nth(5)).toHaveText(language === 'en' ? 'No loyalty' : 'Bez loyalty')
        await expect(first.locator('td').nth(6)).toHaveText(language === 'en' ? 'Active' : 'Aktivan')
        await expect(second.locator('td').nth(6)).toHaveText(language === 'en' ? 'Inactive' : 'Neaktivan')
        const galleryLabel = language === 'en' ? 'View completed work' : 'Pregled završenih radova'
        const editLabel = language === 'en' ? 'Edit service' : 'Uredi uslugu'
        const gallery = first.getByRole('link', { name: `${galleryLabel}: Repeated service (1)` })
        await expect(gallery).toHaveAttribute('href', '/admin/services/svc-1/work-gallery')
        await expect(second.getByRole('link', { name: `${galleryLabel}: Repeated service (2)` })).toHaveAttribute('href', '/admin/services/svc-2/work-gallery')
        const accessibility = await new AxeBuilder({ page }).include('table').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
        console.log(`S8 table axe incomplete ${theme}/${language}/${width}: ${JSON.stringify(accessibility.incomplete.map(rule => ({ id: rule.id, nodes: rule.nodes.map(node => ({ target: node.target, reason: node.any.map(check => check.message) })) })))}`)
        expect(accessibility.violations).toEqual([])
        if (width === 640) {
          const region = table.locator('..')
          await expect(region).toHaveAttribute('tabindex', '0')
          await region.focus()
          await page.keyboard.press('ArrowRight')
          await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)
          // Axe can report partially clipped nodes as incomplete. Scroll each
          // reported node into view and rerun just that node's contrast rule.
          for (const node of accessibility.incomplete.filter(rule => rule.id === 'color-contrast').flatMap(rule => rule.nodes)) {
            expect(node.target).toHaveLength(1)
            const selector = `table.service-catalog-table ${node.target[0]}`
            const target = page.locator(selector)
            await target.scrollIntoViewIfNeeded()
            expect(await target.evaluate(el => {
              const bounds = el.getBoundingClientRect()
              const region = el.closest('div[role="region"]')!.getBoundingClientRect()
              const hit = document.elementFromPoint((bounds.left + bounds.right) / 2, (bounds.top + bounds.bottom) / 2)
              return bounds.left >= region.left - 1 && bounds.right <= region.right + 1 && !!hit && (el === hit || el.contains(hit))
            }), `scrolled contrast target is fully in region and not covered: ${selector}`).toBe(true)
            const measured = await new AxeBuilder({ page }).include(selector).withRules(['color-contrast']).analyze()
            console.log(`S8 scrolled contrast ${theme}/${language}: ${selector} violations=${measured.violations.length} incomplete=${measured.incomplete.length}`)
            expect(measured.violations).toEqual([])
            expect(measured.incomplete).toEqual([])
            expect(measured.passes.some(rule => rule.id === 'color-contrast')).toBe(true)
          }
          if (theme === 'light' && language === 'en') {
            // Negative control: the same scoped rule must detect unreadable text.
            const selector = 'table.service-catalog-table td[data-label="Loyalty"] [data-ui-badge="brand"]'
            const badge = page.locator(selector)
            await badge.scrollIntoViewIfNeeded()
            const previous = await badge.evaluate(el => {
              const oldStyle = el.getAttribute('style')
              ;(el as HTMLElement).style.setProperty('transition', 'none', 'important')
              ;(el as HTMLElement).style.setProperty('color', 'rgb(110, 110, 110)', 'important')
              ;(el as HTMLElement).style.setProperty('background-color', 'rgb(128, 128, 128)', 'important')
              return oldStyle
            })
            try {
              const negative = await new AxeBuilder({ page }).include(selector).withRules(['color-contrast']).analyze()
              expect(negative.violations.map(rule => rule.id)).toContain('color-contrast')
            } finally {
              await badge.evaluate((el, style) => style === null ? el.removeAttribute('style') : el.setAttribute('style', style), previous)
            }
          }
        }
        const edit = second.getByRole('button', { name: `${editLabel}: Repeated service (2)` })
        await edit.focus()
        await page.keyboard.press('Enter')
        const dialog = page.getByRole('dialog')
        await expect(dialog.locator('#services-service-name')).toHaveValue('Repeated service')
        await expect(dialog.locator('#services-short-description')).toHaveValue('Description two')
        await expect(dialog.locator('#services-duration')).toHaveValue('60')
        await expect(dialog.locator('#services-price')).toHaveValue('70')
      })
    }
  }
}
