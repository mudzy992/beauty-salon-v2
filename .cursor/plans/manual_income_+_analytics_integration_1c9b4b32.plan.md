---
name: Manual income + analytics integration
overview: Omogućiti unos ručnih prihoda i za tekući mjesec (sa datumom unutar mjeseca knjige), omogućiti kreiranje knjige za proizvoljan mjesec u prošlosti i njeno popunjavanje, te uvezati ručne prihode sa generalnom analitikom, analitikom po stilisti i vezom prema klijentu.
todos:
  - id: allow-current-month-manual-income
    content: Relaxirati ograničenje u `IncomeBooksService` da manual entries mogu i u tekući mjesec (ne u budućnost), uz postojeće provjere zaključavanja i mjeseca datuma.
    status: completed
  - id: past-book-creation-validation
    content: Doraditi `getOrCreateForMonth`/controller validacije (month 1–12, zabrana budućih mjeseci) i po potrebi proširiti include shape.
    status: completed
  - id: analytics-top-services-manual
    content: Proširiti `AnalyticsService.getTopServices` da uključuje `IncomeBookManualEntry` (group by serviceId) u rasponu.
    status: completed
  - id: analytics-stylist-manual
    content: Proširiti `AnalyticsService.getStylistPerformance` da uključuje manual entries sa `stylistProfileId` i spoji agregate.
    status: completed
  - id: client-linkage-verification
    content: Provjeriti DB migracije/FK za `clientId` i osigurati da API response za knjigu vraća client podatke za manual entries.
    status: completed
  - id: tests
    content: Dodati/učvrstiti testove za IncomeBooksService i AnalyticsService pokrivajući manual entries u tekućem mjesecu i analytics agregacije.
    status: completed
isProject: false
---

## Cilj
- Dodati mogućnost unosa **ručnih prihoda** i u **tekućem mjesecu** (ne samo u prošlosti), uz postojeće pravilo da datum unosa mora pripadati mjesecu knjige.
- Omogućiti **kreiranje knjige prihoda za proizvoljan mjesec** (pojedinačno), uključujući prošlost, i njeno popunjavanje ručnim stavkama.
- Uvezati ručne prihode sa:
  - **generalnom analitikom** (mjesečni finance već koristi `IncomeBook.totalRevenue/totalTips`, ali provjeriti i ostale agregacije)
  - **analitikom po stilisti** (trenutno računa samo iz `DailyLogEntry`)
  - **vezom prema klijentu** (manual entry već ima `clientId`; osigurati da se koristi u prikazima/analitikama gdje treba)

## Šta je već u kodu (bitno za implementaciju)
- Prisma modeli već postoje: `IncomeBookManualEntry` ima `date`, `serviceId`, `stylistProfileId?`, `clientId?`, `amount`, `tipAmount` i audit.
- Totali knjige već sabiraju auto + manual (`IncomeBooksService.recalculateTotals`).
- Generalna analitika mjesečni income/tips čita iz `incomeBook.totalRevenue/totalTips` u `AnalyticsService.getDashboard`.
- Analitika po stilisti (`getStylistPerformance`) trenutno koristi samo `dailyLogEntry`.

## Backend promjene (predloženo)
### 1) Dozvoli ručne prihode i za tekući mjesec
- Fajl: [backend/src/finance/income-books.service.ts](backend/src/finance/income-books.service.ts)
- Promjena: u `createManualEntry` i relevantnim update/delete metodama ukloniti/izmijeniti restrikciju:
  - trenutno: `if (!this.isPastMonth(book.year, book.month)) throw ...`
  - novo: dozvoli ako je mjesec **<= trenutni mjesec** (ne dozvoliti buduće knjige), uz postojeće `ensureDateMatchesBookMonth`.
- Zadržati pravilo zaključavanja: ne može se dodavati u zaključanu knjigu (`closedAt`), a za knjige u prošlosti je i dalje potreban `unlock`.

### 2) Kreiranje knjiga u prošlosti (pojedinačno)
- Fajl: [backend/src/finance/income.controller.ts](backend/src/finance/income.controller.ts)
- `GET /api/income-books/month/:year/:month` već radi `getOrCreateForMonth`.
- Doraditi `IncomeBooksService.getOrCreateForMonth` da:
  - validira `year/month` raspon (1–12)
  - po potrebi popuni `include` tako da UI odmah dobije i `manualEntries`/`lockEvents` (ili ostaviti `findOne` za detalje, zavisno od FE)
  - opcionalno: zabrani kreiranje za budući mjesec (da ne “otvara” buduće knjige slučajno)

### 3) Uvezivanje ručnih prihoda sa generalnom analitikom
- Fajl: [backend/src/analytics/analytics.service.ts](backend/src/analytics/analytics.service.ts)
- `monthlyFinance` je već pokriven preko `incomeBook.totalRevenue/totalTips`.
- Provjeriti i dopuniti ostale dijelove dashboard-a koji zavise od “izvora prihoda”, posebno:
  - `getTopServices(fromDate, toDate)`: proširiti da uključuje `IncomeBookManualEntry` (group by `serviceId`) u datom rasponu

### 4) Uvezivanje analitike po stilisti sa manualnim prihodima
- Fajl: [backend/src/analytics/analytics.service.ts](backend/src/analytics/analytics.service.ts)
- U `getStylistPerformance(fromDate,toDate)`:
  - zadržati postojeće agregacije iz `DailyLogEntry`
  - dodati agregaciju iz `IncomeBookManualEntry` gdje je `stylistProfileId != null` i `date` u rasponu
  - spojiti rezultate po `stylistProfileId` (revenue/tips/count) tako da ukupna analitika po stilisti uključuje i ručne prihode

### 5) Prihode unutar knjiga uvezati sa klijentima
- Prisma već ima `clientId` i relaciju `client` na `User`.
- Provjeriti da migracije imaju i FK za `client_id` (po potrebi dodati novu migraciju ako je schema ispred DB-a).
- Osigurati da API `findOne` već vraća `manualEntries.client` (trenutno vraća select), što je dovoljno za prikaz u knjizi i kasnije filtriranje/analitiku.

## Minimalni test plan
- Unit test (ili service test) za `IncomeBooksService.createManualEntry`:
  - dozvoljava unos u tekući mjesec (otključana/otvorena knjiga)
  - odbija unos u budući mjesec
  - odbija unos u zaključanu knjigu
  - odbija datum koji ne pripada mjesecu knjige
- Service test za `AnalyticsService.getDashboard`:
  - `stylistPerformance` sada uključuje i manual entry sa `stylistProfileId`
  - `topServices` uključuje i manual entry

## Rizici i napomene
- Potrebno je jasno definisati “count” u stylistPerformance: trenutno je `completedCount` broj `DailyLogEntry` stavki; sa manual entries predlažem da se i one broje u isti counter (ili dodati novi field). U implementaciji ću zadržati postojeći shape API-ja i povećati `completedCount` za manual entries, osim ako želiš drugačije.
