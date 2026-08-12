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
| remote > local, !force, local ≥ min | Da (Kasnije / Ažuriraj) | Ne | Na Ažuriraj | Nakon SHA-256 |
| forceUpdate=true | Ne | Da | Da | Nakon SHA-256 |
| local < minSupportedVersionCode | Ne | Da | Da | Nakon SHA-256 |
| SHA-256 mismatch | — | — | Obriši fajl, error | Nikad |
| Download fail (soft) | Dismiss | — | — | — |
| Download fail (force) | — | Retry | — | — |
| iOS / web | Nema checka | — | — | — |

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
