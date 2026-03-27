export type SettingScope = 'PUBLIC' | 'PRIVATE'

export type SettingValueType = 'string' | 'boolean' | 'number' | 'json'

export type SettingRegistryItem = Readonly<{
  key: string
  scope: SettingScope
  type: SettingValueType
  isSecret?: boolean
  defaultValue?: string
  min?: number
  max?: number
}>

