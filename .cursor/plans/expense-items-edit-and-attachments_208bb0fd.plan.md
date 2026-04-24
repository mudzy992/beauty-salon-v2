---
name: expense-items-edit-and-attachments
overview: Omogućiti izmjenu postojećih fiksnih stavki rashoda i upravljanje prilozima (dodaj/izmijeni) uz jasnu vezu prilog↔stavka, bez promjene baze (mapiranje preko naziva fajla).
todos:
  - id: research-current-expense-detail-ui
    content: U `expense-books-tab.tsx` dodati edit state i UI za izmjenu `fieldValues` + save/cancel flow preko `PATCH /api/expenses/:id`.
    status: completed
  - id: backend-expense-attachments-api
    content: Implementirati `POST /api/expenses/:id/attachments` i `DELETE /api/expenses/:id/attachments/:attachmentId` + DTO validaciju i zaštitu na zaključanu knjigu.
    status: completed
  - id: frontend-attachments-per-item-mapping
    content: U detaljima rashoda prikazati priloge uz stavke (filename matching), te dodati add/replace/delete akcije po stavci.
    status: completed
  - id: frontend-image-preview-dialog
    content: Dodati dialog za pregled slike (pathOriginal) kada je attachment image, dostupno iz liste priloga i per-stavka prikaza.
    status: completed
isProject: false
---

## Cilj
Na ekranu detalja rashoda (view `expense`) omogućiti:
- izmjenu vrijednosti stavki (`fieldValues`) i ukupnog iznosa
- dodavanje/izmjenu priloga po stavci (fiksne kategorije)
- prikaz priloga tako da se vidi kojoj stavci pripada (mapiranje preko imena fajla)
- pregled slike na webu (modal / lightbox), uz postojeći download

## Trenutno stanje (važni nalazi)
- Frontend detalji rashoda i prilozi su odvojeni i read-only.
  - Stavke se renderuju iz `selectedExpense.fieldValues` kao tabela.
  - Prilozi se renderuju iz `selectedExpense.attachments`, label je `att.upload?.originalName`.
  - Thumbnail se već prikazuje ako je slika (`.jpg|jpeg|png|gif|webp`) ali nema “preview” interakcije.
  - Izvor: `[frontend/src/features/finance/tabs/expense-books-tab.tsx](frontend/src/features/finance/tabs/expense-books-tab.tsx)`
- Backend ima `PATCH /api/expenses/:id` i već podržava update `fieldValues`, ali **ne** upravlja prilozima.
  - `[backend/src/finance/expenses.controller.ts](backend/src/finance/expenses.controller.ts)`
  - `[backend/src/finance/expenses.service.ts](backend/src/finance/expenses.service.ts)`
  - DTO: `[backend/src/finance/dto/update-expense.dto.ts](backend/src/finance/dto/update-expense.dto.ts)`
- Prisma model `ExpenseAttachment` već ima `description`, ali nema relaciju na stavku (nema `fieldId`).
  - `[backend/prisma/schema.prisma](backend/prisma/schema.prisma)`

## UX odluke (prema tvom odgovoru)
- Edit je dozvoljen **samo kada je knjiga otključana**.
- Mapiranje priloga uz stavke je **preko imena fajla** (filename convention), bez migracije baze.

## Predložena implementacija
### 1) Frontend: “Edit mode” za fiksne stavke u detaljima rashoda
- U `view === 'expense'` dodati stanje npr. `isEditingExpense`, `draftFieldValues`, `savingExpense`.
- Kada je knjiga otključana (`!selectedExpense.book?.isClosed` ili preko `selectedExpense.book.isClosed` iz backend response), prikazati dugme **Uredi**.
- U edit modu, u tabeli “Stavke” umjesto text vrijednosti prikazati `Input type="number"` (ili text ako treba), a na dnu **Sačuvaj** / **Odustani**.
- Sačuvaj radi `PATCH /api/expenses/:id` sa:
  - `fieldValues: [{ fieldId, value }]`
  - `totalAmount: sum(values)` (usklađeno sa postojećim backend očekivanjem)
- Nakon uspjeha refetch `GET /api/expenses/:id` i refresh UI.

### 2) Backend: API za dodavanje/brisanje priloga na postojeći rashod
Dodati u `ExpensesController` nove rute (i DTO-e):
- `POST /api/expenses/:id/attachments` body: `{ uploadId: string, description?: string }`
  - Validirati da knjiga nije zatvorena.
  - Kreirati `expenseAttachment`.
  - Vratiti `findOne(id)` (da frontend dobije osvježene priloge).
- `DELETE /api/expenses/:id/attachments/:attachmentId`
  - Validirati da knjiga nije zatvorena.
  - Obristi attachment (scope: `expenseId` + `attachmentId` radi sigurnosti).
  - Vratiti `findOne(id)`.

### 3) Frontend: mapiranje priloga na stavke (filename convention)
- U detaljima rashoda, za fiksne kategorije gdje template ima `requiresAttachmentPerItem`, prikazati priloge grupisano po stavci:
  - Za svaku stavku (`fieldValues[i].field.fieldName`) pronaći prilog čije `upload.originalName` sadrži normalizovani naziv stavke (case-insensitive, ukloniti dijakritike i specijalne znakove) ili sadrži ključne riječi (fallback)
  - UI prikaz: u redu stavke dodati sekciju “Prilog”:
    - ako postoji match: thumbnail/icon + **Pregled** (za slike) + **Preuzmi** + **Zamijeni** + **Obriši**
    - ako ne postoji: **Dodaj prilog**
- “Zamijeni” radi:
  - upload preko postojećeg `POST /api/uploads`
  - zatim `DELETE` starog attachment-a
  - pa `POST` novog attachment-a
- Napomena: pošto nema DB relacije, mapiranje može biti “best effort”; UI će jasno pokazati kad stavka nema prepoznat prilog.

### 4) Frontend: preview slika na webu
- Na attachment kartici (i u grupisanom prikazu) kada je `isImage`:
  - klik na thumbnail ili dugme **Pregled** otvara `Dialog` sa većom slikom (`pathOriginal`), uz **Preuzmi**.

### 5) Validacija i edge-case-ovi
- Onemogućiti edit/attachment akcije kada je knjiga zaključana.
- Ako `selectedExpense` iz `GET /api/expenses/:id` ne uključuje `book`, proširiti backend `findOne` include već ima `book: true` (već postoji) — frontend samo treba koristiti taj podatak.
- Ograničiti upload tipove po postojećem upload servisu (ne mijenjati sada).

## Test plan
- Otvoriti otključanu knjigu → otvoriti rashod (fixed) → promijeniti cijenu stavke → sačuvati → provjeriti da se `totalAmount` i tabela osvježe.
- Dodati prilog za stavku (slika) → provjeriti prikaz thumbnail + preview dialog + download.
- Zamijeniti prilog → provjeriti da se stari ukloni, novi prikaže.
- Zaključati knjigu → pokušati edit / dodavanje priloga → dugmad disabled i backend vraća grešku ako se pozove.
