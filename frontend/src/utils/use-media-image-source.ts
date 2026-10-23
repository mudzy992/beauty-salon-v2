import { useEffect, useState } from 'react'
import api from '../api/client'

const isProtectedUploadUrl = (url: string): boolean =>
  url.includes('/api/uploads/content?')

export function useMediaImageSource(url: string): string {
  const [resolved, setResolved] = useState(() =>
    isProtectedUploadUrl(url) ? '' : url,
  )

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    if (!url || !isProtectedUploadUrl(url)) {
      setResolved(url)
      return () => {
        active = false
      }
    }

    setResolved('')
    api
      .get<Blob>(url, { responseType: 'blob' })
      .then(({ data }) => {
        if (!active) return
        objectUrl = URL.createObjectURL(data)
        setResolved(objectUrl)
      })
      .catch(() => {
        if (active) setResolved('')
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url])

  return resolved
}
