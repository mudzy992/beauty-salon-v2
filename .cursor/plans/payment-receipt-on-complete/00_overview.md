# Payment receipt on complete — overview

Na `POST /api/daily-log/:id/complete` klijent dobija push/in-app notifikaciju i (ako je mail verifikovan) email potvrdu uplate. Detalj uplate u aplikaciji dostupan je preko rezervacije (mobile + web).

## Faze

1. Backend receipt service + `payment_receipt` notification type
2. `GET /api/reservations/:id` → `paymentSummary`
3. Mobile detail ekran + deep link
4. Web detail stranica
5. Matrica + testovi

## Odluke

- Email receipt ne ide kroz notification email preference (business mail, kao verification)
- Push/in-app ide kroz standardni `notifications.send` s `channel: PUSH`
- Walk-in bez rezervacije: notifikacije da, deep link ne
