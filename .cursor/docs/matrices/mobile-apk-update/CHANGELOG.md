# Mobile APK Update — Changelog

## 2026-08-18

- Soft update: isti in-app modal kao force (Kasnije / Ažuriraj); Alert uklonjen jer se zatvori i download ne krene.
- Nakon 100% downloada UI pokazuje provjeru SHA-256 pa otvaranje instalacije, da korisnik ne izađe.

## 2026-08-14

- `mobile-release-notes.mdc`: draft se ažurira na kraju UX taska (ista tema = update linije); bump `version`/`versionCode` samo kad commit/push ide u APK build.

## 2026-08-13

- Projektno pravilo `mobile-release-notes.mdc`: agent automatski održava `mobile/RELEASE_NOTES.draft.md` za polje „Napomene za korisnike“ pri UX izmjenama.

## 2026-08-12

- Inicijalna matrica: DRAFT/PUBLISHED/RETIRED, versionCode usporedba, soft vs force, SHA-256, public latest + admin CRUD.
