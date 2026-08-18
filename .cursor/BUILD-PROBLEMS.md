```
Android Bundled 218ms expo-router-entry-safe.js (1 module)
 INFO  🌐 i18next is made possible by our own product, Locize — consider powering your project with managed localization (AI, CDN, integrations): https://locize.com 💙
 ERROR  [TypeError: undefined is not a function]

Code: system-bars.tsx
  34 |   const { statusBar, navigationBar } = resolveBars(style);
  35 |   useEffect(() => {
> 36 |     void NavigationBar.setButtonStyleAsync(navigationBar).catch(() => undefined);
     |                                           ^
  37 |   }, [navigationBar]);
  38 |   return <StatusBar style={statusBar} />;
  39 | }
Call Stack
  useEffect$argument_0 (src\components\system-bars.tsx:36:43)

Code: system-bars.tsx
  43 |     return <NativeSystemBars {...props} />;
  44 |   }
> 45 |   return <ExpoGoSystemBars {...props} />;
     |          ^
  46 | }
  47 |
Call Stack
  SystemBars (src\components\system-bars.tsx:45:10)
  AppContent (app\_layout.tsx:101:16)
  RootLayout (app\_layout.tsx:137:11)
```
