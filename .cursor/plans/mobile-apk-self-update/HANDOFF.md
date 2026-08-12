# HANDOFF — Mobile APK Self-Update

## Done

- Backend `AppRelease` + public latest + admin CRUD/upload
- Admin UI `/admin/app-releases`
- Mobile check/download/SHA-256/install + profile manual check
- Matrix under `.cursor/docs/matrices/mobile-apk-update/`

## Decisions

- Soft default; force via flag or minSupportedVersionCode
- Dedicated APK upload (100 MB), SHA-256 integrity
- Streaming JS SHA-256 on device (chunked base64 reads)

## Open / next

- Device E2E with real EAS APK
- Bump `versionCode` on every native release
- Same Android signing keystore required for updates to install over previous build

## Test status

- Backend unit tests: `app-releases.service.spec.ts` passed
- Full device install flow not run in this session
