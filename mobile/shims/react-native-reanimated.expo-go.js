import React from 'react';
import { Image, ScrollView, Text, View } from 'react-native';

const createChain = () => {
  const chain = {
    delay: () => chain,
    duration: () => chain,
    springify: () => chain,
    damping: () => chain,
    stiffness: () => chain,
    mass: () => chain,
  };
  return chain;
};

export const FadeInDown = createChain();
export const FadeInUp = createChain();
export const FadeInRight = createChain();
export const LinearTransition = createChain();

export const useSharedValue = (initial) => React.useRef({ value: initial }).current;

export const useAnimatedStyle = (updater) => {
  try {
    return typeof updater === 'function' ? updater() : {};
  } catch {
    return {};
  }
};

export const withTiming = (toValue) => toValue;
export const withSpring = (toValue) => toValue;
export const withRepeat = (animation) => animation;
export const withSequence = (first, ...rest) => (rest.length ? rest[rest.length - 1] : first);

export const Easing = {
  linear: (t) => t,
  ease: (t) => t,
  inOut: (fn) => fn || ((t) => t),
  in: (fn) => fn || ((t) => t),
  out: (fn) => fn || ((t) => t),
};

export const createAnimatedComponent = (Component) => Component;

const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  createAnimatedComponent,
};

export default Animated;

export const ReduceMotion = {
  System: 'system',
  Always: 'always',
  Never: 'never',
};

export const SensorType = {};
export const IOSReferenceFrame = {};
export const InterfaceOrientation = {};

export const useAnimatedProps = () => ({});
export const useAnimatedReaction = () => {};
export const useAnimatedScrollHandler = () => () => {};
export const useDerivedValue = (updater) => {
  try {
    return { value: typeof updater === 'function' ? updater() : updater };
  } catch {
    return { value: undefined };
  }
};
export const useEvent = () => ({});
export const useHandler = () => ({});
export const useReducedMotion = () => ({ value: false });
export const cancelAnimation = () => {};
export const interpolate = (value) => value;
export const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };
export const scrollTo = () => {};
export const runOnUI = (fn) => fn;
export const runOnJS = (fn) => fn;
