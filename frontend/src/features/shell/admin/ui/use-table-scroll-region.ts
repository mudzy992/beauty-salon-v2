import { useEffect, useRef } from 'react'

/** Make an overflowing Aurum table region reachable by keyboard, without an extra tab stop otherwise. */
export function useTableScrollRegion() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const region = ref.current
    if (!region) return
    const update = () => {
      const aurum = document.documentElement.dataset.skin === 'aurum'
      if (aurum && getComputedStyle(region).overflowX === 'auto' && region.scrollWidth > region.clientWidth) {
        region.tabIndex = 0
      } else {
        region.removeAttribute('tabindex')
      }
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(region)
    if (region.firstElementChild) observer.observe(region.firstElementChild)
    return () => observer.disconnect()
  })
  return ref
}
