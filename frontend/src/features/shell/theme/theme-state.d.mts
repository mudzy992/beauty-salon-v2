export type ThemeChoice = 'classic' | 'aurum-light' | 'aurum-dark';
export type ThemeSkin = 'classic' | 'aurum';
export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY: string;
export const THEME_CHOICES: readonly ThemeChoice[];
export const THEME_META: Record<
  ThemeChoice,
  { skin: ThemeSkin; mode: ThemeMode; themeColor: string }
>;

export function normalizeTheme(value: unknown): ThemeChoice;
export function readStoredTheme(
  storage: Pick<Storage, 'getItem'> | null | undefined,
): ThemeChoice;
export function writeStoredTheme(
  storage: Pick<Storage, 'setItem'> | null | undefined,
  choice: unknown,
): ThemeChoice;
export function applyTheme(
  root: HTMLElement,
  choice: unknown,
  doc?: Document,
): ThemeChoice;
