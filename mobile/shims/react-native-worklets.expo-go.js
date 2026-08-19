/**
 * Expo Go SDK 57 on Android 16 can SIGSEGV in libworklets.so during native init.
 * This shim keeps Reanimated imports working on the JS thread only.
 * https://github.com/expo/expo/issues/48390
 */

export const RuntimeKind = {
  ReactNative: 1,
  UI: 2,
  Worker: 3,
};

export const UIRuntimeId = 1;

const identity = (value) => value;
const invoke = (fn, ...args) => (typeof fn === 'function' ? fn(...args) : undefined);
const passthrough = (fn) => fn;

export const createSerializable = identity;
export const createShareable = identity;
export const createSynchronizable = identity;
export const createWorkletRuntime = () => ({});
export const executeOnUIRuntimeSync = invoke;
export const getUIRuntimeHolder = () => null;
export const getUISchedulerHolder = () => null;
export const isWorkletFunction = () => false;
export const makeShareable = identity;
export const runOnJS = passthrough;
export const runOnRuntime = passthrough;
export const runOnUI = passthrough;
export const runOnUISync = invoke;
export const scheduleOnRN = invoke;
export const scheduleOnUI = invoke;
export const serializableMappingCache = {
  set() {},
  get() {
    return null;
  },
};
export const toggleSlowAnimationsOnUIRuntime = () => {};
export const WorkletsModule = null;

const workletsShim = {
  RuntimeKind,
  UIRuntimeId,
  createSerializable,
  createShareable,
  createSynchronizable,
  createWorkletRuntime,
  executeOnUIRuntimeSync,
  getUIRuntimeHolder,
  getUISchedulerHolder,
  isWorkletFunction,
  makeShareable,
  runOnJS,
  runOnRuntime,
  runOnUI,
  runOnUISync,
  scheduleOnRN,
  scheduleOnUI,
  serializableMappingCache,
  toggleSlowAnimationsOnUIRuntime,
  WorkletsModule,
};

export default workletsShim;
