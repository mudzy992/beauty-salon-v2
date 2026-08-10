# Client debts matrix

## Scope

- **In scope**: OPEN `ClientDebt`, daily-log create/complete tip & shortfall, settle lines in one form, KIF mapping, `payDebtsIntent`, client surfaces.
- **Out of scope**: KUF / expense books; editing amount of an existing OPEN debt; admin dashboard home.

## Create matrix (SERVICE entry)

| Input | Result |
|-------|--------|
| `unitPrice` per service (snapshot; default = catalog `Service.price`) | Sum = services base |
| Loyalty discount (if any) | `chargeBase = max(0, sum(unitPrices) − loyalty)` |
| Selected OPEN debts (Naplati dug) | `chargeAmount = chargeBase + sum(selectedDebtAmounts)` |
| `paid` (Naplaćeno), default = chargeAmount | Tip / shortfall vs chargeAmount |
| `paid > chargeAmount` | `tipAmount = paid − chargeAmount`; no new debt |
| `paid = chargeAmount` | tip 0, shortfall 0 |
| `paid < chargeAmount` + toggle Zavedi dug **on** | `CREATE_DEBT`, `ClientDebt.amount = shortfall` |
| `paid < chargeAmount` + toggle **off** | `IGNORE_DEBT`, book `paid` only |
| `paid < sum(selected debts)` | Validation error |

Ledger split when settling debts in the same form:

1. Validate `paid >= sum(selectedDebtAmounts)`.
2. For each selected debt → `DEBT_PAYMENT` entry via settle helper (`actualPrice = debt.amount`, tip vs service list price).
3. Remainder `paid − debtsSum` → SERVICE entry with unitPrice items; tip/shortfall vs chargeBase (services − loyalty).
4. `sourceEntryId` links DEBT_PAYMENT → SERVICE.

## Stored fields

- `DailyLogEntry.actualPrice` = collected for that entry (services portion after debt split).
- `DailyLogEntry.tipAmount` = tip for that entry.
- `DailyLogEntryServiceItem.unitPrice` = per-line snapshot.
- `Reservation.payDebtsIntent` = client booking checkbox; stylist complete defaults Naplati dug on + all OPEN selected.

## KIF

- `amount = actualPrice − tipAmount` (service revenue).
- Tip stored separately as `tipAmount`.
- DEBT_PAYMENT / manual repay uses same convention.
- **KUF**: N/A (daily log does not write expenses).

## Client UX

- Profile: list OPEN debts.
- Home: banner when OPEN debt exists.
- Notification type `client_debt` (in-app + push) on CREATE_DEBT.
- Booking: “Plaćam i dugovanje” when OPEN debts exist.
