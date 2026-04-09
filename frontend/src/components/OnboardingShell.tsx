import { ReactNode } from 'react'
import { IconType } from 'react-icons'
import {
  IoLockClosedOutline,
  IoKeyOutline,
  IoMaleFemaleOutline,
  IoPersonOutline,
  IoMailOutline,
  IoSendOutline,
  IoCallOutline,
  IoChatbubbleEllipsesOutline,
} from 'react-icons/io5'
import { FiInfo } from 'react-icons/fi'

import { Card, CardContent } from './ui/card'

export type HeroDecoration = 'lock' | 'gender' | 'mail' | 'phone' | 'none'

type Props = {
  step: number
  totalSteps: number
  title: string
  subtitle: string
  tip?: string
  /** Velike ikone u pozadini (isto kao mobile OnboardingShell) */
  heroDecoration?: HeroDecoration
  /** Mali ikon u zaglavlju; ako nije zadan, bira se prema heroDecoration */
  icon?: IconType
  children: ReactNode
}

const headerIconForDecoration = (d: HeroDecoration): IconType | undefined => {
  switch (d) {
    case 'lock':
      return IoLockClosedOutline
    case 'gender':
      return IoMaleFemaleOutline
    case 'mail':
      return IoMailOutline
    case 'phone':
      return IoCallOutline
    default:
      return undefined
  }
}

export default function OnboardingShell({
  step,
  totalSteps,
  title,
  subtitle,
  tip,
  heroDecoration = 'none',
  icon: iconProp,
  children,
}: Props) {
  const decoSize = 200

  const headerIcon = iconProp ?? headerIconForDecoration(heroDecoration)
  const HeaderIcon = headerIcon

  const deco =
    heroDecoration === 'lock'
      ? {
          main: IoLockClosedOutline,
          accent: IoKeyOutline,
          accentScale: 0.28,
        }
      : heroDecoration === 'gender'
        ? {
            main: IoMaleFemaleOutline,
            accent: IoPersonOutline,
            accentScale: 0.3,
          }
        : heroDecoration === 'mail'
          ? {
              main: IoMailOutline,
              accent: IoSendOutline,
              accentScale: 0.26,
            }
          : heroDecoration === 'phone'
            ? {
                main: IoCallOutline,
                accent: IoChatbubbleEllipsesOutline,
                accentScale: 0.28,
              }
            : null

  const MainDeco = deco?.main
  const AccentDeco = deco?.accent

  return (
    <div className="min-h-screen bg-slate-50 py-10 md:py-14 px-4 relative overflow-hidden">
      {deco ? (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {MainDeco ? (
            <MainDeco
            className="absolute right-[-28px] bottom-[12%] text-brand-gold opacity-10"
            style={{ width: decoSize, height: decoSize }}
            />
          ) : null}
          {AccentDeco ? (
            <AccentDeco
            className="absolute right-[32px] top-[18%] text-brand-gold opacity-15"
            style={{
              width: decoSize * deco.accentScale,
              height: decoSize * deco.accentScale,
            }}
            />
          ) : null}
        </div>
      ) : null}

      <div className="relative z-10">
        <Card className="max-w-lg mx-auto overflow-hidden">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div
                    key={i}
                    className={i < step ? 'h-2.5 w-2.5 rounded-full bg-brand-gold' : 'h-2.5 w-2.5 rounded-full bg-slate-200 opacity-70'}
                  />
                ))}
              </div>
              <div className="ml-auto text-sm text-slate-600 font-semibold">
                {step}/{totalSteps}
              </div>
            </div>

            <div className="flex items-start gap-3">
              {HeaderIcon ? (
                <div className="shrink-0 h-11 w-11 rounded-2xl bg-brand-champagne/40 flex items-center justify-center">
                  <HeaderIcon className="h-5 w-5 text-brand-gold" />
                </div>
              ) : null}
              <div>
                <div className="text-2xl md:text-3xl font-extrabold leading-tight text-slate-900">
                  {title}
                </div>
                <div className="mt-2 text-slate-600 text-base leading-relaxed">
                  {subtitle}
                </div>
              </div>
            </div>

            {tip ? (
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <FiInfo className="h-5 w-5 text-brand-gold mt-0.5" />
                <div className="text-sm leading-relaxed text-slate-700">{tip}</div>
              </div>
            ) : null}

            <div>{children}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
