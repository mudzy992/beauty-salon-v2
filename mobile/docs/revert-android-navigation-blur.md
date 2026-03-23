# Revert napomena: `androidNavigationBar` + Android pravi blur

## Šta je urađeno

1. **`app.config.js`** — uklonjen blok `androidNavigationBar`. Iz **`expo-navigation-bar` plugin opcija** uklonjen `backgroundColor` (i on pali isto deprecation upozorenje u Expo config validatoru). System nav: preostale plugin opcije + `react-native-edge-to-edge` + `SystemBars` u `App.tsx`.

2. **Android `BlurView` (Expo SDK 55+)** — default `blurMethod` je `'none'` (samo poluprovidno). Pravi blur zahtijeva `BlurTargetView` oko sadržaja + `blurTarget` ref na `BlurView` ([dokumentacija](https://docs.expo.dev/versions/latest/sdk/blur-view/)).

3. **Novi fajl** `src/navigation/TabBlurTargetContext.tsx` — `TabBlurTargetProvider` + `TabBlurTargetRoot` po tab indeksu.

4. **`MainNavigator.tsx`** — `TabBlurTargetProvider tabCount={4}`; svaki od 4 stacka omotan `TabBlurTargetRoot` (indeksi 0–3).

5. **`StylistNavigator.tsx`** — `TabBlurTargetProvider tabCount={5}`; tab ekrani kroz `*TabRoot` wrapere (indeksi 0–4).

6. **`FloatingTabBar.tsx`** — na Androidu: `blurTarget`, `blurMethod: 'dimezisBlurViewSdk31Plus'`, `blurReductionFactor: 3`.

## Revert (git)

```bash
git checkout -- app.config.js src/navigation/TabBlurTargetContext.tsx src/navigation/MainNavigator.tsx src/navigation/StylistNavigator.tsx src/navigation/FloatingTabBar.tsx
rm docs/revert-android-navigation-blur.md
```

Ručno: vrati `androidNavigationBar` u `app.config.js` samo ako želiš staro ponašanje (i upozorenje).
