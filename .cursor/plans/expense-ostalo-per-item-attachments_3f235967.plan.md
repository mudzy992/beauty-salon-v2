---
name: expense-ostalo-per-item-attachments
overview: Omogućiti unos proizvoljnih rashoda (npr. kategorija “Ostalo”) bez predefinisanih template stavki, uz opcioni prilog po svakoj stavci + opcioni generalni prilog na nivou rashoda, koristeći postojeću `requiresAttachmentPerItem` zastavicu i postojeći `ExpenseAttachment` model (bez migracije baze).
todos:
  - id: extend-variable-expense-create-form
    content: U `expense-books-tab.tsx` dodati prilog-po-stavci UI za varijabilne `lineItems` kada `selectedCategory.template.requiresAttachmentPerItem`.
    status: completed
  - id: render-variable-expense-details
    content: U `view === 'expense'` dodati prikaz varijabilnih stavki iz `notes` + mapiranje i akcije za priloge po stavci.
    status: completed
  - id: clarify-template-flag-copy
    content: U `expense-categories-tab.tsx` razjasniti tekst da `requiresAttachmentPerItem` znači ‘prilog po stavci’ i za varijabilne rashode (npr. Ostalo) kada je uključeno.
    status: completed
isProject: false
---

# Plan: “Ostalo” rashod (proizvoljne stavke + prilog po stavci)

## Cilj
U KUF (rashodi) omogućiti unos rashoda koji nije vezan za predefinisane template stavke, tako da korisnik može:
- izabrati kategoriju “Ostalo” (ili bilo koju varijabilnu kategoriju) i dodati proizvoljne stavke (naziv, količina, cijena)
- opcionalno dodati **0/1 prilog po stavci**
- opcionalno dodati **generalni prilog** za cijeli rashod (npr. skenirana faktura)
- u detaljima rashoda vidjeti mapirane priloge po stavci i moći dodati/zamijeniti/obrisati prilog

## Trenutno stanje (ključni nalazi)
- Kreiranje rashoda u UI već razlikuje:
  - **fiksno** (`category.isFixed=true`): koristi `template.fields` i već podržava `template.requiresAttachmentPerItem` za prilog po field-u.
  - **varijabilno** (`isFixed=false`): koristi `lineItems` (naziv/količina/cijena), a prilozi su trenutno samo “na rashod” (lista uploadova) bez per-item UI.
  - Izvor: `[frontend/src/features/finance/tabs/expense-books-tab.tsx](frontend/src/features/finance/tabs/expense-books-tab.tsx)`.
- Backend `POST /api/expenses` već prihvata `attachmentUploadIds: string[]` i kreira `ExpenseAttachment` redove; nema potrebe za novim endpointima.
  - Izvor: `[backend/src/finance/dto/create-expense.dto.ts](backend/src/finance/dto/create-expense.dto.ts)`, `[backend/src/finance/expenses.service.ts](backend/src/finance/expenses.service.ts)`.
- `ExpenseCategoryTemplate.requiresAttachmentPerItem` postoji u bazi i već se koristi za fiksne doprinose.
  - Izvor: `[backend/prisma/schema.prisma](backend/prisma/schema.prisma)`.

## Dizajn odluka (zaključano)
- Koristimo postojeći varijabilni flow (lineItems) i dodajemo **opcionalni prilog po stavci** + opcionalni generalni prilog.
- Ne uvodimo novu kolonu/relaciju (nema migracije). Mapiranje priloga na stavke radimo **best-effort** preko imena fajla (već postoje helperi `normalizeForMatch`, `findAttachmentForField` u `expense-books-tab.tsx`).

## Predložene promjene

### 1) Konvencija mapiranja priloga ↔ stavka (bez DB promjena)
- Kada uploadamo prilog za određenu stavku `lineItems[i].name`, frontend preimenuje fajl na osnovu stavke (sanitizovan prefix), npr. `struja.pdf`, `knjigovodstvo.jpg`.
- Pri prikazu, stavka traži attachment čiji `upload.originalName` sadrži naziv stavke (normalizovano), isto kao što već radi `findAttachmentForField` za fiksne stavke.

### 2) UI: “Novi Rashod” (varijabilno) dobija prilog po stavci
U `[frontend/src/features/finance/tabs/expense-books-tab.tsx](frontend/src/features/finance/tabs/expense-books-tab.tsx)` u dijelu gdje se renderuje varijabilni unos (`!selectedCategory.isFixed`):
- Dodati kolonu/sekciju u tabeli stavki: **Prilog**.
  - Dugme “Dodaj prilog” otvara file picker, uploaduje na `POST /api/uploads`, i upisuje uploadId u listu `attachmentUploadIds`.
  - U prikazu stavke, nakon što postoji attachment match, pokazati: badge sa imenom + “Preuzmi” + “Zamijeni” + “Obriši” (za još ne-snimljen rashod “Obriši” samo uklanja iz local liste).
- Generalni prilozi ostaju kao sada (lista na dnu) i tretiraju se kao “na rashod”.
- Feature gating: prikaz per-item priloga samo kada `selectedCategory.template?.requiresAttachmentPerItem === true` (tako “Ostalo” možemo uključiti preko template flag-a).

### 3) UI: detalji rashoda (view `expense`) za varijabilne rashode
U istom fajlu, u `view === 'expense'`:
- Za varijabilne rashode (nema `fieldValues`, ili `category.isFixed=false`) parsirati `selectedExpense.notes` kao JSON i izvući `lineItems`.
  - Trenutno se na kreiranju već sprema `notes: JSON.stringify({ lineItems, userNotes })`.
- Renderovati tabelu stavki iz `lineItems` i za svaku stavku prikazati mapirani prilog (preko `findAttachmentForField`/nove varijante koja radi sa stavka `name`).
- Omogućiti add/replace/delete priloga po stavci koristeći postojeće rute:
  - `POST /api/expenses/:id/attachments`
  - `DELETE /api/expenses/:id/attachments/:attachmentId`
  (ove rute već postoje u backend servisu i koriste se u `expense-books-tab.tsx`).

### 4) “Ostalo” kao kategorija
- Ne diramo šemu.
- “Ostalo” se definiše kao `ExpenseCategory` sa `isFixed=false`, i template-om gdje je `requiresAttachmentPerItem=true`.
  - To se može uraditi kroz postojeći admin ekran kategorija/šablona (`ExpenseCategoriesTab`) bez koda, ali ćemo u UI tekstovima razjasniti da “Prilog po stavci” vrijedi i za varijabilne rashode kad je uključeno.

## Scope fajlova
- Frontend:
  - `[frontend/src/features/finance/tabs/expense-books-tab.tsx](frontend/src/features/finance/tabs/expense-books-tab.tsx)` (glavna implementacija)
  - (po potrebi) `[frontend/src/features/finance/tabs/expense-categories-tab.tsx](frontend/src/features/finance/tabs/expense-categories-tab.tsx)` (samo copy/tekstualno razjašnjenje opisnih stringova)
- Backend: **nema promjena** planirano (API već podržava attachments i `CreateExpenseDto.attachmentUploadIds`).

## Test plan
- U adminu kreirati template za “Ostalo” sa uključenim “Prilog po stavci”, i kategoriju “Ostalo” (`isFixed=false`).
- U otključanoj knjizi rashoda klik “Novi Rashod” → izabrati “Ostalo” → dodati 2 stavke, na jednu dodati prilog → Sačuvaj.
- Otvoriti detalje rashoda → provjeriti:
  - prikaz `lineItems`
  - prilog mapiran uz tačnu stavku
  - Zamijeni/Obriši rade i refreshuju detalj
- Dodati i generalni prilog (na rashod) i potvrditi da i dalje radi.
- Zaključati knjigu → provjeriti da su akcije (upload/replace/delete) disabled i backend odbija izmjene.
