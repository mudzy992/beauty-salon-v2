import { useRef, useState, useCallback } from 'react'

interface BeforeAfterSliderProps {
  beforeSrc: string
  afterSrc: string
  alt?: string
  aspectRatio?: number
}

/**
 * Before/After slider: vertikalna linija (handle) se pomiče lijevo/desno.
 * "After" slika je fiksirana (clip se širi/sužava), bez klizanja jedne preko druge.
 */
export function BeforeAfterSlider({ beforeSrc, afterSrc, alt = '', aspectRatio = 4 / 3 }: BeforeAfterSliderProps) {
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
      className="relative w-full overflow-hidden rounded-xl bg-slate-200 cursor-col-resize select-none"
      onMouseDown={onMouseDown}
      onTouchMove={onTouchMove}
      onTouchStart={(e) => e.touches[0] && handleMove(e.touches[0].clientX)}
      style={{ touchAction: 'none', aspectRatio }}
    >
      {/* Before – cijela slika u pozadini */}
      <div className="absolute inset-0">
        <img src={beforeSrc} alt={alt} className="h-full w-full object-cover" />
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
            backgroundImage: `url(${afterSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'left center',
            backgroundRepeat: 'no-repeat',
          }}
          aria-hidden
        />
      </div>
      {/* Slider handle – vertikalna linija */}
      <div
        className="absolute top-0 h-full w-1 bg-white shadow-[0_0_12px_rgba(0,0,0,0.4)] -translate-x-1/2 pointer-events-none z-[2]"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow-md border-2 border-slate-200 flex items-center justify-center text-lg pointer-events-none">
          ⟷
        </div>
      </div>
    </div>
  )
}
