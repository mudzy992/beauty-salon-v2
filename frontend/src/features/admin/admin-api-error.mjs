const SIMPLE_ERRORS = new Map([
  ['Korisnik nije pronađen.', 'users.errors.notFound'],
  ['Korisničko ime je već u upotrebi.', 'users.errors.usernameTaken'],
  ['Email je već u upotrebi.', 'users.errors.emailTaken'],
  ['Spol je obavezan.', 'users.errors.genderRequired'],
  ['Spol je obavezan za klijente.', 'users.validation.genderRequiredForClients'],
  ['Korisničko ime nije validno.', 'users.errors.usernameInvalid'],
  ['Rola je obavezna.', 'users.errors.roleRequired'],
  ['Korisnik nema tu rol u.', 'users.errors.roleNotAssigned'],
  ['Korisnik nema profil stiliste.', 'users.errors.noStylistProfile'],
  ['Nedostaje targetStylistProfileId.', 'users.errors.targetRequired'],
  ['Target stilist ne može biti isti stilist.', 'users.errors.targetSame'],
  ['Target stilist nije pronađen.', 'users.errors.targetNotFound'],
  ['Rolu Client nije moguće ukloniti.', 'users.errors.clientRoleCannotRemove'],
  [
    'Rolu Stilist uklanjate kroz posebnu akciju (remove-stylist-role) zbog vezanih podataka.',
    'users.errors.stylistUseRemovalFlow',
  ],
  ['Dug nije pronađen.', 'users.errors.debtNotFound'],
  ['Dug je već zatvoren.', 'users.errors.debtClosed'],
  ['Dug je u međuvremenu zatvoren.', 'users.errors.debtClosed'],
  ['Morate unijeti razlog otpisa duga.', 'users.errors.writeOffReasonRequired'],
  [
    'Otpis duga može izvršiti samo vlasnik ili administrator.',
    'users.errors.writeOffPermission',
  ],
  ['Nemate dozvolu.', 'users.errors.permissionDenied'],
  ['Nemate dozvolu za ovu radnju.', 'users.errors.permissionDenied'],
  ['Nemate dozvolu za pregled ovog korisnika.', 'users.errors.permissionDenied'],
  ['Nemate dozvolu za izmjenu ovog korisnika.', 'users.errors.permissionDenied'],
  ['Nemate dozvolu za izmjenu ovog profila.', 'stylists.errors.permissionDenied'],
  ['Samo administrator ili vlasnik.', 'users.errors.permissionDenied'],
  ['Stilist nije pronađen.', 'stylists.errors.notFound'],
  ['Korisnik već ima profil stilista.', 'stylists.errors.alreadyExists'],
  ['Datum mora biti validan YYYY-MM-DD.', 'stylists.errors.invalidHireDate'],
  [
    'Raspon servisa stiliste prelazi dozvoljeni limit.',
    'stylists.errors.serviceRangeLimit',
  ],
  [
    'Raspon kataloga stilista prelazi dozvoljeni limit.',
    'stylists.errors.catalogRangeLimit',
  ],
])

export const resolveAdminApiErrorKey = (message, fallbackKey) => {
  if (typeof message !== 'string') return fallbackKey
  const normalized = message.trim()
  const knownKey = SIMPLE_ERRORS.get(normalized)
  if (knownKey) return knownKey
  if (/^Rola .+ nije pronađena\.$/.test(normalized)) {
    return 'users.errors.roleNotFound'
  }
  return fallbackKey
}
