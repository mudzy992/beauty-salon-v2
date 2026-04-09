import { memo, useEffect, useMemo, useState } from 'react'

import { getUploadUrl } from '../../utils/uploadUrl'

type UploadedBrandLogoProps = {
  logoPath: string
  word: string
  svgColor: string
  textColor: string
  className?: string
}

const isSvgPath = (p: string) => p.trim().toLowerCase().endsWith('.svg')

const sanitizeSvg = (input: string): string => {
  let s = input
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
  s = s.replace(/\son\w+="[^"]*"/gi, '')
  s = s.replace(/\son\w+='[^']*'/gi, '')
  s = s.replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"')
  s = s.replace(/\sfill\s*=\s*["'][^"']*["']/gi, ' fill="currentColor"')
  s = s.replace(/\sstroke\s*=\s*["'][^"']*["']/gi, ' stroke="currentColor"')
  return s
}

export const UploadedBrandLogo = memo(
  ({ logoPath, word, svgColor, textColor, className }: UploadedBrandLogoProps) => {
    const logoUrl = useMemo(() => getUploadUrl(logoPath), [logoPath])
    const displayWord = useMemo(() => {
      const raw = String(word ?? '').trim()
      const oneWord = raw.split(/\s+/)[0] ?? ''
      const upper = oneWord.slice(0, 8).toLocaleUpperCase('bs-BA')
      return upper || 'LOGO'
    }, [word])
    const [svgMarkup, setSvgMarkup] = useState<string | null>(null)

    useEffect(() => {
      if (!isSvgPath(logoPath)) {
        setSvgMarkup(null)
        return
      }
      let cancelled = false
      fetch(logoUrl)
        .then((r) => r.text())
        .then((text) => {
          if (cancelled) return
          setSvgMarkup(sanitizeSvg(text))
        })
        .catch(() => {
          if (cancelled) return
          setSvgMarkup(null)
        })
      return () => {
        cancelled = true
      }
    }, [logoPath, logoUrl])

    return (
      <div className={['flex items-center gap-3', className].filter(Boolean).join(' ')}>
        {isSvgPath(logoPath) ? (
          <span
            aria-hidden="true"
            className="h-10 w-10 shrink-0"
            style={{ color: svgColor }}
            dangerouslySetInnerHTML={svgMarkup ? { __html: svgMarkup } : undefined}
          />
        ) : (
          <img
            src={logoUrl}
            alt={displayWord}
            className="h-10 w-10 shrink-0 object-contain"
            loading="lazy"
          />
        )}
        <span
          className="text-[22px] tracking-[0.22em] font-medium font-serif select-none"
          style={{ color: textColor }}
          aria-label={displayWord}
        >
          {displayWord}
        </span>
      </div>
    )
  },
)

UploadedBrandLogo.displayName = 'UploadedBrandLogo'

