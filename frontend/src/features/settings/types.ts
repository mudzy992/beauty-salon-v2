import type { LucideIcon } from 'lucide-react'

export type SettingType =
  | 'text'
  | 'textarea'
  | 'boolean'
  | 'number'
  | 'url'
  | 'image'
  | 'email'
  | 'color'
  | 'select'

export type RegistryItem = {
  key: string
  scope: 'PUBLIC' | 'PRIVATE'
  type: 'string' | 'boolean' | 'number' | 'json'
  isSecret?: boolean
  defaultValue?: string
  min?: number
  max?: number
}

export interface AppSetting {
  key: string
  value: string | null
  description: string | null
  isSecret?: boolean
  isConfigured?: boolean
  scope?: 'PUBLIC' | 'PRIVATE'
  type?: 'string' | 'boolean' | 'number' | 'json'
}

export interface SettingDef {
  key: string
  desc: string
  label?: string
  type: SettingType
  placeholder?: string
  helpText?: string
  min?: number
  max?: number
  suffix?: string
  options?: { value: string; label: string }[]
}

export interface SettingGroup {
  label: string
  prefix: string
  description: string
  icon: LucideIcon
  color: string
  defaults: SettingDef[]
}

/**
 * Boja ikone grupe postavki.
 *
 * S9 (2026-11-25): osam „rainbow“ klasa (`text-orange-500` …) zamijenjeno je
 * semantičkim tokenima. Razlozi:
 *  1. **1.4.11** — svih osam je bilo ispod praga 3:1 na bijeloj pozadini
 *     (orange 2.80, teal 2.49, emerald 2.54, cyan 2.43, pink 3.53, rose 3.67,
 *     blue 3.68; prolazio je samo purple 4.23). Ove ikone su dekorativne
 *     (`aria-hidden`), ali isti standard kod repozitorija već primjenjuje na
 *     ikone u `allowlist` (npr. „ikona (Trash2) aria-hidden, 3.67:1 ≥ 3:1“).
 *  2. **Tema** — palete nisu poštovale Aurum; semantički tokeni imaju izmjeren
 *     kontrast u oba Aurum režima (light 6.39–17.55:1, dark 8.45–15.60:1).
 *
 * Razlikovanje grupa i dalje nosi ikona (Lucide) i naziv grupe, pa boja ostaje
 * samo podređeno vizuelno ojačanje.
 */
export const GROUP_ICON_TEXT: Record<string, string> = {
  orange: 'text-warn-foreground',
  purple: 'text-neutral-foreground',
  blue: 'text-brand-rose-text',
  green: 'text-ok-foreground',
  pink: 'text-brand-rose-text',
  // 2026-11-18 (Faza C): text-slate-500 → text-content-muted (theme-aware in both Aurum modes).
  gray: 'text-content-muted',
  teal: 'text-info-foreground',
  cyan: 'text-info-foreground',
  red: 'text-bad-foreground',
}
