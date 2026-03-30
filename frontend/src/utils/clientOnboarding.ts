export type OnboardingUserLike = {
  roles: string[]
  mustChangePassword?: boolean
  genderOnboardingCompleted?: boolean
  email: string | null
  isEmailVerified: boolean
}

export function normalizeRoles(roles: string[] | undefined | null): string[] {
  return (roles ?? []).map((r) => String(r).trim().toUpperCase()).filter(Boolean)
}

export function hasStaffDashboardAccess(user: OnboardingUserLike | null): boolean {
  if (!user) return false
  const r = normalizeRoles(user.roles)
  return r.includes('SYSTEM_ADMIN') || r.includes('OWNER')
}

export function isExemptFromForcedPasswordChange(user: OnboardingUserLike | null): boolean {
  return hasStaffDashboardAccess(user)
}

function isTruthyFlag(v: unknown): boolean {
  if (v === true || v === 1) return true
  if (v === false || v === 0 || v == null) return false
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    return s === '1' || s === 'true' || s === 'yes'
  }
  return Boolean(v)
}

export function getClientMandatoryOnboardingPath(user: OnboardingUserLike | null): string | null {
  if (!user) return null
  const roles = normalizeRoles(user.roles)
  const isClient = roles.includes('CLIENT')
  const staff = roles.includes('SYSTEM_ADMIN') || roles.includes('OWNER')

  if (isTruthyFlag(user.mustChangePassword) && !staff) {
    return '/force-change-password'
  }
  if (!isClient) return null
  if (staff) return null

  if (!isTruthyFlag(user.genderOnboardingCompleted)) {
    return '/onboarding/gender'
  }
  const emailOk = !!user.email?.trim() && isTruthyFlag(user.isEmailVerified)
  if (!emailOk) return '/onboarding/email'
  return null
}

export function getPostAuthRedirectPath(user: OnboardingUserLike | null): string {
  if (!user) return '/'
  const step = getClientMandatoryOnboardingPath(user)
  if (step) return step
  if (hasStaffDashboardAccess(user)) return '/admin'
  return '/'
}

export function shouldIgnoreStaleAuthRedirect(savedPath: string, user: OnboardingUserLike | null): boolean {
  if (!user) return false
  if (getClientMandatoryOnboardingPath(user) !== null) return false
  const pathOnly = savedPath.split('?')[0] ?? ''
  return (
    pathOnly.startsWith('/onboarding') ||
    pathOnly.startsWith('/force-change-password')
  )
}
