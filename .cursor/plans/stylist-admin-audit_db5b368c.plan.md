---
name: stylist-admin-audit
overview: Fix stylist specialization update crash by widening DB column, improve admin UX for stylist service selection, and implement role rules + user list grouping including auto-creating pending stylist profiles when STYLIST role is assigned.
todos:
  - id: db-specialization-text
    content: Change `StylistProfile.specialization` to `@db.Text` and generate Prisma migration.
    status: completed
  - id: db-stylist-status
    content: Add `StylistProfile.status` (PENDING/ACTIVE) with migration and defaults.
    status: completed
  - id: backend-role-rules
    content: Enforce CLIENT cannot be removed; ensure CLIENT baseline role; update create user accordingly.
    status: completed
  - id: backend-assign-stylist
    content: Allow assigning STYLIST role and auto-create pending stylist profile.
    status: completed
  - id: ui-stylists-services-sync
    content: Fix admin Stylists page to preload selected services in edit and improve specialization display.
    status: completed
  - id: ui-users-default-client
    content: Update create-user flow to default CLIENT and remove role selection.
    status: completed
  - id: ui-users-role-constraints
    content: Disallow removing CLIENT in UI and add STYLIST to assignable roles with new flow.
    status: completed
  - id: ui-users-grouped-sections
    content: Render SYSTEM_ADMIN and STYLIST users in separate cards/sections from the rest.
    status: completed
isProject: false
---

## Scope

- Backend: Prisma schema + migrations, users role assignment/removal rules, and automatic pending stylist profile creation.
- Frontend (Admin): Stylists page specialization/service selection UX, Users page create-user default role + role rules, and grouped user lists.

## Findings (current behavior)

- `StylistProfile.specialization` is `String?` in Prisma, so MySQL defaults to a short `VARCHAR` and fails when admin UI builds a long comma-separated list of service names.
- Admin `Stylists` page (`frontend/src/pages/Stylists.tsx`) sets `specialization` by joining selected service names into a single string, and **edit mode does not pre-check** the services because `form.serviceIds` is initialized to `[]`.
- Backend forbids manual STYLIST role assignment/removal in `UsersService.assignRole/removeRole`.

## Backend changes

- Update Prisma schema to widen specialization:
  - In `[backend/prisma/schema.prisma](backend/prisma/schema.prisma)` change `StylistProfile.specialization String?` to `String? @db.Text` (or `@db.LongText` if you prefer no practical limit).
  - Create a Prisma migration (MySQL) that alters `stylist_profiles.specialization` to `TEXT`.
- Enforce base role CLIENT and role constraints:
  - In `[backend/src/users/users.service.ts](backend/src/users/users.service.ts)`:
    - **Create user**: always assign `CLIENT` role in addition to any other selected role (and simplify so creation can default to CLIENT).
    - **Remove role**: block removing `CLIENT` (throw `BadRequestException`).
- Allow assigning STYLIST via users list and auto-create pending stylist profile:
  - Add `status` to `StylistProfile`:
    - In `[backend/prisma/schema.prisma](backend/prisma/schema.prisma)` add an enum, e.g. `enum StylistProfileStatus { PENDING ACTIVE }` and a field `status StylistProfileStatus @default(PENDING)`.
    - Add migration to add `status` column with default `PENDING`.
  - In `[backend/src/users/users.service.ts](backend/src/users/users.service.ts)` update `assignRole`:
    - If `dto.role === 'STYLIST'`:
      - Add `STYLIST` userRole (if missing).
      - Create `stylistProfile` for that `userId` if missing with `{ status: PENDING, isActive: false }` (or keep `isActive` true but filter by status in UI; recommended: `isActive: false` until completed).
      - Return updated user.
  - Update `removeRole`:
    - If removing `STYLIST`, either:
      - block removal and require stylists module action (current behavior), **or**
      - allow removal and also delete/deactivate stylist profile. (I’ll implement the safer rule: block removal in users list, but once we introduce pending creation from role assignment, we should also provide a clear action path in Stylists module to complete or remove.)

## Frontend (Admin UI) changes

- Fix specialization/service selection UX in `[frontend/src/pages/Stylists.tsx](frontend/src/pages/Stylists.tsx)`:
  - On edit, load stylist’s existing services (`GET /api/stylists/:id/services`) and set `form.serviceIds` so checkboxes reflect current state.
  - Stop using `specialization` as a long concatenated string;
    - Keep `specialization` as optional free-text (small) or computed preview.
    - For display, derive a short summary from selected services (e.g. first 3 names + “+N”).
  - In the “odaberite servise” list:
    - Ensure already-selected services show as checked.
    - Optionally hide selected services from the list (your requested variant) and show them as “Odabrano” chips above.
- User creation default role CLIENT in `[frontend/src/pages/Users.tsx](frontend/src/pages/Users.tsx)`:
  - Remove role dropdown from Create User modal and always send `role: 'CLIENT'`.
  - Keep the “+” role assignment menu for adding extra roles after creation.
- Role removal rules in `[frontend/src/pages/Users.tsx](frontend/src/pages/Users.tsx)`:
  - Disallow removing `CLIENT` tag (no close button).
  - Allow removing other roles per backend rules.
- Group users into cards/sections:
  - In `[frontend/src/pages/Users.tsx](frontend/src/pages/Users.tsx)` render 3 sections:
    - SYSTEM_ADMIN users
    - STYLIST users
    - All other users
  - Each section uses the same row/card component, just filtered.
- Assigning STYLIST role from Users list:
  - Include `STYLIST` in assignable roles list.
  - After assigning, show a toast like “Stilist kreiran (pending). Završite profil u Stylists.” and optionally provide a quick link to Stylists page.

## Data flow (new)

```mermaid
flowchart TD
  AdminUserList -->|POST api/users/:id/roles {role:STYLIST}| UsersController
  UsersController --> UsersService
  UsersService -->|create userRole STYLIST| Prisma
  UsersService -->|create stylistProfile status=PENDING| Prisma
  AdminStylistsPage -->|GET api/stylists| StylistsController
  AdminStylistsPage -->|PATCH api/stylists/:id + POST services| StylistsController
  StylistsController --> StylistsService
```



## Test plan

- Backend
  - Update a stylist with many services selected; `PATCH /api/stylists/:id` must not 500.
  - Try removing `CLIENT` role via API; must return 400.
  - Assign `STYLIST` role via API; stylist profile should be created with `PENDING` status.
- Frontend
  - Edit stylist and verify previously selected services are checked.
  - Create user without choosing role; user is created as CLIENT.
  - In user list, CLIENT tag can’t be removed; other roles can.
  - Users page shows 3 sections and counts look right.
  - Assign STYLIST from users list and confirm stylist appears in Stylists page as pending and can be completed.
