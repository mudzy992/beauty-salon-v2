import React, { useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, useWindowDimensions } from 'react-native';
import { MediaImage } from './MediaImage';
import { useTheme } from '../hooks/useTheme';
import { borderRadius } from '../theme';

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  width?: number;
  height?: number;
}

const HANDLE_HIT = 44;

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  width: widthProp,
  height: heightProp,
}: BeforeAfterSliderProps) {
  const { width: winW } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const width = widthProp ?? winW * 0.85;
  const height = heightProp ?? width;

  const [position, setPosition] = useState(0.5);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, g) => {
        const x = Math.max(0, Math.min(1, g.x0 / width));
        setPosition(x);
      },
      onPanResponderMove: (_, g) => {
        const currentX = g.x0 + g.dx;
        const x = Math.max(0, Math.min(1, currentX / width));
        setPosition(x);
      },
    }),
  ).current;

  const lineColor = isDark ? colors.gray100 : colors.white;
  const knobBorder = colors.border;

  return (
    <View
      style={[styles.container, { width, height, borderRadius: borderRadius.lg }]}
      {...panResponder.panHandlers}
    >
      <MediaImage uri={beforeSrc} style={styles.beforeImage} />
      <View style={[styles.afterClip, { width: width * position }]}>
        <MediaImage
          uri={afterSrc}
          style={[styles.afterImage, { width }]}
        />
      </View>
      <View style={[styles.handleLine, { left: width * position - 2, backgroundColor: lineColor }]}>
        <View style={[styles.handleKnob, { borderColor: knobBorder, backgroundColor: colors.card }]}>
          <View style={[styles.handleGrip, { backgroundColor: colors.primary }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  beforeImage: {
    ...StyleSheet.absoluteFill,
    width: undefined,
    height: undefined,
  },
  afterClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    overflow: 'hidden',
  },
  afterImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
  },
  handleLine: {
    position: 'absolute',
    top: 0,
    width: 4,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 0 10px rgba(0,0,0,0.25)',
  },
  handleKnob: {
    width: HANDLE_HIT,
    height: HANDLE_HIT,
    borderRadius: HANDLE_HIT / 2,
    borderWidth: 2,
    borderCurve: 'continuous',
    justifyContent: 'center',
    alignItems: 'center',
  },
  handleGrip: {
    width: 4,
    height: 22,
    borderRadius: 2,
  },
});
