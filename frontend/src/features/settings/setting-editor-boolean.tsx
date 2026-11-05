import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import type { AppSetting, RegistryItem, SettingDef } from './types'

export function SettingEditorBoolean({
  def,
  setting,
  registry,
  onSave,
}: {
  def: SettingDef
  setting: AppSetting | undefined
  registry?: RegistryItem
  onSave: (key: string, value: string, desc: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [pendingValue, setPendingValue] = useState<boolean | null>(null)
  const displayLabel = def.label ?? def.desc
  const switchId = useId()
  const storedIsOn = (setting?.value ?? registry?.defaultValue ?? 'false').toLowerCase() === 'true'
  const isOn = pendingValue ?? storedIsOn

  useEffect(() => {
    setPendingValue(null)
  }, [setting?.value, registry?.defaultValue])

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Label htmlFor={switchId} className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-100">
          {displayLabel}
        </Label>
        {def.helpText ? <p className="mt-1 text-xs leading-5 text-slate-500">{def.helpText}</p> : null}
        <p className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium ${isOn ? 'text-emerald-700' : 'text-slate-500'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isOn ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
          {isOn ? t('adminSettings.editor.enabled') : t('adminSettings.editor.disabled')}
        </p>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2">
        {saving ? (
          <span role="status" className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {t('common.saving')}
          </span>
        ) : null}
        <Switch
          id={switchId}
          checked={isOn}
          disabled={saving}
          aria-label={displayLabel}
          onCheckedChange={async (checked) => {
            setPendingValue(checked)
            setSaving(true)
            try {
              await onSave(def.key, checked ? 'true' : 'false', def.desc)
            } catch {
              setPendingValue(null)
              // The settings hook already reports a localized save error.
            } finally {
              setSaving(false)
            }
          }}
        />
      </div>
    </div>
  )
}
