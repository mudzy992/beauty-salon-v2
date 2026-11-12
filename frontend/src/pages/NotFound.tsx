import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Button } from '../components/ui/button'
import { AuthCardHeader } from '../features/auth/auth-card-header'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <div data-aurum-page="not-found" data-aurum-auth-page className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center space-y-6" data-aurum-auth-card>
        <AuthCardHeader />
        <h1 className="text-6xl font-semibold text-slate-700">404</h1>
        <div className="text-lg text-slate-600">{t('common.pageNotFound')}</div>
        <Link to="/">
          <Button size="lg" data-aurum-cta="primary">{t('common.backHome')}</Button>
        </Link>
      </div>
    </div>
  )
}
