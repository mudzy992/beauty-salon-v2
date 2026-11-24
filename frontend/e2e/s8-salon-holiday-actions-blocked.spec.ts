import { expect, test } from '@playwright/test'

const profile = { id: 'admin', username: 'test', email: 'admin@example.test', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, roles: ['ADMIN'] }
const holiday = { id: 'h-1', date: '2030-06-01', name: 'Fixture holiday', message: null, sendPush: true, pushSentAt: null }
const salon = { id: 'salon-1', name: 'Fixture salon', workingHours: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isWorkingDay: true }], holidays: [holiday] }
for (const language of ['bs', 'en'] as const) {
  for (const width of [320, 1280]) {
    test(`failed holiday refresh blocks stale actions until retry ${language} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
      const writes: string[] = []
      let reads = 0
      await page.route('**/api/**', route => {
        const req = route.request(), path = new URL(req.url()).pathname
        if (req.method() !== 'GET') { writes.push(`${req.method()} ${path}`); return route.fulfill({ json: {} }) }
        if (path === '/api/settings/public') return route.fulfill({ json: [] })
        if (path === '/api/users/profile') return route.fulfill({ json: profile })
        if (path === '/api/salon/list') return route.fulfill({ json: [salon] })
        if (path === '/api/salon/salon-1') { reads++; return reads === 1 ? route.fulfill({ status: 500, json: {} }) : route.fulfill({ json: salon }) }
        return route.fulfill({ json: {} })
      })
      await page.goto('/admin/salon', { waitUntil: 'networkidle' })
      await page.getByRole('tab', { name: language === 'bs' ? 'Praznici' : 'Holidays' }).click()
      const row = page.getByRole('row').filter({ hasText: 'Fixture holiday' })
      const send = row.getByRole('button').nth(0), edit = row.getByRole('button').nth(1), remove = row.getByRole('button').nth(2)
      await send.click()
      const alert = page.getByRole('alert').filter({ hasText: language === 'bs' ? 'Nije moguće učitati praznike' : 'Could not load holidays' })
      await expect(alert).toBeVisible()
      const add = page.getByRole('button', { name: language === 'bs' ? 'Novi Praznik' : 'New holiday' })
      for (const button of [send, edit, remove, add]) await expect(button).toBeDisabled()
      for (const button of [send, edit, remove, add]) await button.evaluate((element: HTMLButtonElement) => element.click())
      expect(writes).toEqual(['POST /api/salon/holidays/h-1/send-notification'])
      await alert.getByRole('button', { name: language === 'bs' ? 'Pokušaj ponovo' : 'Try again' }).click()
      await expect(alert).toHaveCount(0)
      for (const button of [send, edit, remove, add]) await expect(button).toBeEnabled()
      expect(reads).toBe(2)
      expect(writes).toHaveLength(1)
    })
  }
}

test('an already open holiday editor cannot save while a refresh is pending or failed', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  let postStarted = false, readStarted = false, releasePost!: () => void, releaseRead!: () => void
  const postGate = new Promise<void>(resolve => { releasePost = resolve })
  const readGate = new Promise<void>(resolve => { releaseRead = resolve })
  const writes: string[] = []
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    if (req.method() !== 'GET') {
      writes.push(`${req.method()} ${path}`)
      if (path.endsWith('/send-notification')) { postStarted = true; await postGate }
      return route.fulfill({ json: {} })
    }
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    if (path === '/api/salon/list') return route.fulfill({ json: [salon] })
    if (path === '/api/salon/salon-1') { readStarted = true; await readGate; return route.fulfill({ status: 500, json: {} }) }
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/admin/salon', { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: 'Holidays' }).click()
    const row = page.getByRole('row').filter({ hasText: 'Fixture holiday' })
    await row.getByRole('button', { name: /Send notification/ }).click()
    await expect.poll(() => postStarted).toBe(true)
    await row.getByRole('button', { name: /Edit holiday/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Edit holiday' })
    const save = dialog.getByRole('button', { name: 'Save', exact: true })
    await expect(save).toBeEnabled()
    releasePost()
    await expect.poll(() => readStarted).toBe(true)
    await expect(save).toBeDisabled()
    await expect(dialog.getByRole('status')).toBeVisible()
    releaseRead()
    await expect(save).toBeDisabled()
    await expect(dialog.getByRole('alert')).toContainText('Close this dialog and retry loading holidays before saving.')
    await save.evaluate((element: HTMLButtonElement) => element.click())
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('tab', { name: 'Holidays' })).toBeFocused()
    expect(writes).toEqual(['POST /api/salon/holidays/h-1/send-notification'])
  } finally { releasePost(); releaseRead() }
})

test('a pending confirmation closes without deleting when a holiday refresh starts', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  let postStarted = false, readStarted = false, releasePost!: () => void, releaseRead!: () => void
  const postGate = new Promise<void>(resolve => { releasePost = resolve })
  const readGate = new Promise<void>(resolve => { releaseRead = resolve })
  const writes: string[] = []
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    if (req.method() !== 'GET') {
      writes.push(`${req.method()} ${path}`)
      if (path.endsWith('/send-notification')) { postStarted = true; await postGate }
      return route.fulfill({ json: {} })
    }
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    if (path === '/api/salon/list') return route.fulfill({ json: [salon] })
    if (path === '/api/salon/salon-1') { readStarted = true; await readGate; return route.fulfill({ status: 500, json: {} }) }
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/admin/salon', { waitUntil: 'networkidle' })
    const tab = page.getByRole('tab', { name: 'Holidays' })
    await tab.click()
    const row = page.getByRole('row').filter({ hasText: 'Fixture holiday' })
    await row.getByRole('button', { name: /Send notification/ }).click()
    await expect.poll(() => postStarted).toBe(true)
    await row.getByRole('button', { name: /Delete holiday/ }).click()
    const confirm = page.getByRole('dialog', { name: 'Confirm deletion' })
    await expect(confirm).toBeVisible()
    releasePost()
    await expect.poll(() => readStarted).toBe(true)
    await expect(confirm).toBeHidden()
    await expect(tab).toBeFocused()
    releaseRead()
    await expect(page.getByRole('alert').filter({ hasText: 'Could not load holidays' })).toBeVisible()
    expect(writes).toEqual(['POST /api/salon/holidays/h-1/send-notification'])
  } finally { releasePost(); releaseRead() }
})

for (const language of ['bs', 'en'] as const) {
  test(`pending refresh disables actions and restores keyboard focus ${language}`, async ({ page }) => {
    await page.addInitScript(lang => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', lang) }, language)
    let release!: () => void, started = false
    const gate = new Promise<void>(resolve => { release = resolve })
    const writes: string[] = []
    await page.route('**/api/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname
      if (req.method() !== 'GET') { writes.push(`${req.method()} ${path}`); return route.fulfill({ json: {} }) }
      if (path === '/api/settings/public') return route.fulfill({ json: [] })
      if (path === '/api/users/profile') return route.fulfill({ json: profile })
      if (path === '/api/salon/list') return route.fulfill({ json: [salon] })
      if (path === '/api/salon/salon-1') { started = true; await gate; return route.fulfill({ json: salon }) }
      return route.fulfill({ json: {} })
    })
    try {
      await page.goto('/admin/salon', { waitUntil: 'networkidle' })
      const tab = page.getByRole('tab', { name: language === 'bs' ? 'Praznici' : 'Holidays' })
      await tab.click()
      const row = page.getByRole('row').filter({ hasText: 'Fixture holiday' })
      const buttons = row.getByRole('button')
      const send = buttons.first()
      await send.focus(); await page.keyboard.press('Enter')
      await expect.poll(() => started).toBe(true)
      await expect(page.getByRole('status').filter({ hasText: language === 'bs' ? 'Osvježavanje praznika' : 'Refreshing holidays' })).toBeVisible()
      for (let i = 0; i < 3; i++) await expect(buttons.nth(i)).toBeDisabled()
      await expect(page.getByRole('button', { name: language === 'bs' ? 'Novi Praznik' : 'New holiday' })).toBeDisabled()
      await expect(tab).toBeFocused()
      release()
      for (let i = 0; i < 3; i++) await expect(buttons.nth(i)).toBeEnabled()
      expect(writes).toEqual(['POST /api/salon/holidays/h-1/send-notification'])
    } finally { release() }
  })
}

test('refresh does not move focus if the user left the holiday action', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('token', 'fixture-admin-token'); localStorage.setItem('APP_LOCALE', 'en') })
  let releasePost!: () => void, releaseRead!: () => void, postStarted = false, readStarted = false
  const postGate = new Promise<void>(resolve => { releasePost = resolve })
  const readGate = new Promise<void>(resolve => { releaseRead = resolve })
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    if (path === '/api/settings/public') return route.fulfill({ json: [] })
    if (path === '/api/users/profile') return route.fulfill({ json: profile })
    if (path === '/api/salon/list') return route.fulfill({ json: [salon] })
    if (path.endsWith('/send-notification')) { postStarted = true; await postGate; return route.fulfill({ json: {} }) }
    if (path === '/api/salon/salon-1') { readStarted = true; await readGate; return route.fulfill({ json: salon }) }
    return route.fulfill({ json: {} })
  })
  try {
    await page.goto('/admin/salon', { waitUntil: 'networkidle' })
    await page.getByRole('tab', { name: 'Holidays' }).click()
    await page.getByRole('button', { name: /Send notification.*Fixture holiday/ }).click()
    await expect.poll(() => postStarted).toBe(true)
    const otherTab = page.getByRole('tab', { name: 'Basic settings' })
    await otherTab.focus()
    releasePost()
    await expect.poll(() => readStarted).toBe(true)
    await expect(otherTab).toBeFocused()
    const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/salon/salon-1')
    releaseRead(); await response
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await expect(otherTab).toBeFocused()
    await expect(otherTab).toHaveAttribute('aria-selected', 'true')
  } finally { releasePost(); releaseRead() }
})
