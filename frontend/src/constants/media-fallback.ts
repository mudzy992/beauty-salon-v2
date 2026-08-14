import { getUploadUrl } from '../utils/uploadUrl'

export const MEDIA_FALLBACK_SRC = '/brand/media-fallback.png'

export const resolveRemoteMediaUrl = (path?: string | null): string => {
  const p = path?.trim() ?? ''
  if (!p || p === MEDIA_FALLBACK_SRC) return ''
  if (p.startsWith('http') || p.startsWith('blob:') || p.startsWith('data:')) return p
  return getUploadUrl(p)
}

export const cssBackgroundImage = (url?: string | null): string => {
  const remote = resolveRemoteMediaUrl(url)
  if (!remote) return `url(${JSON.stringify(MEDIA_FALLBACK_SRC)})`
  return `url(${JSON.stringify(remote)}), url(${JSON.stringify(MEDIA_FALLBACK_SRC)})`
}
