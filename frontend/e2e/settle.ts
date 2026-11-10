import type { Page } from '@playwright/test'

import { ANIMATION_SETTLE_TIMEOUT_MS, animationSettler } from './settle-animations.mjs'

/**
 * Čeka da se animacije završe prije axe analize.
 *
 * `Promise.race` s vremenskom granicom: da neka animacija ostane nedovršena, test se ne bi
 * vješao nego bi nastavio — a to je i dalje bolje od fiksnog `waitForTimeout`, jer se u
 * uobičajenom slučaju ne čeka ni milisekund duže nego što treba.
 */
export async function settleAnimations(page: Page): Promise<void> {
  await Promise.race([
    page.evaluate(animationSettler),
    page.waitForTimeout(ANIMATION_SETTLE_TIMEOUT_MS),
  ])
}
