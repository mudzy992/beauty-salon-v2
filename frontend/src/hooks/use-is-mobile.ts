import { useEffect, useState } from 'react'

const MOBILE_QUERY = '(max-width: 767px)'

export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined'
      ? window.matchMedia(MOBILE_QUERY).matches
      : false,
  )

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY)
    const handleChange = () => setIsMobile(query.matches)
    handleChange()
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}
