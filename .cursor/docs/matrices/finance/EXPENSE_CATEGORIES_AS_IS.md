# Expense Categories AS-IS (snapshot)

Datum: 2026-08-11. Rollback tačka prije modularnih kategorija rashoda.

## Modeli (Prisma)

| Model | Tabela | Bitna polja |
|-------|--------|-------------|
| `ExpenseCategoryTemplate` | `expense_category_templates` | `name`, `requiresAttachmentPerItem` |
| `ExpenseTemplateField` | `expense_template_fields` | `fieldName`, `fieldType`, `isRequired`, `sortOrder`, `defaultValue` |
| `ExpenseCategory` | `expense_categories` | `name`, `templateId`, `isActive`, `isFixed` |
| `Expense` | `expenses` | `bookId`, `categoryId`, `title`, `totalAmount`, `notes`, `invoiceUploadId` |
| `ExpenseFieldValue` | `expense_field_values` | `expenseId`, `fieldId`, `value` |
| `ExpenseAttachment` | `expense_attachments` | `expenseId`, `uploadId` — **nema** FK na field/line |

## Dva moda

| | Fiksna (`isFixed=true`) | Varijabilna (`isFixed=false`) |
|--|-------------------------|--------------------------------|
| UI | `FixedFieldsEditor` | `LineItemsEditor` (hardkod: name/qty/price) |
| Persist | `ExpenseFieldValue` | `notes` JSON `{ lineItems, userNotes }` |
| Template fields | Koriste se (defaultValue) | Skoro ignorisani |
| Prilog po stavci | `requiresAttachmentPerItem` → po polju (filename match) | Flag → po liniji; inače bulk na rashod |

## API

- `api/expense-categories` — CRUD bez DELETE (soft `isActive`)
- `api/expense-templates` — CRUD + `POST :id/fields` + `DELETE fields/:fieldId`
- `api/expenses` — create/update u transakciji; `assertFieldValuesMatchTemplate` forsira obavezna polja **samo** za `isFixed`

## Admin UI (problem)

[`expense-categories-tab.tsx`](../../../../frontend/src/features/finance/catalog/expense-categories-tab.tsx): dvije kartice (Kategorije + Predlošci). Admin mora prvo predložak, pa kategoriju; `isFixed` i prilozi su na različitim entitetima.

## Primjeri u produkciji

- **Doprinosi**: `isFixed=true`, polja tipa PIO/Zdravstvo s `defaultValue`, često `requiresAttachmentPerItem=true`
- **Materijal**: `isFixed=false`, redovi u `notes` kao `{name, qty, price}`

## Poznati dugovi

1. Mapiranje priloga ↔ stavka preko imena fajla (`expense-attachment-match.ts`), bez FK
2. Varijabilne kolone hardkodirane — nije admin-konfigurisivo
3. Nema update postojećeg template polja (samo add/remove)
4. `invoiceUploadId` na Expense nije korišten u formi

## Rollback checklist

1. **Ne** raditi `migrate down` na produkciji ako već postoje novi `lineRole` podaci — additive kolona je bezbedna za rollback koda.
2. Vratiti FE/BE na commit prije modularnog plana (`git checkout` / revert PR).
3. Tabele koje **ne dirati** pri rollbacku: `expenses`, `expense_field_values`, `expense_attachments`, `expense_categories`, `expense_category_templates`.
4. Ako su novi rashodi već sačuvani u notes `v:2`, stari FE neće parsirati line items — prije rollbacka provjeriti da nema `notes` sa `"v":2`, ili zadržati adapter u starom kodu.
5. Snapshot ovog fajla + `MATRIX.md` sekcija Rashodi (KUF) opisuju ponašanje prije promjene.
