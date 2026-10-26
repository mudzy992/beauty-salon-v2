const PROFILE_ERRORS = new Map([
  ['Korisnik nije pronađen.', 'users.errors.notFound'],
  ['Korisničko ime je već u upotrebi.', 'users.errors.usernameTaken'],
  ['Korisničko ime nije validno.', 'users.errors.usernameInvalid'],
  ['Email je već u upotrebi.', 'users.errors.emailTaken'],
  ['Email je obavezan.', 'profile.errors.emailRequired'],
  ['Prvo unesite email adresu u profilu.', 'profile.errors.emailRequired'],
  ['Email adresa je već potvrđena.', 'profile.errors.emailAlreadyVerified'],
  ['Kod nije ispravan ili je istekao. Zatražite novi kod.', 'profile.errors.invalidVerificationCode'],
  ['Spol je obavezan za klijente.', 'users.validation.genderRequiredForClients'],
  ['Nemate dozvolu za izmjenu ovog korisnika.', 'users.errors.permissionDenied'],
  [
    'Samo korisnik može postaviti avatar ili mijenjati njegovu javnost.',
    'users.errors.permissionDenied',
  ],
  ['Prvo postavite avatar pa ga zatim učinite javnim.', 'profile.errors.avatarRequiredForPublic'],
  ['Avatar mora biti uploadan u vaš profil.', 'profile.errors.avatarUploadFailed'],
  [
    'Avatar mora biti validna slika koju ste uploadali na svoj profil.',
    'profile.errors.avatarUploadFailed',
  ],
])

export const resolveProfileApiErrorKey = (message, fallbackKey) => {
  if (typeof message !== 'string') return fallbackKey
  return PROFILE_ERRORS.get(message.trim()) ?? fallbackKey
}
