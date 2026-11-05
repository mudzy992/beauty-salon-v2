import { Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
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
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{displayLabel}</p>
            <Badge variant={isCustomized ? 'success' : 'secondary'} className="text-[10px]">
              {statusLabel}
            </Badge>
          </div>
          <p className="mb-1 font-mono text-xs text-slate-400">{def.key}</p>
          {hasValue && def.type === 'image' ? (
            <MediaImage src={getUploadUrl(value)} alt={displayLabel} className="mt-2 max-h-20 w-auto rounded-md object-cover" />
          ) : null}
          {hasValue && def.type === 'color' ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="h-5 w-5 rounded border" style={{ backgroundColor: value }} aria-hidden />
              <p className="text-sm">{value}</p>
            </div>
          ) : null}
          {hasValue && def.type !== 'image' && def.type !== 'color' ? (
            <p className="line-clamp-2 rounded-md bg-slate-50 p-2 text-sm dark:bg-slate-900/40">
              {value}
              {def.suffix ? <span className="ml-1 text-slate-400">{def.suffix}</span> : null}
            </p>
          ) : null}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          {hasValue ? t('common.edit') : t('adminSettings.editor.configure')}
        </Button>
      </div>
    </Card>
  )
}
