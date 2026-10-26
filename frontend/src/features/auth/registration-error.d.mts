export type RegistrationErrorKey =
  | 'auth.emailAlreadyInUse'
  | 'auth.usernameAlreadyInUse'
  | 'auth.passwordMinLength'
  | 'auth.registrationError'

export function getRegistrationErrorKey(message: unknown): RegistrationErrorKey
