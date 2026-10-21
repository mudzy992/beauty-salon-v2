import { memo, useMemo } from 'react'

import { MediaImage } from '../media-image'
import { getUploadUrl } from '../../utils/uploadUrl'

type UploadedBrandLogoProps = {
  logoPath: string
  word: string
  svgColor: string
  textColor: string
  className?: string
}

const isSvgPath = (path: string) => path.trim().toLowerCase().endsWith('.svg')

export const UploadedBrandLogo = memo(
  ({ logoPath, word, svgColor, textColor, className }: UploadedBrandLogoProps) => {
    const logoUrl = useMemo(() => getUploadUrl(logoPath), [logoPath])
    const svgMaskStyle = useMemo<React.CSSProperties>(() => {
      const maskUrl = `url("${encodeURI(logoUrl)}")`
      return {
        backgroundColor: svgColor,
        maskImage: maskUrl,
        WebkitMaskImage: maskUrl,
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
      }
    }, [logoUrl, svgColor])
    const displayWord = useMemo(() => {
      const raw = String(word ?? '').trim()
      const oneWord = raw.split(/\s+/)[0] ?? ''
      const upper = oneWord.slice(0, 8).toLocaleUpperCase('bs-BA')
      return upper || 'LOGO'
    }, [word])

    return (
      <div
        className={['uploaded-brand-logo flex items-center gap-3', className]
          .filter(Boolean)
          .join(' ')}
      >
        {isSvgPath(logoPath) ? (
          <span
            aria-hidden="true"
            className="h-10 w-10 shrink-0"
            style={svgMaskStyle}
          />
        ) : (
          <MediaImage
            src={logoUrl}
            alt={displayWord}
            className="h-10 w-10 shrink-0 object-contain"
            loading="lazy"
          />
        )}
        <span
          className="uploaded-brand-logo__word text-[22px] tracking-[0.22em] font-medium font-serif select-none"
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
