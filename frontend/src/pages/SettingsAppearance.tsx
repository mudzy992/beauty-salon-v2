import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsModulePage } from '../features/settings/settings-module-page'
import { APPEARANCE_GROUPS } from '../features/settings/groups-appearance'
import { useTheme } from '../features/shell/theme/theme-context'

const APPEARANCE_GROUP_COPY_KEYS = {
  app_: {
    label: 'adminSettings.appearance.group',
    description: 'adminSettings.appearance.groupDescription',
  },
} as const

const APPEARANCE_FIELD_COPY_KEYS = {
  app_title: 'adminSettings.appearance.fields.appTitle',
  app_logo: 'adminSettings.appearance.fields.logo',
  app_logo_svg_color: 'adminSettings.appearance.fields.svgLogoColor',
  app_logo_text_color: 'adminSettings.appearance.fields.logoTextColor',
  app_logo_accent: 'adminSettings.appearance.fields.logoAccentColor',
  app_logo_animated: 'adminSettings.appearance.fields.animateLogo',
  theme_primary: 'adminSettings.appearance.fields.primarySiteColor',
  theme_accent: 'adminSettings.appearance.fields.siteAccentColor',
} as const

export default function SettingsAppearance() {
  const { t } = useTranslation()
  // Q9 / NEJRA §12 — dok je Aurum aktivan, runtime override nije aktivan; korisnik
  // to mora vidjeti upravo na Postavke → Izgled, bez promjene ikakvog API-ja.
  const { skin } = useTheme()
  const groups = useMemo(
    () =>
      APPEARANCE_GROUPS.map((group) => {
        const copyKeys = APPEARANCE_GROUP_COPY_KEYS[group.prefix as keyof typeof APPEARANCE_GROUP_COPY_KEYS]
        // Mapa je CI-pokrivena (`test:i18n-key-resolution`, test 5); ovi štitovi samo
        // sprječavaju bijeli ekran (`t(copyKeys.label)` na undefined baca TypeError) i
        // praznu labelu (`t(undefined)` vraća '') ako se mapa ikad razdvoji od izvora.
        if (!copyKeys) return group
        return {
          ...group,
          label: t(copyKeys.label),
          description: t(copyKeys.description),
          defaults: group.defaults.map((def) => {
            const fieldKey = APPEARANCE_FIELD_COPY_KEYS[def.key as keyof typeof APPEARANCE_FIELD_COPY_KEYS]
            return {
              ...def,
              ...(fieldKey ? { label: t(fieldKey) } : {}),
            }
          }),
        }
      }),
    [t],
  )

  return (
    <>
      {skin !== 'classic' ? (
        <p
          data-aurum-note
          role="note"
          className="mb-4 rounded-lg border border-control-border bg-surface-muted p-3 text-sm text-content"
        >
          {t('adminSettings.appearance.aurumNote')}
        </p>
      ) : null}
      <SettingsModulePage
        title={t('adminSettings.appearance.title')}
        description={t('adminSettings.appearance.description')}
        groups={groups}
      />
    </>
  )
}
