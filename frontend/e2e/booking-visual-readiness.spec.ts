import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { waitForBookingVisualReadiness } from './booking-visual-readiness'

test('booking readiness waits for opacity animation and does not suppress contrast failures', async ({ page }) => {
  await page.setContent(`<div data-reserve-intro style="opacity:1">
    <div data-reserve-date-panel style="opacity:1"><p style="color:#aaa;background:#fff;font-size:16px">Synthetic low contrast text</p></div>
  </div>`)
  const firstOpacity = await page.locator('[data-reserve-intro]').evaluate(async el => {
    const animation = el.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 800, fill: 'both' })
    animation.pause()
    animation.currentTime = 0
    await animation.ready
    return Number(getComputedStyle(el).opacity)
  })
  expect(firstOpacity).toBeLessThan(1)
  await page.locator('[data-reserve-intro]').evaluate(el => {
    const animation = el.getAnimations()[0]
    setTimeout(() => animation.play(), 100)
  })
  await waitForBookingVisualReadiness(page)
  await expect(page.locator('[data-reserve-intro]')).toHaveCSS('opacity', '1')
  const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()
  expect(results.violations.map(result => result.id)).toContain('color-contrast')
})

test('booking readiness fails if a panel stays translucent', async ({ page }) => {
  await page.setContent('<div data-reserve-intro style="opacity:1"><div data-reserve-date-panel style="opacity:0.25">Fixture</div></div>')
  await expect(waitForBookingVisualReadiness(page, 350)).rejects.toThrow('Booking entrance and date panel must finish')
})
