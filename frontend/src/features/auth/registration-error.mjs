const BACKEND_CONFLICT_KEYS = new Map([
  ['Email je već u upotrebi.', 'auth.emailAlreadyInUse'],
  ['Korisničko ime je već u upotrebi.', 'auth.usernameAlreadyInUse'],
  ['Lozinka mora imati najmanje 8 karaktera.', 'auth.passwordMinLength'],
])

/** Translate the current backend's known Bosnian registration conflicts. */
export function getRegistrationErrorKey(message) {
  if (typeof message !== 'string') return 'auth.registrationError'
  return BACKEND_CONFLICT_KEYS.get(message.trim()) ?? 'auth.registrationError'
}
