import React, { useRef, useState } from 'react';
import { View, Image, StyleSheet, PanResponder, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH * 0.85;
const SLIDER_HEIGHT = SLIDER_WIDTH;

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  width?: number;
  height?: number;
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  width = SLIDER_WIDTH,
  height = SLIDER_HEIGHT,
}: BeforeAfterSliderProps) {
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

  return (
    <View
      style={[styles.container, { width, height }]}
      {...panResponder.panHandlers}
    >
      <Image source={{ uri: beforeSrc }} style={styles.beforeImage} resizeMode="cover" />
      <View style={[styles.afterClip, { width: width * position }]}>
        <Image
          source={{ uri: afterSrc }}
          style={[styles.afterImage, { width }]}
          resizeMode="cover"
        />
      </View>
      <View style={[styles.handle, { left: width * position - 2 }]}>
        <View style={styles.handleKnob} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#eee',
  },
  beforeImage: {
    ...StyleSheet.absoluteFillObject,
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
  handle: {
    position: 'absolute',
    top: 0,
    width: 4,
    height: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handleKnob: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#eee',
  },
});
