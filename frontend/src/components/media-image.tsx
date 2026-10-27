import { useEffect, useState, type ImgHTMLAttributes } from 'react'

import { MEDIA_FALLBACK_SRC, resolveRemoteMediaUrl } from '../constants/media-fallback'
import { useMediaImageSource } from '../utils/use-media-image-source'

type MediaImageProps = ImgHTMLAttributes<HTMLImageElement>

export const MediaImage = ({ src, alt = '', onError, ...props }: MediaImageProps) => {
  const [failed, setFailed] = useState(false)
  const remote = resolveRemoteMediaUrl(typeof src === 'string' ? src : '')
  const authorizedRemote = useMediaImageSource(remote)
  const resolved = !authorizedRemote || failed ? MEDIA_FALLBACK_SRC : authorizedRemote
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
