# Mobile APK Update Matrix

Android sideload self-update (nema Play Store). iOS van opsega.

## Statusi release-a

| Status | Opis |
|--------|------|
| DRAFT | Metadata/APK postoji; nije vidljiv mobilnom clientu |
| PUBLISHED | Kandidat za `latest` |
| RETIRED | Zamijenjen; nije `latest` |

**Latest pravilo:** `latest` = red s maksimalnim `versionCode` gdje `platform=ANDROID` i `status=PUBLISHED`.  
Pri publish novog release-a svi ostali PUBLISHED za isti platform → RETIRED.

## Polja

| Polje | Tip | Pravilo |
|-------|-----|---------|
| platform | enum ANDROID | samo Android u v1 |
| version | semver string | prikaz u UI |
| versionCode | int, unique per platform | jedini kriterij “novije” |
| minSupportedVersionCode | int | `local < min` ⇒ force |
| forceUpdate | bool | true ⇒ force |
| apkPath | relative path | servira se `/uploads/{apkPath}` |
| apkSha256 | hex | obavezna verifikacija prije install |
| apkSizeBytes | int | progress / sanity |
| releaseNotes | text | dijalog |
| status | DRAFT/PUBLISHED/RETIRED | vidi gore |

## Client odluke

| Uvjet | Soft dijalog | Force wall | Download | Install |
|-------|--------------|------------|----------|---------|
| remote.versionCode ≤ local | Ne | Ne | Ne | Ne |
| remote > local, !force, local ≥ min | Da (isti modal: Kasnije / Ažuriraj) | Ne | Na Ažuriraj, modal ostaje | Nakon SHA-256 + poruka korisniku |
| forceUpdate=true | Ne | Da | Na Ažuriraj, modal ostaje | Nakon SHA-256 + poruka korisniku |
| local < minSupportedVersionCode | Ne | Da | Na Ažuriraj, modal ostaje | Nakon SHA-256 + poruka korisniku |
| SHA-256 mismatch | — | — | Obriši fajl, error | Nikad |
| Download fail (soft) | Modal ostaje, Retry | — | — | — |
| Download fail (force) | — | Retry | — | — |
| Nakon 100% downloada | — | — | SHA-256 verify (može potrajati) | Android installer intent |
| iOS / web | Nema checka | — | — | — |

Soft Ažuriraj **ne** koristi sistemski Alert (Alert se zatvori pa download ne krene pouzdano). Soft i force dijele isti in-app modal.

Nakon 100% UI prelazi na „provjera“ pa „instalacija“ dok se hash i installer ne pokrenu — korisnik ne treba zatvarati app.

## Soft throttle

- Soft prompt: max 1× po kalendarskom danu (SecureStore), osim ručnog “Provjeri ažuriranja”.
- Force: na svakom cold startu dok se app ne ažurira.

## Auth

| Akcija | Auth |
|--------|------|
| GET /api/public/app-releases/android/latest | Public |
| Admin CRUD + upload APK | JWT + SYSTEM_ADMIN \| OWNER |
| Download APK fajla | Javni static `/uploads/...`; integrity = SHA-256 |

## Sigurnost

- HTTPS u produkciji.
- APK MIME: `application/vnd.android.package-archive` ili `application/octet-stream` + `.apk`.
- Upload limit 100 MB (dedicated endpoint; generic upload ostaje 10 MB).
- Isti signing keystore na svim APK-ovima (operativno).
