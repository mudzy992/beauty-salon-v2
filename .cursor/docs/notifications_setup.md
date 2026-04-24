# Notifikacije – kompletna postavka

## Što je implementirano

- **Backend**: Slanje putem **Expo Push API** (expo-server-sdk). Notifikacija se upisuje u bazu, emituje Socket.IO, i šalje na sve Expo push tokene korisnika. Endpoint `POST /api/notifications/push-token` za registraciju tokena.
- **Mobile**: Hook `usePushNotifications` traži dozvolu, dohvaća Expo push token (potreban je **projectId**), registrira ga na backend, postavlja Android kanal.
- **Firebase**: `google-services.json` je u `mobile/` rootu; koristi se za FCM u development/production buildovima. Za slanje s backenda **nije potreban** Firebase Admin – koristi se isključivo Expo Push API.

---

## 1. Expo projectId (obavezno za push)

Push token na uređaju zahtijeva **EAS projectId**. Bez njega `getExpoPushTokenAsync()` ne može vratiti valjani token.

### Korak 1: Inicijalizacija EAS projekta

U rootu **mobile** projekta pokreni:

```bash
cd mobile
npx eas init
```

- Ako nisi ulogiran, EAS će tražiti login (Expo account).
- Ako projekat već postoji, EAS će ga povezati; inače će kreirati novi i **isprintati projectId** (npr. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).

### Korak 2: Unos projectId-a

**Opcija A – preko env (preporučeno)**  
U `mobile/.env` dodaj:

```env
EXPO_PUBLIC_EAS_PROJECT_ID=<tvoj-projectId>
```

`app.config.js` učitava ovu varijablu i postavlja je u `extra.eas.projectId` za Expo/Constants.

**Opcija B – direktno u app.json**  
U `mobile/app.json` u `expo.extra.eas` postavi:

```json
"extra": {
  "eas": {
    "projectId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

Nakon toga restart Expo dev servera i ponovno pokretanje app-a. Push token bi se trebao uspješno dobiti (na dev buildu ili fizičkom uređaju, ne u Expo Go na Androidu).

---

## 2. EAS credentials (keystore) za Android

Za **EAS Build** (npr. `eas build --profile production`) EAS automatski kreira ili koristi Android keystore. Nije potrebno ručno dodavati keystore ako koristiš samo EAS.

Ako želiš koristiti **vlastiti** Android keystore (npr. za postojeći Play Store app):

```bash
cd mobile
eas credentials
```

Odaberi platformu Android i opciju za upload postojećeg keystore-a.  
`google-services.json` je već u projektu; EAS ga uključuje u build preko `app.json` (`android.googleServicesFile`).

---

## 3. Backend – slanje push notifikacija

Backend šalje notifikacije preko **Expo Push API**. Ne treba Firebase Admin SDK.

Opcionalno, za veći broj zahtjeva ili posebne limite možeš postaviti **Expo access token**:

1. Na [expo.dev](https://expo.dev) → Account → Access Tokens kreiraj token.
2. U backend `.env` dodaj:
   ```env
   EXPO_ACCESS_TOKEN=tvoj_expo_access_token
   ```
   Ako nije postavljen, Expo Push API i dalje radi, ali s defaultnim limitima.

---

## 4. Ikone aplikacije

U `app.json` je postavljeno da se **jedna slika** `./assets/icon.png` koristi za:

- `expo.icon`
- `expo.splash.image`
- `expo.android.adaptiveIcon.foregroundImage`
- `expo.web.favicon`
- `expo-notifications` plugin (ikonica notifikacija)

Znači dovoljno je da u `mobile/assets/` postoji **icon.png** (npr. 1024×1024 px za bolju kvalitetu na svim uređajima). Ako želiš posebne ikone za splash ili adaptive icon, možeš dodati `splash-icon.png` / `adaptive-icon.png` i vratiti reference u `app.json`.

---

## Što od tebe trebam

1. **Pokreni u `mobile` direktoriju:**  
   `npx eas init`  
   (i ulogiraj se ako EAS zatraži.)

2. **Pošalji mi projectId** koji EAS ispiše nakon `eas init` (npr. UUID tipa `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).  
   Mogu ga onda predložiti za `EXPO_PUBLIC_EAS_PROJECT_ID` u `.env` ili za `app.json`.

3. (Opcionalno) Ako već imaš Expo Access Token i želiš da backend ga koristi za push, pošalji ga (ili ga sam stavi u backend `.env` kao `EXPO_ACCESS_TOKEN` – ne dijelimo ga u repou).

Nakon postavljanja projectId-a, push notifikacije bi trebale raditi na development ili production buildu (ne u Expo Go na Androidu).
