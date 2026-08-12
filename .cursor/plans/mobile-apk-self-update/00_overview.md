# Mobile APK Self-Update — Overview

Android sideload in-app update for Beauty Salon Nejra mobile (Expo SDK 55).

## Goal

Admin uploads/publishes APK; mobile checks version on launch; soft or force update; download + SHA-256 verify + install intent.

## Decisions

- Android only; soft by default; force when `forceUpdate` or `local < minSupportedVersionCode`
- Prisma `AppRelease` + dedicated upload (100 MB), not generic uploads (10 MB)
- Matrix: `.cursor/docs/matrices/mobile-apk-update/`

## Phases

1. Backend schema + API + matrix
2. Admin web UI
3. Mobile client
4. Plan docs / runbook (this folder)

## Release runbook

1. Bump `version` + `android.versionCode` in `mobile/app.config.js`
2. EAS build APK (`preview` or `production`)
3. Admin → Mobilni release → upload APK → set metadata → Publish
4. Install on device / open app → soft or force prompt → install
5. Confirm same signing keystore as previous APK
