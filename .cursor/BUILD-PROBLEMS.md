# AGER_BUNDLE] Starting Metro Bundler

[EAGER_BUNDLE] Android Bundling failed 1861ms expo-router-entry-safe.js (2466 modules)

[EAGER_BUNDLE] Error: Unable to resolve module /tmp/administrator/eas-build-local-nodejs/b2a31a9b-7dd9-4216-a18c-d1f1ee9d82b8/build/mobile/shims/packages/react-native-reanimated from /tmp/administrator/eas-build-local-nodejs/b25e948d-477b-4e87-ab56-38cf3729ed7d/build/mobile/node_modules/react-native-css/dist/module/native/reanimated.js:

[EAGER_BUNDLE]

[EAGER_BUNDLE] None of these files exist:

[EAGER_BUNDLE]   * ../../../b2a31a9b-7dd9-4216-a18c-d1f1ee9d82b8/build/mobile/shims/packages/react-native-reanimated(.android.ts|.native.ts|.ts|.android.tsx|.native.tsx|.tsx|.android.mjs|.native.mjs|.mjs|.android.js|.native.js|.js|.android.jsx|.native.jsx|.jsx|.android.json|.native.json|.json|.android.cjs|.native.cjs|.cjs|.android.scss|.native.scss|.scss|.android.sass|.native.sass|.sass|.android.css|.native.css|.css|.android.css|.native.css|.css)

[EAGER_BUNDLE]   * ../../../b2a31a9b-7dd9-4216-a18c-d1f1ee9d82b8/build/mobile/shims/packages/react-native-reanimated

[EAGER_BUNDLE]    8 |   const createAnimatedComponent =

[EAGER_BUNDLE]    9 |   // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access

[EAGER_BUNDLE] > 10 |   require("react-native-reanimated").createAnimatedComponent;

[EAGER_BUNDLE]      |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

[EAGER_BUNDLE]   11 |   return createAnimatedComponent(component);

[EAGER_BUNDLE]   12 | });

[EAGER_BUNDLE]   13 | //# sourceMappingURL=[reanimated.js.map](http://reanimated.js.map)

[EAGER_BUNDLE]

[EAGER_BUNDLE] Import stack:

[EAGER_BUNDLE]

[EAGER_BUNDLE]  node_modules/react-native-css/dist/module/native/reanimated.js

[EAGER_BUNDLE]  | import "/tmp/administrator/eas-build-local-nodejs/b2a31a9b-7dd9-4216-a18c-d1f1ee9d82b8/build/mobile/shims/packages/react-native-reanimated"

[EAGER_BUNDLE]

[EAGER_BUNDLE]  node_modules/react-native-css/dist/module/native/react/useNativeCss.js

[EAGER_BUNDLE]  | import "../reanimated.js"

[EAGER_BUNDLE]

[EAGER_BUNDLE]  node_modules/react-native-css/dist/module/native/api.js

[EAGER_BUNDLE]  | import "./react/useNativeCss.js"

[EAGER_BUNDLE]

[EAGER_BUNDLE]  node_modules/react-native-css/dist/module/native/index.js

[EAGER_BUNDLE]  | import "./api.js"

[EAGER_BUNDLE]

[EAGER_BUNDLE]  node_modules/react-native-css/dist/module/runtime.native.js

[EAGER_BUNDLE]  | import "./native/index.js"

[EAGER_BUNDLE]

[EAGER_BUNDLE]  node_modules/react-native-css/dist/module/index.js

[EAGER_BUNDLE]  | import "./runtime"

[EAGER_BUNDLE]

[EAGER_BUNDLE]  node_modules/react-native-css/dist/module/components/ActivityIndicator.js

[EAGER_BUNDLE]  | import "react-native-css"

[EAGER_BUNDLE]

[EAGER_BUNDLE]  node_modules/react-native-css/dist/module/components/index.cjs

[EAGER_BUNDLE]  | import "./ActivityIndicator"

[EAGER_BUNDLE]

[EAGER_BUNDLE]  node_modules/expo-modules-core/src/Platform.ts

[EAGER_BUNDLE]  | import "react-native"

[EAGER_BUNDLE]

[EAGER_BUNDLE]  node_modules/expo-modules-core/src/index.ts

[EAGER_BUNDLE]  | import "./Platform"

[EAGER_BUNDLE]

[EAGER_BUNDLE]  node_modules/expo-keep-awake/src/index.ts

[EAGER_BUNDLE]  | import "expo-modules-core"

[EAGER_BUNDLE]

[EAGER_BUNDLE]  app/_layout.tsx

[EAGER_BUNDLE]  | import "expo-keep-awake"

[EAGER_BUNDLE]

[EAGER_BUNDLE]  app (require.context)

[EAGER_BUNDLE]

Error: npx expo export:embed --eager --platform android --dev false exited with non-zero code: 1

    at ChildProcess.completionListener (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/spawn-async/build/spawnAsync.js:113:23)

    at Object.onceWrapper (node:events:631:26)

    at ChildProcess.emit (node:events:509:28)

    at ChildProcess.emit (node:domain:489:12)

    at maybeClose (node:internal/child_process:1124:16)

    at ChildProcess._handle.onexit (node:internal/child_process:306:5)

    ...

    at spawnAsync (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/spawn-async/build/spawnAsync.js:9:23)

    at spawn (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/turtle-spawn/dist/index.js:16:47)

    at runExpoCliCommand (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/utils/project.js:53:43)

    at eagerBundleAsync (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/common/eagerBundle.js:11:43)

    at /home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/builders/android.js:135:54

    at BuildContext.runBuildPhase (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/context.js:126:34)

    at buildInnerAsync (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/builders/android.js:134:19)

    at async buildAsync (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/builders/android.js:46:9)

    at async runBuilderWithHooksAsync (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/builders/common.js:12:13)

    at async Object.androidBuilder (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/builders/android.js:31:16)

Build failed

Unknown error. See logs of the Bundle JavaScript build phase for more information.

Error: Unknown error. See logs of the Bundle JavaScript build phase for more information.

    at resolveBuildPhaseErrorAsync (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/buildErrors/detectError.js:61:12)

    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)

    at async BuildContext.handleBuildPhaseErrorAsync (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/context.js:193:28)

    at async BuildContext.runBuildPhase (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/context.js:138:35)

    at async buildInnerAsync (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/builders/android.js:134:9)

    at async buildAsync (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/builders/android.js:46:9)

    at async runBuilderWithHooksAsync (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/builders/common.js:12:13)

    at async Object.androidBuilder (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/builders/android.js:31:16)

    at async buildAndroidAsync (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/eas-cli-local-build-plugin/dist/android.js:43:12)

    at async buildAsync (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/eas-cli-local-build-plugin/dist/build.js:54:29)

Build context (for debugging this failed local build):

  Platform: android

  Build profile: production

  Workflow: managed

  Distribution: store

  Credentials source: remote

  Project root directory: mobile

  Required package manager: npm

  eas-cli version: 21.8.0

  SDK version: 57.0.0

  React Native version: 0.86.2

  Expo package version: 57.0.14

  App version: 1.0.6

  Fingerprint hash: 94eab3d2c0ed894fcd4321ba1f57b9d2b2ceec0b

  Git commit: 7bdf0bff36a5f7e4daa8b4876e7c03bdaf3bd27f

  Git working tree dirty: true

  Build tracking ID: 0750540c-9299-4d00-b382-ed94b1592f96

  Project ID: a697c506-8426-4064-99d8-780f9fc70700
