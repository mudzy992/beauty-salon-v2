```
Android Bundling failed 55363ms expo-router-entry-safe.js (3082 modules)
Unable to resolve "@react-navigation/native" from "src\hooks\useAutoRefresh.ts"
  1 | import { useCallback, useEffect, useRef } from 'react';
  2 | import { AppState, type AppStateStatus } from 'react-native';
> 3 | import { useFocusEffect } from '@react-navigation/native';
    |                                 ^
  4 |
  5 | /**
  6 |  * Periodično poziva callback dok je ekran fokusiran i aplikacija aktivna.

Import stack:

 src\hooks\useAutoRefresh.ts
 | import "@react-navigation/native"

 src\screens\stylist\StylistInboxScreen.tsx
 | import "../../hooks/useAutoRefresh"

 app\stylist\(tabs)\inbox\index.tsx
 | import "../../../../src/screens/stylist/StylistInboxScreen"

 app (require.context)
```
