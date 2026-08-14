 FAILURE: Build failed with an exception.

[RUN_GRADLEW] * What went wrong:

[RUN_GRADLEW] Execution failed for task ':app:mergeReleaseResources'.

[RUN_GRADLEW] > A failure occurred while executing [com.android.build](http://com.android.build).gradle.internal.res.Aapt2CompileRunnable

[RUN_GRADLEW]    > Android resource compilation failed

[RUN_GRADLEW]      ERROR: /tmp/administrator/eas-build-local-nodejs/0de6b829-bec5-4bee-88ec-485a0f1ac8d3/build/mobile/android/app/build/generated/res/react/release/drawable-mdpi/assets_images_mediafallback.png: AAPT: error: file failed to compile.

[RUN_GRADLEW]          

[RUN_GRADLEW] * Try:

[RUN_GRADLEW] > Run with --stacktrace option to get the stack trace.

[RUN_GRADLEW] > Run with --info or --debug option to get more log output.

[RUN_GRADLEW] > Run with --scan to generate a Build Scan (Powered by Develocity).

[RUN_GRADLEW] > Get more help at [https://help.gradle.org](https://help.gradle.org).

[RUN_GRADLEW] BUILD FAILED in 7m 38s

[RUN_GRADLEW] See the profiling report at: [file:///tmp/administrator/eas-build-local-nodejs/0de6b829-bec5-4bee-88ec-485a0f1ac8d3/build/mobile/android/build/reports/profile/profile-2026-08-14-14-41-08.html](file:///tmp/administrator/eas-build-local-nodejs/0de6b829-bec5-4bee-88ec-485a0f1ac8d3/build/mobile/android/build/reports/profile/profile-2026-08-14-14-41-08.html)

[RUN_GRADLEW] A fine-grained performance profile is available: use the --scan option.

[RUN_GRADLEW] Error: Gradle build failed with unknown error. See logs for the "Run gradlew" phase for more information.

Build failed

Gradle build failed with unknown error. See logs for the "Run gradlew" phase for more information.

Error: Gradle build failed with unknown error. See logs for the "Run gradlew" phase for more information.

    at resolveBuildPhaseErrorAsync (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/buildErrors/detectError.js:61:12)

    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)

    at async BuildContext.handleBuildPhaseErrorAsync (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/context.js:193:28)

    at async BuildContext.runBuildPhase (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/context.js:138:35)

    at async buildInnerAsync (/home/administrator/.npm/_npx/36e7aa1ad536a557/node_modules/@expo/build-tools/dist/builders/android.js:152:5)

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

  SDK version: 55.0.0

  React Native version: 0.83.10

  Expo package version: 55.0.28

  App version: 1.0.3

  Fingerprint hash: cc62a9e36861957eab4cdae64cef7900236e95a2

  Git commit: 2bee3fbb48513d71bcbf105b88d567d71f6d3785

  Git working tree dirty: true

  Build tracking ID: 2b6afaa0-c3b3-48fb-891b-5402a42fb4f2

  Project ID: a697c506-8426-4064-99d8-780f9fc70700

npx -y eas-cli-local-build-plugin@21.6.0 exited with non-zero code: 1

    Error: build command failed.