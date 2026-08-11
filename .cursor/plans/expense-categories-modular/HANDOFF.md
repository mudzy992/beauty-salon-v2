# HANDOFF

## Done

- AS-IS snapshot + rollback checklist
- Category-centric wizard (create template+category)
- `lineRole` on fields + notes v2 + legacy Materijal read
- Dynamic line editor + bootstrap-legacy-columns
- MATRIX updated

## Ops

1. Apply migration: `cd backend && npx prisma migrate deploy`
2. In UI: Kategorije → “Dopuni stare kolone” (Materijal bez fields)
3. Smoke: novi fiksni + varijabilni rashod; otvori stari Materijal/Doprinosi

## Follow-up (van opsega)

- FK priloga na field/line
- Relacioni ExpenseLineItem
- Drag-reorder polja
