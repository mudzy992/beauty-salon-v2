import type { ThemeChoice, ThemeMode } from './theme-state.mjs'
export const MODE_STORAGE_KEY: string
export const LEGACY_STORAGE_KEY: string
export function resolveTheme(skin: unknown, defaultMode: unknown, preference: unknown): ThemeChoice
export function readModePreference(storage: Pick<Storage, 'getItem'> | null | undefined): ThemeMode | null
export function writeModePreference(storage: Pick<Storage, 'setItem'> | null | undefined, mode: unknown): boolean
