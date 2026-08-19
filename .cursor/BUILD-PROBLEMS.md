# Code: ReservationScreen.tsx

  321 |

  322 |   const goBackToOrigin = useCallback(() => {

> 323 |     if (navigation.canGoBack()) {

      |                             ^

  324 |       navigation.goBack();

  325 |       return;

  326 |     }

Call Stack

  goBackToOrigin (src\screens\client\ReservationScreen.tsx:323:29)

  handleBack (src\screens\client\ReservationScreen.tsx:347:21)

  BackHandler.addEventListener$argument_1 (src\screens\client\ReservationScreen.tsx:374:17)
