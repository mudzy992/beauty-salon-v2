import { useEffect, useState, type ImgHTMLAttributes } from 'react'

import { MEDIA_FALLBACK_SRC, resolveRemoteMediaUrl } from '../constants/media-fallback'

type MediaImageProps = ImgHTMLAttributes<HTMLImageElement>

export const MediaImage = ({ src, alt = '', onError, ...props }: MediaImageProps) => {
  const [failed, setFailed] = useState(false)
  const remote = resolveRemoteMediaUrl(typeof src === 'string' ? src : '')
  const resolved = !remote || failed ? MEDIA_FALLBACK_SRC : remote
  useEffect(() => {
    setFailed(false)
  }, [remote])
  return (
    <img
      {...props}
      src={resolved}
      alt={alt}
      onError={(event) => {
        if (resolved === MEDIA_FALLBACK_SRC) return
        setFailed(true)
        onError?.(event)
      }}
    />
  )
}
