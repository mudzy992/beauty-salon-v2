import React, { createContext, useContext, type RefObject } from 'react';
import type { View } from 'react-native';

// Shared BlurTargetView ref used by tab bar backgrounds (client + stylist).
// On Android, expo-blur needs a blurTarget to actually blur what's underneath.
export const BottomBlurTargetRefContext = createContext<RefObject<View | null> | null>(null);

export function BottomBlurTargetProvider({
  blurTargetRef,
  children,
}: {
  blurTargetRef: RefObject<View | null>;
  children: React.ReactNode;
}) {
  return <BottomBlurTargetRefContext.Provider value={blurTargetRef}>{children}</BottomBlurTargetRefContext.Provider>;
}

export function useBottomBlurTargetRef() {
  return useContext(BottomBlurTargetRefContext);
}

