import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { SettingGroup } from './types'

/**
 * Prevod definicije grupe postavki u lokalizovanu (S9).
 *
 * Izdvojeno iz `pages/Settings*.tsx` bez promjene: ista pravila (grupa bez mape
 * se vraća kakva jeste, polje bez labele se ne dodirava, a dodatne opcije /
 * sufiks se dodaju samo za određene ključeve).
 */
export function useSettingsGroups({
  groups,
  groupCopyKeys,
  fieldCopyKeys,
  placeholderCopyKeys,
  extra,
}: {
  groups: SettingGroup[]
  groupCopyKeys: Record<string, { label: string; description: string }>
  fieldCopyKeys: Record<string, string>
  placeholderCopyKeys?: Record<string, string>
  extra?: (def: SettingGroup['defaults'][number], t: (key: string) => string) => Partial<SettingGroup['defaults'][number]>
}) {
  const { t } = useTranslation()

  return useMemo(
    () =>
      groups.map((group) => {
        const copyKeys = groupCopyKeys[group.prefix]
        // Mapa je CI-pokrivena (`test:i18n-key-resolution`, test 5); ovi štitovi samo
        // sprječavaju bijeli ekran (`t(copyKeys.label)` na undefined baca TypeError) i
        // praznu labelu (`t(undefined)` vraća '') ako se mapa ikad razdvoji od izvora.
        if (!copyKeys) return group
        return {
          ...group,
          label: t(copyKeys.label),
          description: t(copyKeys.description),
          defaults: group.defaults.map((def) => {
            const fieldKey = fieldCopyKeys[def.key]
            const placeholderKey = placeholderCopyKeys?.[def.key]
            return {
              ...def,
              ...(fieldKey ? { label: t(fieldKey) } : {}),
              ...(placeholderKey ? { placeholder: t(placeholderKey) } : {}),
              ...(extra ? extra(def, t) : {}),
            }
          }),
        }
      }),
    [t, groups, groupCopyKeys, fieldCopyKeys, placeholderCopyKeys, extra],
  )
}
