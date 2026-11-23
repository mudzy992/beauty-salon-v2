import { expect, test } from '@playwright/test'

for (const language of ['bs', 'en'] as const) {
  test(`photo and description consent remain separate and recoverable ${language}`, async ({ page }) => {
    await page.addInitScript(locale => {
      localStorage.setItem('token', 'fixture-client-token')
      localStorage.setItem('APP_LOCALE', locale)
      localStorage.removeItem('nejra.theme')
      localStorage.setItem('nejra.theme.mode', 'light')
    }, language)
    const profile = { id: 'client-fixture', username: 'client', email: 'client@example.test', firstName: 'Test', lastName: 'Client', phone: '+387 61 123 456', gender: 'FEMALE', genderOnboardingCompleted: true, isEmailVerified: true, mustChangePassword: false, isActive: true, isAvatarPublic: false, avatar: null, createdAt: '2026-01-01T00:00:00.000Z', roles: ['CLIENT'] }
    const makeItem = (imageId: string, description: string) => ({ imageId, entryId: 'entry-1', serviceName: 'Synthetic service', serviceDate: '2026-01-02', completedAt: '2026-01-02T10:00:00.000Z', isBefore: imageId === 'photo-1', isAfter: imageId === 'photo-2', description, previewUrl: '/api/preview-fixture', consentedAt: null as string | null, revokedAt: null, isPublished: false, publishedCategories: [] })
    let pending = [makeItem('photo-1', 'Kratka tamna kosa'), makeItem('photo-2', 'Svijetla valovita kosa')]
    const active: typeof pending = []
    const writes: Array<{ imageId: string; body: Record<string, unknown> }> = []
    let failNextRefresh = false, rejectStale = true
    let releaseFirstGrant!: () => void
    const firstGrantGate = new Promise<void>(resolve => { releaseFirstGrant = resolve })
    await page.route('**/api/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname
      if (path === '/api/settings/public') return route.fulfill({ json: [{ key: 'theme_active_skin', value: 'aurum' }, { key: 'theme_default_mode', value: 'light' }] })
      if (path === '/api/users/profile') return route.fulfill({ json: profile })
      if (path === '/api/preview-fixture') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>' })
      if (path === '/api/media/consents/me') {
        if (failNextRefresh) { failNextRefresh = false; return route.fulfill({ status: 503, json: {} }) }
        return route.fulfill({ json: { policyVersion: 'policy-v1', consentText: 'Synthetic consent', pending, active } })
      }
      const grant = path.match(/^\/api\/media\/consents\/(photo-\d)\/grant$/)
      if (grant && req.method() === 'POST') {
        const imageId = grant[1]
        writes.push({ imageId, body: req.postDataJSON() })
        if (imageId === 'photo-1') await firstGrantGate
        if (imageId === 'photo-2' && rejectStale) { rejectStale = false; return route.fulfill({ status: 409, json: {} }) }
        const item = pending.find(row => row.imageId === imageId)!
        pending = pending.filter(row => row.imageId !== imageId)
        active.push({ ...item, consentedAt: '2026-01-03T10:00:00.000Z' })
        if (imageId === 'photo-2') failNextRefresh = true
        return route.fulfill({ status: 201, json: { active: true } })
      }
      if (req.method() !== 'GET') return route.abort()
      return route.fulfill({ json: {} })
    })
    await page.goto('/profil', { waitUntil: 'networkidle' })
    const descriptions = page.getByText(/Kratka tamna kosa|Svijetla valovita kosa/)
    await expect(descriptions).toHaveCount(2)
    const consentLabel = language === 'en' ? /I have read the statement/ : /Pročitao\/la sam tekst/
    const descriptionLabel = language === 'en' ? /I also agree to make this description public/ : /Dodatno pristajem da se ovaj opis javno prikaže/
    const photoConsent = page.getByRole('checkbox', { name: consentLabel })
    const descriptionConsent = page.getByRole('checkbox', { name: descriptionLabel })
    const grantLabel = language === 'en' ? 'Give consent' : 'Dajem saglasnost'
    const grantButtons = page.getByRole('button', { name: grantLabel })
    await expect(photoConsent).toHaveCount(2)
    await expect(descriptionConsent).toHaveCount(2)
    await expect(descriptionConsent.nth(0)).not.toBeChecked()
    await expect(descriptionConsent.nth(1)).not.toBeChecked()
    await expect(grantButtons.nth(0)).toBeDisabled()
    await photoConsent.nth(0).check()
    await photoConsent.nth(1).check()
    await grantButtons.nth(0).click()
    await expect.poll(() => writes.length).toBe(1)
    await expect(grantButtons).toHaveCount(1)
    await expect(grantButtons).toBeDisabled()
    expect(writes).toHaveLength(1)
    releaseFirstGrant()
    expect(writes[0]).toEqual({ imageId: 'photo-1', body: { policyVersion: 'policy-v1', publishDescription: false } })
    await expect(descriptionConsent).toHaveCount(1)
    await expect(descriptionConsent).not.toBeChecked()
    await photoConsent.check()
    await descriptionConsent.check()
    await page.getByRole('button', { name: grantLabel }).click()
    await expect.poll(() => writes.length).toBe(2)
    await expect(page.getByRole('status').filter({ hasText: language === 'en' ? 'Unable to save consent.' : 'Saglasnost nije mogla biti sačuvana.' })).toBeVisible()
    expect(writes[1]).toEqual({ imageId: 'photo-2', body: { policyVersion: 'policy-v1', publishDescription: true, reviewedDescription: 'Svijetla valovita kosa' } })
    await page.getByRole('button', { name: grantLabel }).click()
    await expect.poll(() => writes.length).toBe(3)
    await expect(page.getByRole('status').filter({ hasText: language === 'en' ? 'Consent was saved, but the status could not be refreshed' : 'Saglasnost je sačuvana, ali status nije moguće osvježiti' })).toBeVisible()
    await page.getByRole('button', { name: language === 'en' ? 'Try again' : 'Pokušaj ponovo', exact: true }).click()
    await expect(descriptionConsent).toHaveCount(0)
    await expect(page.getByText(language === 'en' ? 'Active consents' : 'Aktivne saglasnosti')).toBeVisible()
  })
}
