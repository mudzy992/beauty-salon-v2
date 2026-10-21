---
name: Client analytics manual income backfill
overview: U analitici klijenta prikazati i statistički uračunati ručne prihode unesene kroz knjige prihoda (`IncomeBookManualEntry` sa `clientId`), uz zadržavanje postojećih izvora iz dnevne knjige (`DailyLogEntry`).
todos:
  - id: backend-client-analytics-merge-manual-income
    content: Proširiti `UsersService.getClientAnalytics` da uključuje `IncomeBookManualEntry` za `clientId`, mapira u FE shape, spaja sa `DailyLogEntry` i ažurira stats/topServices.
    status: completed
  - id: backend-client-analytics-tests
    content: Dodati/izmijeniti testove za `UsersService.getClientAnalytics` pokrivajući `IncomeBookManualEntry` + spajanje izvora.
    status: completed
isProject: false
---

## Problem
Frontend `ClientAnalytics` (`/admin/client-analytics?userId=...`) prikazuje **Manuelni unosi 0** jer backend endpoint `GET /api/users/:id/analytics` trenutno puni `manualEntries` samo iz `DailyLogEntry` (`repo.dailyLogEntry.findMany`), dok su ručni prihodi uneseni kroz knjigu prihoda zapisani u `IncomeBookManualEntry`.

Relevantno:
- FE očekuje `manualEntries: ManualEntry[]` sa poljima `actualPrice`, `tipAmount`, `isManual`, `notes`, `status`, `service`, `stylistProfile` u [frontend/src/pages/ClientAnalytics.tsx](../../frontend/src/pages/ClientAnalytics.tsx).
- Backend trenutno vraća `manualEntries` iz `DailyLogEntry` u [backend/src/users/users.service.ts](../../backend/src/users/users.service.ts) (vidi `getClientAnalytics`).

## Cilj
- U `getClientAnalytics` uključiti i `IncomeBookManualEntry` zapise gdje je `clientId = userId` (uz isti `fromDate/toDate` filter).
- **Spojiti** izvore (DailyLog + IncomeBookManualEntry) u jedinstven `manualEntries` array, sortirati po datumu silazno.
- Ažurirati statistike:
  - `manualEntryCount`
  - `manualSpent`
  - `totalSpent`
  - `topServices` agregaciju (da i knjiga-ručni unosi ulaze)

## Backend izmjene
### 1) Proširi `getClientAnalytics` da čita i iz `IncomeBookManualEntry`
- Fajl: [backend/src/users/users.service.ts](../../backend/src/users/users.service.ts)
- U `Promise.all` dodati dodatni upit:
  - `incomeBookManualEntry.findMany({ where: { clientId: userId, date: { gte/lte } }, include: { service: { select: { id,name,price } }, stylistProfile: { include: { user: { select: { firstName,lastName,username } } } } }, orderBy: { date: 'desc' } })`
- Mapirati svaku manual-income stavku u shape koji FE već očekuje:
  - `actualPrice = amount`
  - `tipAmount` ostaje
  - `isManual = true`
  - `status = 'COMPLETED'` (ili drugi dogovoreni konstantan status)
  - `notes` ostaje

### 2) Spoji izvore i recalculations
- Spojiti postojeće `dailyLogEntry` rezultate (koji već imaju `actualPrice`, `tipAmount`, `isManual`, `status`, `notes`) + mapirane `IncomeBookManualEntry` rezultate.
- Računati `manualSpent` kao sumu `actualPrice` iz spojenog niza.
- U `serviceCounts` petlji dodati i `IncomeBookManualEntry` (preko mapiranog niza ili zasebno) da `topServices` bude tačan.

### 3) Testovi
- Dodati/izmijeniti unit test za `UsersService.getClientAnalytics` (ili service test) koji potvrđuje da:
  - `manualEntryCount` i `manualSpent` rastu kada postoji `IncomeBookManualEntry` za `clientId`
  - `manualEntries` sadrži i stavke iz oba izvora

## Frontend
- Ne bi trebalo mijenjati frontend, jer ćemo na backendu vratiti `manualEntries` u postojećem shape-u koji `ClientAnalytics.tsx` već renderuje.

## Test plan (ručno)
- Napraviti ručni prihod u knjizi sa odabranim klijentom.
- Otvoriti `/admin/client-analytics?userId=<taj_klijent>` i provjeriti:
  - `Manuelni unosi` broj > 0
  - stavka vidljiva u tabu “Manuelni prihodi” sa izvorom “Manuelno”.
