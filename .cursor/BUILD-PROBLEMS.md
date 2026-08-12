[RUN_EXPO_DOCTOR] Running "expo doctor"

[RUN_EXPO_DOCTOR] npm notice run beauty-salon-v2-mobile@1.0.0 npx

[RUN_EXPO_DOCTOR] npm notice run 'expo-doctor'

[RUN_EXPO_DOCTOR] Running 19 checks on your project...

[RUN_EXPO_DOCTOR] 19/19 checks passed. No issues detected!

[PREBUILD] npm notice run beauty-salon-v2-mobile@1.0.0 npx

[PREBUILD] npm notice run 'expo' prebuild --no-install --platform android

[PREBUILD] - Creating native directory (./android)

[PREBUILD] ✔ Created native directory

[PREBUILD] - Updating package.json

[PREBUILD] ✔ Updated package.json

[PREBUILD] - Running prebuild

[PREBUILD] ✔ Finished prebuild

[PREBUILD] Running "npm install --include=dev" in /tmp/administrator/eas-build-local-nodejs/193bfcba-cada-44db-9555-544498139070/build/mobile directory

[PREBUILD] npm notice run beauty-salon-v2-mobile@1.0.0 postinstall

[PREBUILD] npm notice run node ./scripts/patch-calendars-assets.js

[PREBUILD] up to date, audited 817 packages in 3s

[PREBUILD] 63 packages are looking for funding

[PREBUILD] run `npm fund` for details

[PREBUILD] 21 vulnerabilities (7 moderate, 14 high)

[PREBUILD]

[PREBUILD] To address issues that do not require attention, run:

[PREBUILD]   npm audit fix

[PREBUILD]

[PREBUILD] To address all issues (including breaking changes), run:

[PREBUILD]   npm audit fix --force

[PREBUILD]

[PREBUILD] Run `npm audit` for details.

[RESTORE_CACHE] Local builds do not support restoring cache

[PREPARE_CREDENTIALS] Writing secrets to the project's directory

[PREPARE_CREDENTIALS] Injecting signing config into build.gradle

[PREPARE_CREDENTIALS] Signing config injected

[EAGER_BUNDLE] npm notice run beauty-salon-v2-mobile@1.0.0 npx

[EAGER_BUNDLE] npm notice run 'expo' export:embed --eager --platform android --dev false

[EAGER_BUNDLE] Starting Metro Bundler

[EAGER_BUNDLE] Android ./expo-router-entry-safe.js ░░░░░░░░░░░░░░░░  0.0% (0/1)

[EAGER_BUNDLE] Android Bundling failed 3313ms expo-router-entry-safe.js (2702 modules)

[EAGER_BUNDLE] Error: Unable to resolve module ../../../../components/ui/Card from /tmp/administrator/eas-build-local-nodejs/193bfcba-cada-44db-9555-544498139070/build/mobile/src/screens/stylist/reservation-detail/reservation-detail-actions.tsx:

[EAGER_BUNDLE]

[EAGER_BUNDLE] None of these files exist:

[EAGER_BUNDLE]   * components/ui/Card(.android.ts|.native.ts|.ts|.android.tsx|.native.tsx|.tsx|.android.mjs|.native.mjs|.mjs|.android.js|.native.js|.js|.android.jsx|.native.jsx|.jsx|.android.json|.native.json|.json|.android.cjs|.native.cjs|.cjs|.android.scss|.native.scss|.scss|.android.sass|.native.sass|.sass|.android.css|.native.css|.css|.android.css|.native.css|.css)

[EAGER_BUNDLE]   * components/ui/Card

[EAGER_BUNDLE]   4 | import { useTranslation } from 'react-i18next';

[EAGER_BUNDLE]   5 |

[EAGER_BUNDLE] > 6 | import { Card } from '../../../../components/ui/Card';

[EAGER_BUNDLE]     |                       ^

[EAGER_BUNDLE]   7 | import { Button } from '../../../../components/ui/Button';

[EAGER_BUNDLE]   8 | import { spacing } from '../../../../theme';

[EAGER_BUNDLE]   9 | import { useTheme } from '../../../../hooks/useTheme';

[EAGER_BUNDLE]

[EAGER_BUNDLE] Import stack:

[EAGER_BUNDLE]

[EAGER_BUNDLE]  src/screens/stylist/reservation-detail/reservation-detail-actions.tsx

[EAGER_BUNDLE]  | import "../../../../components/ui/Card"

[EAGER_BUNDLE]

[EAGER_BUNDLE]  src/screens/stylist/StylistReservationDetailScreen.tsx

[EAGER_BUNDLE]  | import "./reservation-detail/reservation-detail-actions"

[EAGER_BUNDLE]

[EAGER_BUNDLE]  app/stylist/(tabs)/schedule/reservation-detail/[reservationId].tsx

[EAGER_BUNDLE]  | import "../../../../../src/screens/stylist/StylistReservationDetailScreen"

[EAGER_BUNDLE]

[EAGER_BUNDLE]  app (require.context)

[EAGER_BUNDLE]

Error: npx expo export:embed --eager --platform android --dev false exited with non-zero code: 1

    at ChildProcess.completionListener (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/@expo/spawn-async/build/spawnAsync.js:113:23)

    at Object.onceWrapper (node:events:631:26)

    at ChildProcess.emit (node:events:509:28)

    at ChildProcess.emit (node:domain:489:12)

    at maybeClose (node:internal/child_process:1124:16)

    at ChildProcess._handle.onexit (node:internal/child_process:306:5)

    ...

    at spawnAsync (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/@expo/spawn-async/build/spawnAsync.js:9:23)

    at spawn (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/@expo/turtle-spawn/dist/index.js:16:47)

    at runExpoCliCommand (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/@expo/build-tools/dist/utils/project.js:53:43)

    at eagerBundleAsync (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/@expo/build-tools/dist/common/eagerBundle.js:11:43)

    at /home/administrator/.npm/_npx/87953c210aba393f/node_modules/@expo/build-tools/dist/builders/android.js:121:54

    at BuildContext.runBuildPhase (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/@expo/build-tools/dist/context.js:128:34)

    at buildAsync (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/@expo/build-tools/dist/builders/android.js:120:19)

    at async runBuilderWithHooksAsync (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/@expo/build-tools/dist/builders/common.js:12:13)

    at async Object.androidBuilder (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/@expo/build-tools/dist/builders/android.js:28:16)

    at async buildAndroidAsync (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/eas-cli-local-build-plugin/dist/android.js:43:12)

Build failed

Unknown error. See logs of the Bundle JavaScript build phase for more information.

Error: Unknown error. See logs of the Bundle JavaScript build phase for more information.

    at resolveBuildPhaseErrorAsync (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/@expo/build-tools/dist/buildErrors/detectError.js:61:12)

    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)

    at async BuildContext.handleBuildPhaseErrorAsync (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/@expo/build-tools/dist/context.js:195:28)

    at async BuildContext.runBuildPhase (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/@expo/build-tools/dist/context.js:140:35)

    at async buildAsync (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/@expo/build-tools/dist/builders/android.js:120:9)

    at async runBuilderWithHooksAsync (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/@expo/build-tools/dist/builders/common.js:12:13)

    at async Object.androidBuilder (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/@expo/build-tools/dist/builders/android.js:28:16)

    at async buildAndroidAsync (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/eas-cli-local-build-plugin/dist/android.js:43:12)

    at async buildAsync (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/eas-cli-local-build-plugin/dist/build.js:54:29)

    at async main (/home/administrator/.npm/_npx/87953c210aba393f/node_modules/eas-cli-local-build-plugin/dist/main.js:16:9)

npx -y eas-cli-local-build-plugin@19.0.0 eyJqb2IiOnsidHlwZSI6Im1hbmFnZWQiLCJwbGF0Zm9ybSI6ImFuZHJvaWQiLCJwcm9qZWN0Um9vdERpcmVjdG9yeSI6Im1vYmlsZSIsInByb2plY3RBcmNoaXZlIjp7InR5cGUiOiJQQVRIIiwicGF0aCI6Ii90bXAvYWRtaW5pc3RyYXRvci9lYXMtY2xpLW5vZGVqcy8zZGFkNDQ0Yy01ZmZhLTQ2MzItYTE2YS1lZGUwNzE1MThlM2EudGFyLmd6In0sImJ1aWxkZXJFbnZpcm9ubWVudCI6eyJlbnYiOnsiRVhQT19QVUJMSUNfUFVTSF9FTkFCTEVEIjoidHJ1ZSIsIkVYUE9fUFVCTElDX0FQSV9VUkwiOiJodHRwczovL25lanJhLXYyLmJhMTAxLnRvcC9iYWNrZW5kIiwiRVhQT19QVUJMSUNfQVBJX0ZJTEVTX1VSTCI6Imh0dHBzOi8vbmVqcmEtdjIuYmExMDEudG9wL2JhY2tlbmQvdXBsb2FkcyIsIkVYUE9fUFVCTElDX0VBU19QUk9KRUNUX0lEIjoiYTY5N2M1MDYtODQyNi00MDY0LTk5ZDgtNzgwZjlmYzcwNzAwIn19LCJjYWNoZSI6eyJkaXNhYmxlZCI6ZmFsc2UsInBhdGhzIjpbXSwiY2xlYXIiOmZhbHNlfSwic2VjcmV0cyI6eyJidWlsZENyZWRlbnRpYWxzIjp7ImtleXN0b3JlIjp7ImRhdGFCYXNlNjQiOiIvdTMrN1FBQUFBSUFBQUFCQUFBQUFRQWdZVEE1TlROaE9UZzBZV1JoTldVd05EZzBOMlJqT1RWak9HWXhPV0V6WWpFQUFBR2M4NEVsY1FBQUJRSXdnZ1QrTUE0R0Npc0dBUVFCS2dJUkFRRUZBQVNDQk9vMmFqSDZqQkRvTlJxNHRZNmdBTU5lZVpKbitCK1kycWM2aU1vRVIvZFh5eC8rb1EvR2ljc3ZuT2s0Uk04RmJ6cThLVVlLTFpJeXpPRmxtZ3lCb0pZWDE4Uk1TMTNBakpwL1VMTXlsTS8rMStpeVNLak9jRC9TMTArZjk1dTNEcUxlQ2hvbGNDR0FaTmc0MzVSbGlPUEtOK3k2Q3FQZUltYkdKOXZiUjZodUVJMGRTaXFJZU5BRDl6NHRLUlkzeXlPSXRJSVZMNjRxVkJWaERaMjB6eCs5bmloZEkvS1RrSDJjLzFsK1JCMXByV2NkbGFIUXhwcHpDRnBxRWg0SHdTTjZZSURaNURYeUxDenJySG91c25EL2hTaFJVWmZOa0xVcTNUaHdCb05XS1o3dlVLTnIxWDdXcjVyNVJwNHExL3p2QXpBSlNSS0FRSElIN0E2eDJzRENhNXBtT3lJbjJFRDc3dkM5MXJRdTNhMnN5UFhubXlWN3ZSdkNLVk9YY05ackVMYTlhbkF2cG95dFVIeXExMlYrdzhWcTNSdjlkZkhTSEd4MloxVG5jRk1oUm5ZRXRXZ1BkQ3A4MEhGOFE2MVd4Z3d4Z1RQYlpwQnoybi9XbmhLb2FWZDNSekNuMmIzT0lnV2l5VW8rWkxvSjErelc3c3BwYXZ0VnU4QStNTUlzbkY1ZEdnQlV2Ly9qWDhMWmRDTW5QRzN0VUVxRWVXZmo4NlowL2JyOGRNc3JWTHh1bFFkSXhDWnI5MUhkM0tNUTZSUzBtRU1NblBZRmxpWEpZTldLazhyWDd2TndmN21IanlvemF4RHJURG1RdGFmdGx3TTArMGFTZHJhTjkra1dkWUlEQ3Q5VVBhNVJwMXZlejBqbFlkZWpmUVQwYlVDRkhTNkhYcFdPYWc4alYyeitJWEpFamZkMUpUaW1nSnBNN1VhNld1WjlxOC9GWXdaWEJCOTNid0h0TzJ0MWdpNHFLc0ZIN09xZFdjcnp0RVgxcWFFa1g3UlNTc3FDTWJaQVpWUnBuSzBhVlFIdnFzeVR0UTZoc3VNMThYNnB0ZEN0NjFtbjR4US9DS0lTMUNlb2ZKbTl5R1Z5ZVp0YlhzUzZuNmlNOFJEam96OFg0YjlGTEpLcWlObHNHRjJvbFAyN0dWcnFMcjFoSk5RZ1grU3dhOFRWeGdXSWxVcWI0SExYYXJDZU9OdnFZcUFtUExaNnB3anppZHhkbWRUMEhBVnZXQytGTzVTYnhlMTByWksvOVUrVk1JK1BtYTdRWUVrYnY3b1J1Y3NwTy9MSW1xT1V4akJvM2JLV25FTTlmMFh2Q2QxY0RnZ25nZzlQdXpuN2JZUzNNd0xKb0pXMGNBeE1oNVBZVmZhSUh2UnNob1NNM0dXUEs1RlQwNmFmb0R2VDJmOVBpd0RPbVRvaHcrRXpxRVdQMVRhNlpQeGNUWjFOdDh1cGlQL21JRWU0b04xTExjeklwRExRM1d5ZnFUbk52dE04TCtlcGJYTWJWZ3dFSkkvczEyZXJZRnI2bjVXVnhVSGVlMVFVdVNDdnpGdVRuZjlCc1hzdG9nRnJFOXR3SnVwTnoxa2YvL3o5SDJWN2lrL3lDbEVEUGlJaXE3eENnWTlJcGFvTGcyMmVzdWo5RDAwdVBDUkxFSDkyRVpmNzR1N0JXMWk3azhpLytRSndMNjY3eUZGRmtuUFliWWlNNGlwVFJqNXFPU2RyNzRnMzNGcXpTdG5mN1NMR2FtazJkd0JwdlB0U1JwZk96T2lBMzZpLy9MRGpRSHJMcE9LZEZrbU9ZOEI0VW03SGJjREVZUkorVHd3RjZHamdyVVluNy9XRWlTbXdvTWNtaFRCNDQ0U1lqSlJNVGJCcncyWTdUMjVkUENoUDl5cENpanJuTlVTYXhuMUZ0THlndGFBQmZJTnE4YnF5VUJNZHpzN2VIMTVJbi9oQlNNZ1dMNlJEWVJMd2NaSk1GdWx3TnVNWTB5emVESHpEdVNTclZESmlQUW1BQis1Wmo4K1RIbVNNRmtFd1JNdUY1NTJiZFZJNDM1VmFNc1A4eXZFL1l5bFVIU2pTWTRHam9sd2tOVTJ6WkUydW9sS0t1QjY0UkRnbEpwZlU2SWlZRXVsMVhQUkhKa2Fpb3Z0YXVNcWppdENWUlp0V0tsUmtVVSsrWFV4ejc2emYwOWVZTkpKSkFuU1pKdWlLaFR0VWZuZXVMTE9jWm50eHJXR2FNM2p0QUFBQUFRQUZXQzQxTURrQUFBTXlNSUlETGpDQ0FoYWdBd0lCQWdJSkFJOStxMDJlUmRobE1BMEdDU3FHU0liM0RRRUJDd1VBTUVReEN6QUpCZ05WQkFZVEFsVlRNUWt3QndZRFZRUUlFd0F4Q1RBSEJnTlZCQWNUQURFSk1BY0dBMVVFQ2hNQU1Ra3dCd1lEVlFRTEV3QXhDVEFIQmdOVkJBTVRBREFnRncweU5qQXpNVFV5TVRVM016TmFHQTh5TURVek1EY3pNVEl4TlRjek0xb3dSREVMTUFrR0ExVUVCaE1DVlZNeENUQUhCZ05WQkFnVEFERUpNQWNHQTFVRUJ4TUFNUWt3QndZRFZRUUtFd0F4Q1RBSEJnTlZCQXNUQURFSk1BY0dBMVVFQXhNQU1JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBdkJaWXpOUzBubHdWSlBOQTR4T1ZKZmM3ZU1mZlRtYXREb3oyRmFiazUrWEUvV21wSE1pc0U0UTZrZmx6S0x5blBSSUY2b2FralgvcjlmTmpQb0wxelJIZlNEbkFlcy9uR25Pc2VTWmt2K1RFN2RHR1FiWlFUbkhBdk92MWsya1RpQlNoOGQ5blBuT0dvbFREMEwxaHBiUm43TTNza3E3MnlCTUpLOEF6VEpYMkxqcnJSTUsrNWJVcGdRUllrMFdIam5jUDBqRFFYblNpcUdwbHJWSVBsZ0kxdHZIN0h1b3lwUHJwUGRvYjFGSG0yZjNBWXhBQSt1WWwwWE9NYzQwS0laZkNCd1BSUmVjSHZGK3NRdEFYMExYYVpuZWhGVXV3c2NGNVU4aGYwUmtMZGxmWi9UYjBTN3M4cTBRQXp0T3REVVg3aFZDRzdsY01YdXg1WkF2aXl3SURBUUFCb3lFd0h6QWRCZ05WSFE0RUZnUVVmNlVWb296ZlgrY3F6VXR3bFByUmFsMjVhR0l3RFFZSktvWklodmNOQVFFTEJRQURnZ0VCQUltOWI0dGdwRU9ZK0VyQTZ4eUVhMEJteE1KL0hDbzNuYzFWSGpSUEMyMk5sc1J1Q3NLR3hsMTRjc1ZWTnJ4N1ErVFZBODVBNzBhRkMrS2NaUWtzNGVxYS9yaW5tTW5Ld2FUZnBTbkhSR1hNaVp3Rjg4WWlzL3o5cTRxRjhSR2NMRjkxTU5idFVwWStoY1FCcjB6M2pad01WY1F4cDgxdFdnVnJReGhYNjJyNnRIVk9VTnN4U0xiWHQ5RHB0TmRwREo5anM4ejk1Q3dHZXpNa2tKc3Y5NFg0em1NTFMxOXFyS2oyMjkxZENtdCsvbDRVaUQvNXhxR1JadW1FcE5jMWxNUUtqNmNPSnorWXpYZ3BGSTRJVzFTRFI0Y0F0clJ3WXRhdVhsVHFnbmc1YlVqL3MwYVpmR3h3VDJBQS9GQWZFTkNRZ1BxOHZyeFlCQVF0UzVNL2JzeE05SURXQmZ2Z09hMHpacUkrVFZNdjBIV0JTdz09Iiwia2V5c3RvcmVQYXNzd29yZCI6ImJlYzAxOTRhOGRjM2RmOTY3MmM5YjEyZGQ2ZWNlZTQyIiwia2V5QWxpYXMiOiJhMDk1M2E5ODRhZGE1ZTA0ODQ3ZGM5NWM4ZjE5YTNiMSIsImtleVBhc3N3b3JkIjoiYjg3YmRlMWQyNDA3Y2UyZDc1ODM1MzdjN2ZjZTVkYmQifX19LCJ1cGRhdGVzIjp7fSwiYnVpbGRUeXBlIjoiYXBrIiwidXNlcm5hbWUiOiJtdWR6YWh1ZCIsImV4cGVyaW1lbnRhbCI6e30sIm1vZGUiOiJidWlsZCIsInRyaWdnZXJlZEJ5IjoiRUFTX0NMSSIsImFwcElkIjoiYTY5N2M1MDYtODQyNi00MDY0LTk5ZDgtNzgwZjlmYzcwNzAwIiwiaW5pdGlhdGluZ1VzZXJJZCI6ImMwYWU2ZWJiLWM1MzItNDc5YS1hNGM4LTIxNGUxOTE0ZTEwOCJ9LCJtZXRhZGF0YSI6eyJ0cmFja2luZ0NvbnRleHQiOnsidHJhY2tpbmdfaWQiOiI2N2ZmMjUyZS01OTU2LTQ2YmItYTE1My05ZDIyY2ZmMGNmNGMiLCJwbGF0Zm9ybSI6ImFuZHJvaWQiLCJzZGtfdmVyc2lvbiI6IjU1LjAuMCIsImFjY291bnRfaWQiOiIyOThmZmFhOS04NmIyLTRjZTctODcyYy1iNDIwODllYmZiODYiLCJwcm9qZWN0X2lkIjoiYTY5N2M1MDYtODQyNi00MDY0LTk5ZDgtNzgwZjlmYzcwNzAwIiwicHJvamVjdF90eXBlIjoibWFuYWdlZCIsImRldl9jbGllbnQiOmZhbHNlLCJkZXZfY2xpZW50X3ZlcnNpb24iOiI1NS4wLjM3Iiwibm9fd2FpdCI6ZmFsc2UsInJ1bl9mcm9tX2NpIjpmYWxzZSwibG9jYWwiOnRydWV9LCJhcHBCdWlsZFZlcnNpb24iOiIxIiwiYXBwVmVyc2lvbiI6IjEuMC4wIiwiY2xpVmVyc2lvbiI6IjE5LjAuNSIsIndvcmtmbG93IjoibWFuYWdlZCIsImNyZWRlbnRpYWxzU291cmNlIjoicmVtb3RlIiwic2RrVmVyc2lvbiI6IjU1LjAuMCIsImZpbmdlcnByaW50SGFzaCI6IjgyMjNmOGU0YTkzYzZiN2NlZWVjNzUwNDY0OWI4ZjI2ZmFiOGFhNmQiLCJyZWFjdE5hdGl2ZVZlcnNpb24iOiIwLjgzLjEwIiwiZXhwb1BhY2thZ2VWZXJzaW9uIjoiNTUuMC4yOCIsImRpc3RyaWJ1dGlvbiI6InN0b3JlIiwiYXBwTmFtZSI6IkJlYXV0eSBTYWxvbiBOZWpyYSIsImFwcElkZW50aWZpZXIiOiJjb20uYmVhdXR5c2Fsb24ubmVqcmEiLCJidWlsZFByb2ZpbGUiOiJwcm9kdWN0aW9uIiwiZ2l0Q29tbWl0SGFzaCI6ImE3Mzg5NDA3NTZhZjg3M2RiNDA3M2EwM2FlNzU3Njg1MGM2YThiZGEiLCJnaXRDb21taXRNZXNzYWdlIjoiTm92aSB3b3JrZmxvdyIsImlzR2l0V29ya2luZ1RyZWVEaXJ0eSI6dHJ1ZSwidXNlcm5hbWUiOiJtdWR6YWh1ZCIsInJ1bldpdGhOb1dhaXRGbGFnIjp
