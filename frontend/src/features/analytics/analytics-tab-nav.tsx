import { useTranslation } from 'react-i18next'
import { TabsList, TabsTrigger } from '../../components/ui/tabs'

export const ANALYTICS_TABS = ['overview', 'clients', 'stylists'] as const

export type AnalyticsTab = (typeof ANALYTICS_TABS)[number]

export const isAnalyticsTab = (value: string | null): value is AnalyticsTab =>
  !!value && (ANALYTICS_TABS as readonly string[]).includes(value)

/** The sidebar links remain deep links; this tablist controls the local panels. */
export function AnalyticsTabNav() {
  const { t } = useTranslation()
  return (
    <TabsList aria-label={t('adminAnalytics.tabsLabel')} className="h-auto max-w-full flex-wrap justify-start gap-1">
      {ANALYTICS_TABS.map(tab => (
        <TabsTrigger key={tab} value={tab}>{t(`adminAnalytics.tabs.${tab}`)}</TabsTrigger>
      ))}
    </TabsList>
  )
}
