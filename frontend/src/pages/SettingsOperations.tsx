import { SettingsModulePage } from '../features/settings/settings-module-page'
import { OPERATIONS_GROUPS } from '../features/settings/groups-operations'

export default function SettingsOperations() {
  return (
    <SettingsModulePage
      title="Postavke — Operacije"
      description="Zona, rezervacijski rokovi, podsjetnik prije termina i globalni push."
      groups={OPERATIONS_GROUPS}
    />
  )
}
