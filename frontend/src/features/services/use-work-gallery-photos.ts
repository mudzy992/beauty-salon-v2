import { useCallback, useState } from 'react'
import { checkPhoto, type PhotoRejection } from './work-gallery-upload-types.mjs'

/**
 * Odabrane fotografije i njihova validacija.
 *
 * Datoteke se provjeravaju odmah (JPEG/PNG/WebP/GIF, najviše 10 MiB), pa se
 * nevaljan fajl nikad ne šalje backendu.
 */
export function useWorkGalleryPhotos() {
  const [beforeFile, setBeforeFile] = useState<File | null>(null)
  const [afterFile, setAfterFile] = useState<File | null>(null)
  const [beforeRejection, setBeforeRejection] = useState<PhotoRejection>(null)
  const [afterRejection, setAfterRejection] = useState<PhotoRejection>(null)

  const selectPhoto = useCallback((side: 'before' | 'after', file: File | null) => {
    if (side === 'before') {
      setBeforeFile(file)
      setBeforeRejection(file ? checkPhoto(file) : null)
    } else {
      setAfterFile(file)
      setAfterRejection(file ? checkPhoto(file) : null)
    }
  }, [])

  const clear = useCallback(() => {
    setBeforeFile(null)
    setAfterFile(null)
    setBeforeRejection(null)
    setAfterRejection(null)
  }, [])

  return {
    beforeFile,
    afterFile,
    beforeRejection,
    afterRejection,
    setBeforeRejection,
    setAfterRejection,
    selectPhoto,
    clear,
  }
}
