import { useState } from 'react'
import { SettingEditorBoolean } from './setting-editor-boolean'
import { SettingEditorDisplay } from './setting-editor-display'
import { SettingEditorForm } from './setting-editor-form'
import type { AppSetting, SettingDef } from './types'

export function SettingEditor({
  def,
  setting,
  onSave,
}: {
  def: SettingDef
  setting: AppSetting | undefined
  onSave: (key: string, value: string, desc: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  if (def.type === 'boolean') {
    return <SettingEditorBoolean def={def} setting={setting} onSave={onSave} />
  }
  if (!editing) {
    return <SettingEditorDisplay def={def} setting={setting} onEdit={() => setEditing(true)} />
  }
  return (
    <SettingEditorForm
      def={def}
      setting={setting}
      onSave={async (k, v, d) => {
        await onSave(k, v, d)
        setEditing(false)
      }}
      onCancel={() => setEditing(false)}
    />
  )
}
