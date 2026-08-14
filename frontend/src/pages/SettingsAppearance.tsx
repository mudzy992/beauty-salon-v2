import { SettingsModulePage } from '../features/settings/settings-module-page'
import { APPEARANCE_GROUPS } from '../features/settings/groups-appearance'

export default function SettingsAppearance() {
  return (
    <SettingsModulePage
      title="Postavke — Izgled"
      description="Logo, naziv i boje teme javnog sajta."
      groups={APPEARANCE_GROUPS}
    />
  )
}
