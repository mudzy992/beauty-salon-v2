/**
 * i18n konstante – bosanski (BS) kao default.
 * Za budući engleski (EN) dodati prevode i odabir locale preko env/headers.
 */
export const BS = {
  auth: {
    invalidCredentials: 'Pogrešno korisničko ime ili lozinka.',
    emailTaken: 'Email je već u upotrebi.',
    usernameTaken: 'Korisničko ime je već u upotrebi.',
    accountDisabled: 'Nalog je deaktiviran.',
    loginRequired: 'Niste prijavljeni.',
  },
  validation: {
    passwordMinLength: 'Lozinka mora imati najmanje 8 karaktera.',
    fileRequired: 'Nijedna datoteka nije poslata.',
    fileTypeNotAllowed: 'Tip datoteke nije dozvoljen.',
  },
  common: {
    forbidden: 'Nemate dozvolu.',
    forbiddenAction: 'Nemate dozvolu za ovu radnju.',
  },
} as const;

export type Locale = 'bs' | 'en';
export const DEFAULT_LOCALE: Locale = 'bs';
