export const ANIMATION_SETTLE_TIMEOUT_MS: number

export type AnimationSettleResult = { seen: number; stillRunning: number }

export function animationSettler(): Promise<AnimationSettleResult>
