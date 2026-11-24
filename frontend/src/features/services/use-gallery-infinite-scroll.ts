import { useEffect, type RefObject } from 'react'

export function useGalleryInfiniteScroll(ref: RefObject<HTMLDivElement>, enabled: boolean, offset: number, loadPage: (offset: number, append: boolean) => Promise<void>) {
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) void loadPage(offset, true)
    }, { rootMargin: '200px', threshold: 0.1 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, enabled, offset, loadPage])
}
