import { Copy, ExternalLink, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/button'

type Props = {
  title: string
  shareUrl: string
  copied: boolean
  onShare: () => void
  onCopy: () => void
}

export function PublicBlogShare({ title, shareUrl, copied, onShare, onCopy }: Props) {
  const { t } = useTranslation()
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedTitle = encodeURIComponent(title)
  const links = [
    { href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, label: 'Facebook' },
    { href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`, label: 'X' },
    { href: `viber://forward?text=${encodedUrl}`, label: 'Viber' },
    { href: `https://wa.me/?text=${encodedUrl}`, label: 'WhatsApp' },
  ]
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onShare}>
        <Share2 className="mr-2 h-4 w-4" aria-hidden />
        {t('public.blogShare.share')}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCopy}>
        <Copy className="mr-2 h-4 w-4" aria-hidden />
        {copied ? t('public.blogShare.copied') : t('public.blogShare.copyLink')}
      </Button>
      {links.map((link) => (
        <Button key={link.label} asChild variant="ghost" size="sm">
          <a href={link.href} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4 opacity-70" aria-hidden="true" />
            {link.label}
            <span className="sr-only">{t('public.blogShare.opensInNewTab')}</span>
          </a>
        </Button>
      ))}
    </div>
  )
}
