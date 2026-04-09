import { memo } from 'react'

export type AppLogoProps = {
  title?: string
  accent?: string
  svgColor?: string
  textColor?: string
  animated?: boolean
  className?: string
}

const WomanProfileIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Hair Silhouette */}
    <path d="M 50 2 C 30 2 15 18 15 40 C 15 55 22 70 20 90 C 18 95 20 98 25 98 C 32 98 38 90 42 80 C 48 65 52 55 65 52 C 78 48 88 35 88 20 C 88 8 70 2 50 2 Z" />
    {/* Face Profile Cutout */}
    <path d="M 45 18 C 38 18 32 25 32 32 C 32 35 30 38 27 40 C 30 42 32 45 32 50 C 32 53 30 56 27 58 C 30 60 32 64 32 68 C 32 75 38 82 45 85 C 55 88 58 80 58 72 C 58 65 52 60 45 58 C 38 55 38 48 45 45 C 52 42 55 35 55 28 C 55 20 50 18 45 18 Z" className="text-white dark:text-slate-900" fill="currentColor" />
  </svg>
)

export const AppLogo = memo(
  ({
    title = 'NEJRA',
    accent = '#5c2438',
    svgColor,
    textColor,
    animated = true,
    className,
  }: AppLogoProps) => {
    const raw = String(title ?? '').trim()
    const oneWord = raw.split(/\s+/)[0] ?? ''
    const word = oneWord.slice(0, 8).toLocaleUpperCase('bs-BA')
    const svgC = svgColor ?? accent
    const textC = textColor ?? accent
    return (
      <div
        className={['app-logo', animated ? 'app-logo--animated' : '', className]
          .filter(Boolean)
          .join(' ')}
        style={
          {
            ['--logo-svg-color' as string]: svgC,
            ['--logo-text-color' as string]: textC,
          } as React.CSSProperties
        }
      >
        <span className="app-logo__icon" aria-hidden="true">
          <WomanProfileIcon className="h-full w-full" />
        </span>
        <div className="app-logo__word" aria-label={word}>
          {word}
        </div>
      </div>
    )
  },
)

AppLogo.displayName = 'AppLogo'
