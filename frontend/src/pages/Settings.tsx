import { SettingsModulePage } from '../features/settings/settings-module-page'
import { SITE_GROUPS } from '../features/settings/groups-site'

export default function Settings() {
  return (
    <SettingsModulePage
      title="Postavke — Sajt"
      description="Sadržaj javnog weba, moduli i komentari. Email i loyalty su na svojim stranicama."
      groups={SITE_GROUPS}
    />
  )
}
