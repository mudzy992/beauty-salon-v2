import { useRef, useState, useCallback } from 'react'
import { ChevronsLeftRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { MediaImage } from './media-image'
import { cssBackgroundImage } from '../constants/media-fallback'

interface BeforeAfterSliderProps {
  beforeSrc: string
  afterSrc: string
  alt?: string
  aspectRatio?: number
  ariaLabel?: string
}

/**
 * Before/After slider: vertikalna linija (handle) se pomiče lijevo/desno.
 * "After" slika je fiksirana (clip se širi/sužava), bez klizanja jedne preko druge.
 */
export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  alt = '',
  aspectRatio = 4 / 3,
  ariaLabel,
}: BeforeAfterSliderProps) {
  const { t } = useTranslation()
  const [position, setPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMove = useCallback(
    (clientX: number) => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
      setPosition(x)
    },
    [],
  )

  const handleStep = useCallback((delta: number) => {
    setPosition((p) => Math.max(0, Math.min(100, p + delta)))
  }, [])

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      handleMove(e.clientX)
      const onMouseMove = (e: MouseEvent) => handleMove(e.clientX)
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [handleMove],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches[0]) handleMove(e.touches[0].clientX)
    },
    [handleMove],
  )

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label={ariaLabel ?? t('public.beforeAfter.sliderLabel')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      aria-valuetext={t('public.beforeAfter.positionValue', { position: Math.round(position) })}
      tabIndex={0}
      className="relative w-full overflow-hidden rounded-2xl bg-slate-100 cursor-col-resize select-none ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
      onMouseDown={onMouseDown}
      onTouchMove={onTouchMove}
      onTouchStart={(e) => e.touches[0] && handleMove(e.touches[0].clientX)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          handleStep(-2)
          return
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          handleStep(2)
          return
        }
        if (e.key === 'Home') {
          e.preventDefault()
          setPosition(0)
          return
        }
        if (e.key === 'End') {
          e.preventDefault()
          setPosition(100)
          return
        }
      }}
      style={{ touchAction: 'none', aspectRatio }}
    >
      {/* Before – cijela slika u pozadini */}
      <div className="absolute inset-0">
        <MediaImage src={beforeSrc} alt={alt} className="h-full w-full object-cover" />
      </div>
      {/* After – samo clip po širini (position%); slika fiksirana backgroundom da ne klizi */}
      <div
        className="absolute top-0 left-0 h-full overflow-hidden z-[1]"
        style={{ width: `${position}%` }}
      >
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: position > 0 ? `${10000 / position}%` : '100%',
            backgroundImage: cssBackgroundImage(afterSrc),
            backgroundSize: 'cover',
            backgroundPosition: 'left center',
            backgroundRepeat: 'no-repeat',
          }}
          aria-hidden
        />
      </div>
      {/* Slider handle – vertikalna linija */}
      <div
        className="absolute top-0 h-full w-px bg-white/90 shadow-[0_0_0_1px_rgba(15,23,42,0.12)] -translate-x-1/2 pointer-events-none z-[2]"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="h-10 w-10 rounded-full bg-white/95 shadow-soft ring-1 ring-slate-900/10 flex items-center justify-center">
            <ChevronsLeftRight className="h-4 w-4 text-slate-700" />
          </div>
        </div>
      </div>
    </div>
  )
}
