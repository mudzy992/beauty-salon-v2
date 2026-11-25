import { useTranslation } from 'react-i18next'

import { AppReleaseCreateForm } from '../features/app-releases/app-release-create-form'
import { AppReleaseList } from '../features/app-releases/app-release-list'
import { useAppReleases } from '../features/app-releases/use-app-releases'

/**
 * Admin objave verzija aplikacije (S9).
 *
 * Stranica je **orkestrator**: stanje i akcije su u
 * `features/app-releases/use-app-releases.ts`, lista u `app-release-list.tsx`,
 * a forma (koja je već bila izdvojena u S7) ostaje gdje jeste. Endpointi,
 * poruke i markup su **nepromijenjeni**.
 */
export default function AppReleases() {
  const { t } = useTranslation()
  const releases = useAppReleases()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('appReleases.title')}</h1>
        <p className="mt-1 text-sm text-content-muted">{t('appReleases.subtitle')}</p>
      </div>
      <AppReleaseCreateForm
        file={releases.file}
        uploadMeta={releases.uploadMeta}
        version={releases.version}
        versionCode={releases.versionCode}
        minSupported={releases.minSupported}
        forceUpdate={releases.forceUpdate}
        publishNow={releases.publishNow}
        notes={releases.notes}
        saving={releases.saving}
        onFileChange={(f) => {
          releases.setFile(f)
          releases.setUploadMeta(null)
        }}
        onVersionChange={releases.setVersion}
        onVersionCodeChange={releases.setVersionCode}
        onMinSupportedChange={releases.setMinSupported}
        onForceChange={releases.setForceUpdate}
        onPublishNowChange={releases.setPublishNow}
        onNotesChange={releases.setNotes}
        onUpload={releases.handleUpload}
        onCreate={releases.handleCreate}
      />
      <AppReleaseList
        rows={releases.rows}
        loading={releases.loading}
        saving={releases.saving}
        onPublish={(id) => void releases.handlePublish(id)}
      />
    </div>
  )
}
