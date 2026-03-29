export type OnboardingUserLike = {
  roles: string[]
  mustChangePassword?: boolean
  genderOnboardingCompleted?: boolean
  email: string | null
  isEmailVerified: boolean
}

export function getClientMandatoryOnboardingPath(user: OnboardingUserLike | null): string | null {
  if (!user || !user.roles.includes('CLIENT')) return null
  if (user.mustChangePassword) return '/force-change-password'
  if (user.genderOnboardingCompleted !== true) return '/onboarding/gender'
  const emailOk = !!user.email?.trim() && user.isEmailVerified === true
  if (!emailOk) return '/onboarding/email'
  return null
}

export function getPostAuthRedirectPath(user: OnboardingUserLike | null): string {
  if (!user) return '/'
  const isAdmin = user.roles.includes('SYSTEM_ADMIN') || user.roles.includes('OWNER')
  if (isAdmin) return '/admin'
  const step = getClientMandatoryOnboardingPath(user)
  if (step) return step
  return '/'
}
