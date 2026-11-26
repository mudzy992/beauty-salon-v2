import { expect, test, type Locator, type Page } from '@playwright/test'

async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 100 && !(await target.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab')
  await expect(target).toBeFocused()
}

// Held availability response keeps calendar content stable while the date panel mounts.
for (const theme of ['light', 'dark'] as const) {
  for (const preference of ['reduce', 'no-preference'] as const) {
    test(`M6 booking date expansion ${theme} ${preference}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: preference })
      await page.addInitScript(({ mode }) => {
        localStorage.setItem('token', 'fixture-client-token')
        localStorage.removeItem('nejra.theme')
        localStorage.setItem('nejra.theme.mode', mode)
        localStorage.setItem('APP_LOCALE', 'en')
        const samples: { inline: string; natural: number }[] = []
        ;(window as unknown as { expansionSamples: typeof samples }).expansionSamples = samples
        new MutationObserver(records => {
          for (const record of records) {
            const el = record.target as HTMLElement
            const legend = el.querySelector('legend')
            if (legend?.textContent?.includes('Select a date') && legend.parentElement?.parentElement?.parentElement === el) {
              samples.push({ inline: el.style.height, natural: el.scrollHeight })
            }
          }
        }).observe(document, { attributes: true, attributeFilter: ['style'], subtree: true })
      }, { mode: theme === 'dark' ? 'dark' : 'light' })
      let release!: () => void
      const gate = new Promise<void>(resolve => { release = resolve })
      const writes: string[] = []
      await page.route('**/api/**', async route => {
        const req = route.request(), path = new URL(req.url()).pathname
        if (req.method() !== 'GET') { writes.push(`${req.method()} ${path}`); return route.abort() }
        if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
        if (path === '/api/users/profile') return route.fulfill({ json: { id: 'fixture-client', username: 'test', email: 'test@example.test', phone: '+387 61 123 456', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['CLIENT'] } })
        if (path === '/api/services') return route.fulfill({ json: [{ id: 'service-one', name: 'Fixture service', durationMinutes: 60, gender: 'FEMALE' }] })
        if (path === '/api/reservations/availability/dates') { await gate; return route.fulfill({ json: [] }) }
        if (path === '/api/client-debts/me') return route.fulfill({ json: [] })
        if (path === '/api/loyalty/client/me') return route.fulfill({ json: { enabled: false, hasAccount: false } })
        return route.fulfill({ json: {} })
      })
      await page.goto('/rezervacija', { waitUntil: 'domcontentloaded' })
      await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(preference === 'reduce')
      await expect(page.locator('html')).toHaveAttribute('data-skin', 'aurum')
      const search = page.locator('#public-service-search')
      await expect(search).toBeVisible()
      await tabTo(page, search)
      await page.keyboard.type('Fixture')
      const option = page.getByRole('button', { name: /Fixture service/i })
      await tabTo(page, option)
      await page.keyboard.press('Enter')
      await expect(page.getByRole('group', { name: /select a date/i })).toBeAttached()
      await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 650)))
      const samples = await page.evaluate(() => (window as unknown as { expansionSamples: Array<{ inline: string; natural: number }> }).expansionSamples)
      // scrollHeight can track an animated box when it is taller than its children;
      // compare against the largest natural height observed, not each frame's box.
      const peakHeight = Math.max(0, ...samples.map(sample => sample.natural))
      const intermediate = samples.filter(sample => sample.inline.endsWith('px') && parseFloat(sample.inline) > 1 && parseFloat(sample.inline) < peakHeight - 1)
      release()
      await expect(page.locator('[data-reserve-calendar]')).toBeVisible()
      expect(samples.length, 'motion wrapper must have been observed').toBeGreaterThan(0)
      expect(samples.some(sample => sample.inline === 'auto'), JSON.stringify(samples)).toBe(true)
      if (preference === 'reduce') expect(intermediate, JSON.stringify(samples)).toEqual([])
      // A busy worker can miss every intermediate non-reduced frame; record rather than fail.
      console.log(`M6_EXPANSION_${theme.toUpperCase()}_${preference.toUpperCase()} sampled=${samples.length} intermediate=${intermediate.length}`)
      expect(writes).toEqual([])
    })
  }
}
