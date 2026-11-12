import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { MediaImage } from '../../../components/media-image'
import { BeforeAfterSlider } from '../../../components/BeforeAfterSlider'

const MotionDiv = motion.div

export type BeforeAfterSpotlightPair = {
  id: string
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
}

const THUMB_ROW_H = 80

// Static, scrollable rails keep every thumbnail reachable without endless motion
// or duplicate focus stops. The selection interaction stays unchanged.
const MarqueeThumbColumn = ({ items, resolveBefore, resolveAfter, onSelect }: {
  items: { pair: BeforeAfterSpotlightPair; index: number }[]
  resolveBefore: (pair: BeforeAfterSpotlightPair) => string
  resolveAfter: (pair: BeforeAfterSpotlightPair) => string
  onSelect: (index: number) => void
}) => {
  const { t } = useTranslation()
  if (items.length === 0) {
    return <div className="hidden lg:block w-[min(100%,11rem)] shrink-0" aria-hidden />
  }
  return (
    <div className="hidden lg:flex flex-col gap-3 w-[min(100%,11rem)] shrink-0 overflow-y-auto rounded-2xl bg-slate-50/50 p-2" style={{ maxHeight: 'min(520px, 62vh)' }}>
      {items.map((row) => (
        <button
          key={row.pair.id}
          type="button"
          onClick={() => onSelect(row.index)}
          aria-label={t('public.beforeAfter.selectTransformationAria')}
          className="w-full shrink-0 overflow-hidden rounded-xl bg-white text-left shadow-sm ring-1 ring-slate-900/[0.06] transition hover:shadow-md hover:ring-slate-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15"
        >
          <div className="grid grid-cols-2 gap-px bg-slate-200">
            <MediaImage src={resolveBefore(row.pair)} alt="" className="h-20 w-full object-cover" height={THUMB_ROW_H} />
            <MediaImage src={resolveAfter(row.pair)} alt="" className="h-20 w-full object-cover" height={THUMB_ROW_H} />
          </div>
          <div className="px-2 py-1.5 text-center text-[10px] font-medium text-slate-500">{t('public.beforeAfter.comparisonLabels')}</div>
        </button>
      ))}
    </div>
  )
}

export interface BeforeAfterSpotlightProps {
  pairs: BeforeAfterSpotlightPair[]
  loading?: boolean
  resolveBefore: (pair: BeforeAfterSpotlightPair) => string
  resolveAfter: (pair: BeforeAfterSpotlightPair) => string
  emptyLabel?: string
  loadingLabel?: string
}

export const BeforeAfterSpotlight = ({
  pairs,
  loading = false,
  resolveBefore,
  resolveAfter,
  emptyLabel,
  loadingLabel,
}: BeforeAfterSpotlightProps) => {
  const { t } = useTranslation()
  const [selectedPairIndex, setSelectedPairIndex] = useState(0)

  useEffect(() => {
    setSelectedPairIndex((i) => {
      if (pairs.length === 0) return 0
      return i < pairs.length ? i : 0
    })
  }, [pairs])

  const selectedPair = pairs[selectedPairIndex] ?? pairs[0]
  const sideEntries = useMemo(
    () =>
      pairs.map((pair, index) => ({ pair, index })).filter((_, i) => i !== selectedPairIndex),
    [pairs, selectedPairIndex],
  )
  const leftRail = useMemo(
    () => sideEntries.filter((_, idx) => idx % 2 === 0),
    [sideEntries],
  )
  const rightRail = useMemo(
    () => sideEntries.filter((_, idx) => idx % 2 === 1),
    [sideEntries],
  )

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="py-12 text-center text-slate-600">
        {loadingLabel ?? t('public.beforeAfter.loading')}
      </div>
    )
  }

  if (!selectedPair) {
    return (
      <div className="py-12 text-center text-slate-500">
        {emptyLabel ?? t('public.beforeAfter.empty')}
      </div>
    )
  }

  return (
    <>
      <div data-aurum-spotlight className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-6 lg:gap-8">
        <MarqueeThumbColumn
          items={leftRail}
          resolveBefore={resolveBefore}
          resolveAfter={resolveAfter}
          onSelect={setSelectedPairIndex}
        />

        <div className="w-full max-w-md mx-auto lg:mx-0 lg:max-w-lg lg:flex-1 lg:min-w-0 flex justify-center">
          <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-2 sm:p-3 shadow-soft">
            <AnimatePresence mode="wait">
              <MotionDiv
                key={selectedPair.id}
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.985 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="w-full"
              >
                <BeforeAfterSlider
                  beforeSrc={resolveBefore(selectedPair)}
                  afterSrc={resolveAfter(selectedPair)}
                  alt={t('public.beforeAfter.comparisonLabels')}
                  aspectRatio={1}
                  ariaLabel={t('public.beforeAfter.selectedTransformation', {
                    current: selectedPairIndex + 1,
                    total: pairs.length,
                  })}
                />
              </MotionDiv>
            </AnimatePresence>
          </div>
        </div>

        <MarqueeThumbColumn
          items={rightRail}
          resolveBefore={resolveBefore}
          resolveAfter={resolveAfter}
          onSelect={setSelectedPairIndex}
        />
      </div>

      <div className="lg:hidden mt-6 -mx-4 px-4">
        {sideEntries.length > 0 ? (
          <>
            <p className="text-xs font-medium text-slate-500 mb-3 px-1">
              {t('public.beforeAfter.selectTransformation')}
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [scrollbar-width:thin]">
              {sideEntries.map(({ pair, index }) => (
                <button
                  key={pair.id}
                  type="button"
                  onClick={() => setSelectedPairIndex(index)}
                  className="snap-center shrink-0 w-[42vw] max-w-[200px] overflow-hidden rounded-xl border border-slate-200/90 bg-white text-left shadow-sm"
                  aria-label={t('public.beforeAfter.selectTransformationAria')}
                >
                  <div className="grid grid-cols-2 gap-px bg-slate-200">
                    <MediaImage
                      src={resolveBefore(pair)}
                      alt=""
                      className="h-20 w-full object-cover"
                    />
                    <MediaImage
                      src={resolveAfter(pair)}
                      alt=""
                      className="h-20 w-full object-cover"
                    />
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </>
  )
}
