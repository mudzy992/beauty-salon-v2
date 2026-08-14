import { SettingsModulePage } from '../features/settings/settings-module-page'
import { SEO_GROUPS } from '../features/settings/groups-seo'

export default function SettingsSeo() {
  return (
    <SettingsModulePage
      title="Postavke — SEO"
      description="Title, description i OG slika. Canonical koristi osnovni URL sa kartice Sajt."
      groups={SEO_GROUPS}
    />
  )
}
