import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/badge'
import {
  adminNavGroups,
  isAdminNavItemActive,
  type AdminNavItem,
} from './admin-nav'

type Props = {
  pathname: string
  pendingBlogComments: number
  onNavigate?: () => void
  compact?: boolean
}

export const AdminNav = ({
  pathname,
  pendingBlogComments,
  onNavigate,
  compact = false,
}: Props) => {
  const { t } = useTranslation()
  const linkClass = (item: AdminNavItem) => {
    const active = isAdminNavItemActive(pathname, item)
    if (compact) {
      return active
        ? 'rounded-lg px-3 py-2 text-[15px] font-semibold text-brand-gold bg-brand-champagne/20'
        : 'rounded-lg px-3 py-2 text-[15px] text-slate-800 hover:text-brand-gold hover:bg-slate-50'
    }
    return active
      ? 'block rounded-md px-3 py-2 text-sm font-semibold text-brand-gold bg-brand-champagne/20'
      : 'block rounded-md px-3 py-2 text-sm text-slate-700 hover:text-brand-gold hover:bg-slate-50'
  }

  return (
    <nav className={compact ? 'grid gap-1' : 'space-y-4'}>
      {adminNavGroups.map((group) => (
        <div key={group.labelKey}>
          <p
            className={
              compact
                ? 'px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400'
                : 'px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400'
            }
          >
            {t(group.labelKey)}
          </p>
          <div className={compact ? 'grid gap-1' : 'grid gap-0.5'}>
            {group.items.map((item) => {
              const isBlog = item.path === '/admin/blog'
              const showPending = isBlog && pendingBlogComments > 0
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onNavigate}
                  className={linkClass(item)}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate">{t(item.labelKey)}</span>
                    {showPending ? (
                      <Badge className="bg-rose-600 text-white hover:bg-rose-600">
                        {pendingBlogComments}
                      </Badge>
                    ) : null}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
