import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import Constants from 'expo-constants';

type BarStyle = 'light' | 'dark';

export type SystemBarsStyle = {
  statusBar?: BarStyle;
  navigationBar?: BarStyle;
};

type SystemBarsProps = {
  style: BarStyle | SystemBarsStyle;
};

const isExpoGo =
  Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';

let NativeSystemBars: React.ComponentType<SystemBarsProps> | null = null;
if (!isExpoGo) {
  NativeSystemBars = require('react-native-edge-to-edge').SystemBars as React.ComponentType<SystemBarsProps>;
}

function resolveBars(style: SystemBarsProps['style']): { statusBar: BarStyle; navigationBar: BarStyle } {
  if (typeof style === 'string') {
    return { statusBar: style, navigationBar: style };
  }
  const statusBar = style.statusBar ?? 'light';
  return { statusBar, navigationBar: style.navigationBar ?? statusBar };
}

function ExpoGoSystemBars({ style }: SystemBarsProps) {
  const { statusBar, navigationBar } = resolveBars(style);
  useEffect(() => {
    const setStyle = NavigationBar.setStyle;
    if (typeof setStyle !== 'function') return;
    try {
      setStyle(navigationBar);
    } catch {
      // ignore
    }
  }, [navigationBar]);
  return <StatusBar style={statusBar} />;
}

export function SystemBars(props: SystemBarsProps) {
  if (NativeSystemBars) {
    return <NativeSystemBars {...props} />;
  }
  return <ExpoGoSystemBars {...props} />;
}
