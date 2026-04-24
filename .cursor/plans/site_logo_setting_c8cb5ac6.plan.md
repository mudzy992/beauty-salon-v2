---
name: Site logo setting
overview: Add a configurable site logo in admin Settings, store it via existing uploads service, and render it across web/mobile with a safe fallback to the app title when logo is not set.
todos:
  - id: add-branding-settings
    content: Add Branding group keys `app_logo` (and `app_title`) to Settings page.
    status: completed
  - id: image-upload-ui
    content: Enhance image setting editor with file picker + upload to `/api/uploads` and store returned relative path.
    status: completed
  - id: web-logo-rendering
    content: Render logo-or-title across web (public header, admin header, other key occurrences).
    status: completed
  - id: mobile-hero-logo
    content: Update mobile Home hero to show logo only when `app_logo` exists, else keep hero title.
    status: completed
  - id: sanity-checks
    content: "Smoke-test flows: set logo, clear logo, relative vs absolute URL."
    status: completed
isProject: false
---

### Goal

- Add **site logo** management in web admin (`/admin/settings`) without removing existing settings.
- **Web**: when logo exists → show logo; otherwise show app name/title.
- **Mobile Home hero**: when logo exists → show **only the logo**; otherwise show existing hero title.

### What already exists (we will reuse)

- **Settings storage**: backend `GET/PUT /api/settings` backed by Prisma `appSetting`.
- **Uploads**: backend `POST /api/uploads` saves files and returns `{ pathOriginal, pathThumb, pathSmall, pathMedium }`; files are served under `/uploads/`.
- **URL helpers**: `frontend/src/utils/uploadUrl.ts` and mobile equivalents resolve relative upload paths into full URLs.

### Data design

- New setting key: `app_logo` (string)
  - Value will be the **relative upload path** returned by uploads (e.g. `branding/2026/03/logo-original.png`), or a full `http(s)` URL.
  - Empty / missing value means “no logo”.

### Backend changes

- **No schema changes needed**: `appSetting` already stores arbitrary keys.
- Ensure `/api/uploads` can be used from Settings UI with `entity=branding` (already supported via `@Body('entity')`).

### Frontend (web admin) changes

- Add a new group in `[frontend/src/pages/Settings.tsx](frontend/src/pages/Settings.tsx)`:
  - **Branding** section with at least:
    - `app_logo` (type `image`)
    - (optional but recommended since used already) `app_title` (type `text`)
- Upgrade the `image` editor UX:
  - Keep the existing URL input.
  - Add a **file picker + upload button** for `image` fields.
  - On upload success, set `value` to returned `pathOriginal` and preview via `getUploadUrl(value)`.

### Frontend (web public + admin UI rendering) changes

- Public header (`[frontend/src/layouts/PublicLayout.tsx](frontend/src/layouts/PublicLayout.tsx)`):
  - If `getSetting('app_logo', '')` is truthy → render `<Image src={getUploadUrl(logo)} ... />`.
  - Else render the existing heading `app_title` fallback.
- Admin header/breadcrumb (`[frontend/src/layouts/DashboardLayout.tsx](frontend/src/layouts/DashboardLayout.tsx)`):
  - Use `useSettings()` and apply the same logo-or-title logic for the breadcrumb “home” link.
- Any other “app title” occurrences found during implementation (e.g. footer mini title) should follow the same rule: logo if present, else title.

### Mobile changes

- Home hero (`[mobile/src/screens/client/HomeScreen.tsx](mobile/src/screens/client/HomeScreen.tsx)`):
  - Read `app_logo` from settings (same `/api/settings` response).
  - If logo exists:
    - Render an `expo-image` logo (using `getImageUrl(logo)` / `getUploadUrl`) centered.
    - Hide hero title + subtitle block (per requirement “samo logo”).
  - Else keep current hero title/subtitle rendering.

### Test plan

- Set `app_logo` via file upload in admin settings; refresh:
  - Web public header shows logo (title hidden).
  - Admin header shows logo.
  - Mobile home hero shows only logo.
- Remove/clear `app_logo` value:
  - Web falls back to app title everywhere.
  - Mobile hero falls back to hero title.
- Verify both relative paths and full URLs work.

### Files likely to change

- `[frontend/src/pages/Settings.tsx](frontend/src/pages/Settings.tsx)`
- `[frontend/src/layouts/PublicLayout.tsx](frontend/src/layouts/PublicLayout.tsx)`
- `[frontend/src/layouts/DashboardLayout.tsx](frontend/src/layouts/DashboardLayout.tsx)`
- `[mobile/src/screens/client/HomeScreen.tsx](mobile/src/screens/client/HomeScreen.tsx)`
