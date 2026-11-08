import { useTranslation } from 'react-i18next'

type SkipLinkProps = {
  /** Id elementa na koji link skače. Mora imati `tabIndex={-1}`. */
  targetId?: string
}

/**
 * WCAG 2.4.1 Bypass blocks — prvi element u tab redu, vizuelno skriven dok ne dobije fokus.
 * Stil je u `styles/globals.css` (`.skip-link`) da bi radio i bez Tailwind sloja.
 */
export const SkipLink = ({ targetId = 'main' }: SkipLinkProps) => {
  const { t } = useTranslation()

  return (
    <a href={`#${targetId}`} className="skip-link">
      {t('shell.skipToContent')}
    </a>
  )
}
