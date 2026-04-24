# Faza 10 – Notifikacije: implementirano vs. na čekanju (SDK 55)

Dokument zabilježava šta je implementirano u sklopu notifikacija i šta je namjerno ostavljeno na čekanju zbog Expo SDK 55 / okruženja.

---

## Implementirano

### Backend
- **Model i API**: Tabele `notifications`, `notification_preferences`, `push_tokens`. CRUD za listu notifikacija po korisniku, označavanje kao pročitano, upravljanje preferencama (push/email po tipu).
- **Slanje**: `NotificationsService.send()` upisuje notifikaciju u bazu i emituje Socket.IO event (`notification:new`) svim prijavljenim klijentima. Poziva se iz reservation flow-a, holiday notifikacija itd.
- **Push token**: Endpoint `POST /api/notifications/push-token` za registraciju Expo push tokena (platforma IOS/ANDROID). Tokeni se čuvaju u `push_tokens`; upsert po tokenu.
- **Expo Push**: Stvarno slanje push notifikacija putem Expo Push API (expo-server-sdk). Opciono: `EXPO_ACCESS_TOKEN` u backend .env.
- **Email**: Logika za slanje prema preferencama spremna; stvarno slanje emaila (Nodemailer) stub – za kasniju integraciju.

### Frontend (admin)
- Stranica **Notifikacije** u adminu: pregled (opciono filtriranje), označavanje kao pročitano.

### Mobile (Expo SDK 55)
- **Expo Notifications**: Hook `usePushNotifications` (real implementacija u `usePushNotifications.real.ts`): traži dozvolu, dohvaća Expo push token, registrira ga na backend (`POST /api/notifications/push-token`), postavlja Android kanal, listeneri za primljenu notifikaciju i tap (foreground + response).
- **Uvjetno učitavanje**: Ako `EXPO_PUBLIC_PUSH_ENABLED !== 'true'`, učitava se no-op verzija hooka (`usePushNotifications.ts`) koja ne učitava `expo-notifications`, kako Expo Go ne bi bacao greške kada remote push nije podržan.
- **NotificationsScreen**: Lista notifikacija s API-ja, pull-to-refresh, označavanje kao pročitano, tipovi (rezervacija, recenzija, blog, praznik, sistem) s ikonama.
- **Store**: `notificationStore` (Zustand) za listu, broj nepročitanih, fetch i markAsRead.

---

## Na čekanju / ograničenja (SDK 55)

1. **Expo Go na Androidu**: Od SDK 53 nadalje, **remote push notifikacije u Expo Go na Androidu ne rade**. Za punu provjeru push notifikacija na Androidu potrebna je **development build** (npr. `eas build --profile development`) ili produkcijski build, ne Expo Go.
2. **EAS projectId**: Mora se dobiti s `npx eas init` u mobile/ i postaviti u `EXPO_PUBLIC_EAS_PROJECT_ID` ili app.json. Detalji: `.cursor/docs/notifications_setup.md`.
3. **Email slanje**: Nodemailer (SMTP) nije spojen – slanje email notifikacija je stub.
4. **Deep link na tap**: Listener za `addNotificationResponseReceivedListener` je postavljen, ali navigacija na konkretni ekran (npr. rezervacija) na osnovu `data` iz notifikacije može se doraditi kada je routing po tipu notifikacije definiran.

---

## Preporuka

- Za development: držati `EXPO_PUBLIC_PUSH_ENABLED` isključeno u Expo Go da se izbjegnu greške.
- Za testiranje push notifikacija: EAS build (development/production), `EXPO_PUBLIC_PUSH_ENABLED=true`, i postavljen `EXPO_PUBLIC_EAS_PROJECT_ID` u mobile/.env.
