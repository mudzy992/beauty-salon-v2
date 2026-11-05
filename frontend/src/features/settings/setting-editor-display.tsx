import { Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { MediaImage } from '../../components/media-image'
import { getUploadUrl } from '../../utils/uploadUrl'
import { getEffectiveSettingValue, isMeaningfullyConfigured } from './is-configured'
import type { AppSetting, RegistryItem, SettingDef } from './types'

export function SettingEditorDisplay({
  def,
  setting,
  registry,
  onEdit,
}: {
  def: SettingDef
  setting: AppSetting | undefined
  registry?: RegistryItem
  onEdit: () => void
}) {
  const { t } = useTranslation()
  const displayLabel = def.label ?? def.desc
  const value = getEffectiveSettingValue(setting, registry)
  const hasValue = value !== ''
  const isCustomized = isMeaningfullyConfigured(setting, registry)
  const statusLabel = isCustomized
    ? t('adminSettings.editor.customized')
    : hasValue
      ? t('adminSettings.editor.usingDefault')
      : t('adminSettings.editor.notConfigured')

  return (
    <div className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{displayLabel}</p>
          <Badge variant={isCustomized ? 'success' : 'secondary'} className="text-[10px]">
            {statusLabel}
          </Badge>
        </div>
        {def.helpText ? <p className="mt-1 text-xs leading-5 text-slate-500">{def.helpText}</p> : null}
        {hasValue && def.type === 'image' ? (
          <MediaImage src={getUploadUrl(value)} alt={displayLabel} className="mt-2 h-14 max-w-24 rounded-lg border border-slate-200 object-cover" />
        ) : null}
        {hasValue && def.type === 'color' ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="h-5 w-5 rounded-md border border-slate-300" style={{ backgroundColor: value }} aria-hidden="true" />
            <p className="font-mono text-xs text-slate-600">{value}</p>
          </div>
        ) : null}
        {hasValue && def.type !== 'image' && def.type !== 'color' ? (
          <p className="mt-2 max-w-3xl whitespace-pre-wrap break-words text-sm leading-5 text-slate-600 dark:text-slate-300">
            {value}
            {def.suffix ? <span className="ml-1 text-slate-400">{def.suffix}</span> : null}
          </p>
        ) : null}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEdit}
          aria-label={t('adminSettings.editor.editSetting', { label: displayLabel })}
        >
          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
          {hasValue ? t('common.edit') : t('adminSettings.editor.configure')}
        </Button>
      </div>
    </div>
  )
}
