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
  type: SettingType
  placeholder?: string
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

export const GROUP_ICON_TEXT: Record<string, string> = {
  orange: 'text-orange-500',
  purple: 'text-purple-500',
  blue: 'text-blue-500',
  green: 'text-emerald-500',
  pink: 'text-pink-500',
  gray: 'text-slate-500',
  teal: 'text-teal-500',
  cyan: 'text-cyan-500',
  red: 'text-rose-500',
}
