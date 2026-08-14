import { useState } from 'react'
import { Card } from '../../components/ui/card'
import { Switch } from '../../components/ui/switch'
import type { AppSetting, SettingDef } from './types'

export function SettingEditorBoolean({
  def,
  setting,
  onSave,
}: {
  def: SettingDef
  setting: AppSetting | undefined
  onSave: (key: string, value: string, desc: string) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const isOn = (setting?.value ?? 'false').toLowerCase() === 'true'
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{def.desc}</p>
          <p className="mt-0.5 font-mono text-xs text-slate-400">{def.key}</p>
        </div>
        <Switch
          checked={isOn}
          disabled={saving}
          onCheckedChange={async (checked) => {
            setSaving(true)
            try {
              await onSave(def.key, checked ? 'true' : 'false', def.desc)
            } finally {
              setSaving(false)
            }
          }}
        />
      </div>
    </Card>
  )
}
