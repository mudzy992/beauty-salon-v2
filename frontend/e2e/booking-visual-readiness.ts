import { expect, type Page } from '@playwright/test'

/** Wait for these two known booking entrance animations before the settled-state axe scan.
 * A timeout or persistently translucent element fails; this doesn't filter axe findings.
 * Other animations and intermediate-frame contrast remain outside this check.
 */
export async function waitForBookingVisualReadiness(page: Page, timeout = 10_000) {
  const intro = page.locator('[data-reserve-intro]')
  const date = page.locator('[data-reserve-date-panel]')
  await expect(intro).toHaveCount(1)
  await expect(date).toHaveCount(1)
  const sample = (el: Element) => ({
    opacity: getComputedStyle(el).opacity,
    running: el.getAnimations().filter(animation => animation.playState === 'running' || animation.pending).length,
  })
  await expect.poll(async () => ({ intro: await intro.evaluate(sample), date: await date.evaluate(sample) }), {
    timeout,
    message: 'Booking entrance and date panel must finish before the settled-state scan',
  }).toEqual({ intro: { opacity: '1', running: 0 }, date: { opacity: '1', running: 0 } })
}
