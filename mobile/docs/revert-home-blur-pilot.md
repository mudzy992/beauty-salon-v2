# Revert: Home blur pilot (FloatingTabBar)

**Cilj pilot-a:** Na Home ekranu probati transparentan Native Stack `contentStyle` samo za rutu `Home`, te odvojiti hero od bloka ispod (`homeBelowHero`) s `colors.background`, da `BlurView` na tab baru uzorkuje hero/sadržaj u donjoj zoni umjesto jedne neprozirne teme preko cijelog ekrana.

## Fajlovi u izmjeni

| Fajl | Šta pilot mijenja |
|------|-------------------|
| `src/navigation/MainNavigator.tsx` | Na `HomeStack.Screen` za `Home` dodan `contentStyle: { backgroundColor: 'transparent' }` u `options`. |
| `src/screens/client/HomeScreen.tsx` | Root/ScrollView transparentni; sekcije u `View` (`homeBelowHero`) s `backgroundColor: colors.background` i `paddingBottom` za tab bar; `contentContainerStyle` bez `paddingBottom` na cijelom scrollu (padding u `homeBelowHero`). |

## Ručni revert (kopiraj-paste logika)

1. **MainNavigator.tsx** — za `Home` ostavi samo:

   `options={{ headerShown: false }}`

   (ukloni `contentStyle` i komentar.)

2. **HomeScreen.tsx** — vrati:

   - `<View style={[styles.safe, { backgroundColor: colors.background }]}>`
   - `<ScrollView` bez `style={styles.scrollView}`
   - `contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xxl + tabBarBottom }]}`
   - Sav sadržaj između hero `</View>` i `</ScrollView>` **izvan** `homeBelowHero` wrappera (direktno u `ScrollView`).
   - U `StyleSheet`: `safe: { flex: 1 }` (bez transparent), ukloni `scrollView` i `homeBelowHero`, `scroll` bez `flexGrow: 1`, `heroWrap` opet `marginBottom: spacing.md`.

## Git

Ako su ove izmjene u zasebnom commitu:

```bash
git revert <commit-sha>
```

Ili vraćanje samo ovih fajlova sa zadnjeg stanja prije pilot-a:

```bash
git checkout <commit-pre-pilot> -- src/navigation/MainNavigator.tsx src/screens/client/HomeScreen.tsx
```

Zatim obriši ovaj dokument ako više nije potreban.
