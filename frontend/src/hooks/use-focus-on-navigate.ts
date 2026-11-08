import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * WCAG 2.4.3 Focus order — nakon navigacije fokus prelazi na glavni sadržaj
 * umjesto da ostane na početku dokumenta.
 *
 * Prvo montiranje se preskače: na direktnom ulasku korisnik već ima fokus
 * gdje želi (npr. u adresnoj traci), pa ga ne smijemo oteti.
 */
export function useFocusOnNavigate(targetId = 'main') {
  const { pathname } = useLocation()
  const isFirstNavigation = useRef(true)

  useEffect(() => {
    if (isFirstNavigation.current) {
      isFirstNavigation.current = false
      return
    }

    const target = document.getElementById(targetId) ?? document.querySelector('main')
    target?.focus({ preventScroll: false })
  }, [pathname, targetId])
}
