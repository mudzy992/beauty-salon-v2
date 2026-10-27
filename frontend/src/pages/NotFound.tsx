import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Button } from '../components/ui/button'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <div className="text-6xl font-semibold text-slate-700">404</div>
        <div className="text-lg text-slate-600">{t('common.pageNotFound')}</div>
        <Link to="/">
          <Button size="lg">{t('common.backHome')}</Button>
        </Link>
      </div>
    </div>
  )
}
