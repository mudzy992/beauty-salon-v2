import { Copy, ExternalLink, Share2 } from 'lucide-react'

import { Button } from '../../components/ui/button'

type Props = {
  title: string
  shareUrl: string
  copied: boolean
  onShare: () => void
  onCopy: () => void
}

export function PublicBlogShare({ title, shareUrl, copied, onShare, onCopy }: Props) {
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
        Dijeli
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCopy}>
        <Copy className="mr-2 h-4 w-4" aria-hidden />
        {copied ? 'Kopirano' : 'Kopiraj link'}
      </Button>
      {links.map((link) => (
        <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
          <Button type="button" variant="ghost" size="sm">
            {link.label !== 'Viber' && link.label !== 'WhatsApp' ? (
              <ExternalLink className="mr-2 h-4 w-4 opacity-70" aria-hidden />
            ) : null}
            {link.label}
          </Button>
        </a>
      ))}
    </div>
  )
}
