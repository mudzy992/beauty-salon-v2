import { expect, test, type Locator } from '@playwright/test'

async function focusedCenterVisible(target: Locator) {
  return target.evaluate(el => {
    const r = el.getBoundingClientRect()
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return document.activeElement === el && !!hit && (hit === el || el.contains(hit))
  })
}

for (const theme of ['classic', 'light', 'dark'] as const) for (const motion of ['reduce', 'no-preference'] as const) {
  test(`focused booking control survives delayed layout shift (${theme}, ${motion}) without overriding user scrolling`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.emulateMedia({ reducedMotion: motion })
    await page.addInitScript(mode => {
      localStorage.setItem('token', 'fixture-client-token')
      localStorage.setItem('APP_LOCALE', 'en')
      localStorage.setItem('nejra.theme.mode', mode)
    }, theme === 'dark' ? 'dark' : 'light')
    await page.route('**/api/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname
      if (request.method() !== 'GET') return route.abort()
      if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: theme === 'classic' ? 'classic' : 'aurum' }, { key: 'theme_default_mode', value: theme === 'dark' ? 'dark' : 'light' }] })
      if (path === '/api/users/profile') return route.fulfill({ json: { id: 'fixture', username: 'test', email: 'test@example.test', phone: '+387 61 123 456', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['CLIENT'] } })
      if (path === '/api/services') return route.fulfill({ json: [{ id: 's1', name: 'Long fixture service for layout movement', durationMinutes: 60, gender: 'FEMALE' }] })
      if (path === '/api/reservations/availability/dates') return route.fulfill({ json: [] })
      if (path === '/api/client-debts/me') return route.fulfill({ json: [] })
      if (path === '/api/loyalty/client/me') return route.fulfill({ json: { enabled: false, hasAccount: false } })
      return route.fulfill({ json: {} })
    })
    await page.goto('/rezervacija', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => { document.documentElement.style.fontSize = '34px' })
    const search = page.locator('#public-service-search')
    await expect(search).toBeVisible()
    await search.focus()
    await search.fill('Long fixture')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: /Long fixture/ })).toBeFocused()
    await page.keyboard.press('Enter')
    const add = page.getByRole('button', { name: /^add more$/i })
    await expect(add).toBeFocused()
    await expect.poll(() => focusedCenterVisible(add)).toBe(true)
    // A synthetic late layout change proves the position can move after focus;
    // it does not claim to reproduce the original intermittent cause.
    await page.evaluate(() => {
      const selected = document.querySelector('[data-reserve-selected]')!
      const spacer = document.createElement('div')
      spacer.dataset.testDelayedShift = ''
      spacer.style.height = '1100px'
      selected.before(spacer)
    })
    try {
      await expect.poll(() => focusedCenterVisible(add), { timeout: 5000 }).toBe(true)
    } catch (error) {
      const geometry = await add.evaluate(el => {
        const rect = el.getBoundingClientRect()
        const header = document.querySelector('[data-aurum-shell="header"]')
        const headerRect = header?.getBoundingClientRect()
        const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2
        const hit = document.elementFromPoint(x, y)
        return { rect: { top: rect.top, bottom: rect.bottom, centerY: y }, header: headerRect && { top: headerRect.top, bottom: headerRect.bottom, position: getComputedStyle(header!).position }, viewport: { height: innerHeight, scrollY }, focused: document.activeElement === el, hit: hit && { tag: hit.tagName, text: hit.textContent?.slice(0, 80) } }
      })
      console.error('Focused booking shift diagnostic:', JSON.stringify(geometry))
      throw error
    }
    // Shrinking the late content can also move the focused control behind the sticky header.
    await page.evaluate(() => { (document.querySelector('[data-test-delayed-shift]') as HTMLElement).style.height = '0px' })
    await expect.poll(() => focusedCenterVisible(add), { timeout: 5000 }).toBe(true)
    // After explicit user navigation, further changes must not force a scroll.
    await page.mouse.wheel(0, -10000)
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
    await page.evaluate(() => { (document.querySelector('[data-test-delayed-shift]') as HTMLElement).style.height = '1500px' })
    await page.waitForTimeout(400)
    expect(await page.evaluate(() => scrollY)).toBe(0)
    await expect(add).toBeFocused()
  })
}

test('user scrolling before scheduled focus cancels the pending automatic focus', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'fixture-client-token')
    localStorage.setItem('APP_LOCALE', 'en')
  })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: { id: 'fixture', username: 'test', email: 'test@example.test', phone: '123', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['CLIENT'] } })
    if (path === '/api/services') return route.fulfill({ json: [{ id: 's1', name: 'Synthetic service', durationMinutes: 60, gender: 'FEMALE' }] })
    if (path === '/api/reservations/availability/dates' || path === '/api/client-debts/me') return route.fulfill({ json: [] })
    if (path === '/api/loyalty/client/me') return route.fulfill({ json: { enabled: false, hasAccount: false } })
    return route.fulfill({ json: {} })
  })
  await page.goto('/rezervacija')
  await page.locator('#public-service-search').fill('Synthetic')
  const option = page.getByRole('button', { name: /Synthetic service/ })
  await option.focus()
  // Dispatch the selection and a subsequent wheel intent within one task,
  // before the scheduled animation frame can transfer focus.
  await option.evaluate(el => {
    ;(el as HTMLElement).click()
    window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -100 }))
  })
  const add = page.getByRole('button', { name: /^add more$/i })
  await expect(add).toBeVisible()
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(add).not.toBeFocused()
})
