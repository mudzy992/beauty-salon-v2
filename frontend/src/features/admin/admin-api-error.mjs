import { resolveApiErrorCodeKey } from '../api-errors/api-error-code-map.mjs'

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
  // ── reservations ──
  ['Neispravno vrijeme termina.', 'reservations.errors.invalidTime'],
  ['Nemate pristup listi svih rezervacija.', 'reservations.errors.listAccessDenied'],
  ['Nemate pristup rezervacijama stiliste.', 'reservations.errors.stylistListAccessDenied'],
  ['Nemate profil stilista.', 'reservations.errors.noStylistProfile'],
  ['Odabrani stilist ne može izvršiti sve odabrane usluge.', 'reservations.errors.stylistCannotPerformServices'],
  ['Parametri paginacije nisu validni.', 'reservations.errors.invalidPagination'],
  ['Rezervacija je istovremeno promijenjena. Osvježite podatke i pokušajte ponovo.', 'reservations.errors.concurrentChange'],
  ['Rezervacija mora biti potvrđena i zahtijevati potvrdu dolaska klijenta.', 'reservations.errors.attendanceRequiresConfirmation'],
  ['Rok za staff potvrdu dolaska je početak termina.', 'reservations.errors.staffAttendanceDeadline'],
  ['Salon nije konfigurisan.', 'reservations.errors.salonNotConfigured'],
  ['Samo admin ili vlasnik mogu pristupiti sažetku rezervacija.', 'reservations.errors.summaryAccessDenied'],
  ['Samo dodijeljeni stilist ili admin može potvrditi dolazak.', 'reservations.errors.attendancePermission'],
  ['Stilist je obavezan za direktnu rezervaciju.', 'reservations.errors.stylistRequired'],
  ['Stilist profil nije dostupan za ovaj račun.', 'reservations.errors.stylistProfileUnavailable'],
  ['Termin je istovremeno promijenjen. Osvježite rezervaciju i pokušajte ponovo.', 'reservations.errors.slotConcurrentChange'],
  ['Vrijeme završetka mora biti nakon početka.', 'reservations.errors.endBeforeStart'],
  ['fromDate i toDate moraju biti važeći datumi u formatu YYYY-MM-DD.', 'reservations.errors.invalidDateRange'],
  ['fromDate i toDate su obavezni.', 'reservations.errors.dateRangeRequired'],
  ['page i pageSize moraju biti navedeni zajedno.', 'reservations.errors.paginationPairRequired'],
  // ── appReleases ──
  ['APK putanja je promijenjena tokom objave.', 'appReleases.errors.apkPathChanged'],
  ['APK putanja nije validna.', 'appReleases.errors.apkPathInvalid'],
  ['Dozvoljen je samo validan APK fajl.', 'appReleases.errors.onlyApkAllowed'],
  ['Javna APK putanja nije validna.', 'appReleases.errors.publicApkPathInvalid'],
  ['Javna datoteka nije validan APK.', 'appReleases.errors.publicNotApk'],
  ['Javni APK fajl nije pronađen.', 'appReleases.errors.publicApkNotFound'],
  ['Kontrolni zbir javnog APK fajla nije ispravan.', 'appReleases.errors.publicChecksumMismatch'],
  ['Kontrolni zbir privatnog APK fajla nije ispravan.', 'appReleases.errors.privateChecksumMismatch'],
  ['Nijedna datoteka nije poslata.', 'appReleases.errors.noFileUploaded'],
  ['Privatna APK putanja nije validna.', 'appReleases.errors.privateApkPathInvalid'],
  ['Privatna datoteka nije validan APK.', 'appReleases.errors.privateNotApk'],
  ['Privatni APK fajl nije pronađen.', 'appReleases.errors.privateApkNotFound'],
  ['Release nije pronađen.', 'appReleases.errors.notFound'],
  // ── loyaltyAdmin ──
  ['Broj bodova je ispod minimalnog za korištenje.', 'loyaltyAdmin.errors.belowMinimum'],
  ['Broj bodova mora biti pozitivan cijeli broj.', 'loyaltyAdmin.errors.pointsPositiveInteger'],
  ['Idempotency key je već korišten za drugačiju loyalty transakciju.', 'loyaltyAdmin.errors.idempotencyConflict'],
  ['Ledger bodovi moraju biti cijeli broj.', 'loyaltyAdmin.errors.ledgerPointsInteger'],
  ['Loyalty idempotency key je obavezan.', 'loyaltyAdmin.errors.idempotencyRequired'],
  ['Loyalty račun nije aktivan.', 'loyaltyAdmin.errors.accountInactive'],
  ['Loyalty račun nije pronađen.', 'loyaltyAdmin.errors.accountNotFound'],
  ['Loyalty saldo je promijenjen tokom obrade; pokušajte ponovo.', 'loyaltyAdmin.errors.balanceConcurrentChange'],
  ['Nedovoljno bodova.', 'loyaltyAdmin.errors.insufficientPoints'],
  ['Promjena bodova mora biti cijeli broj.', 'loyaltyAdmin.errors.deltaInteger'],
  ['Promjena bodova mora biti različit od nule i cijeli broj.', 'loyaltyAdmin.errors.deltaNonZeroInteger'],
  ['Promjena bodova mora biti različita od nule.', 'loyaltyAdmin.errors.deltaNonZero'],
  ['Redeem je trenutno onemogućen.', 'loyaltyAdmin.errors.redeemDisabled'],
  ['Saldo prelazi dozvoljeni broj bodova.', 'loyaltyAdmin.errors.balanceCapExceeded'],
])

const OVERLAP_RE = /^Preklapanje sa drugim terminom \((\d{1,2}:\d{2})–(\d{1,2}:\d{2})\)\.$/
const DEADLINE_RE = /^Rok za potvrdu dolaska je istekao \(najkasnije (\d+)h prije termina\)\.$/

/**
 * Kao `resolveAdminApiErrorKey`, ali vraća i interpolacijske vrijednosti.
 *
 * Dvije serverske poruke nose podatke — preklapanje termina i rok za potvrdu dolaska —
 * pa sâm ključ nije dovoljan: pozivatelj mora proslijediti `values` u `t()`, inače se
 * `{{start}}`/`{{end}}`/`{{hours}}` prikažu doslovno.
 */
export const resolveAdminApiError = (message, fallbackKey, code) => {
  // Kod ima prednost: stabilan je i ne ovisi o formulaciji bosanske poruke.
  const byCode = resolveApiErrorCodeKey(code)
  if (byCode) return { key: byCode, values: undefined }
  if (typeof message !== 'string') return { key: fallbackKey, values: undefined }
  const normalized = message.trim()
  const knownKey = SIMPLE_ERRORS.get(normalized)
  if (knownKey) return { key: knownKey, values: undefined }
  if (/^Rola .+ nije pronađena\.$/.test(normalized)) {
    return { key: 'users.errors.roleNotFound', values: undefined }
  }
  const overlap = OVERLAP_RE.exec(normalized)
  if (overlap) {
    return {
      key: 'reservations.errors.slotOverlap',
      values: { start: overlap[1], end: overlap[2] },
    }
  }
  const deadline = DEADLINE_RE.exec(normalized)
  if (deadline) {
    return { key: 'reservations.errors.attendanceDeadline', values: { hours: deadline[1] } }
  }
  return { key: fallbackKey, values: undefined }
}

export const resolveAdminApiErrorKey = (message, fallbackKey, code) =>
  resolveAdminApiError(message, fallbackKey, code).key
