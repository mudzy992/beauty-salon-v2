import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { useAppToast } from '../../lib/toast/useAppToast'
import api from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { cssBackgroundImage } from '../../constants/media-fallback'
import { formatSalonWorkingHours, type SalonHoursRow } from '../../utils/format-salon-hours'
import { publicHeader, publicPage, publicPageHero } from '../../features/shell/public/public-ui'
import { Seo } from '../../seo/Seo'
import { site } from '../../seo/site'
import { ExternalLink } from 'lucide-react'

const MotionDiv = motion.div

export default function PublicContact() {
  const { t, i18n } = useTranslation()
  const { getSetting } = useSettings()
  const toast = useAppToast()
  const [workingHours, setWorkingHours] = useState<SalonHoursRow[]>()
  const [hoursLoading, setHoursLoading] = useState(true)
  const [hoursLoadError, setHoursLoadError] = useState(false)
  const contactBg = getSetting('public_contact_bg', '')

  const loadSalonHours = useCallback(async () => {
    setHoursLoading(true)
    setHoursLoadError(false)
    try {
      const { data } = await api.get<{ workingHours?: SalonHoursRow[] } | null>('/api/salon')
      setWorkingHours(data?.workingHours)
    } catch {
      setWorkingHours(undefined)
      setHoursLoadError(true)
    } finally {
      setHoursLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSalonHours()
  }, [loadSalonHours])

  const hoursText = useMemo(
    () => formatSalonWorkingHours(workingHours, i18n.language, t('public.contact.closed')),
    [workingHours, i18n.language, t],
  )

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast.success(t('public.contact.messageSent'), t('public.contact.replySoon'))
      setName('')
      setEmail('')
      setMessage('')
    }, 1000)
  }

  const contactTitle = getSetting('public_contact_title', t('public.contact.titleFallback'))
  const contactSubtitle = getSetting(
    'public_contact_subtitle',
    t('public.contact.subtitleFallback'),
  )

  const address = getSetting('public_contact_address', 'Titova 12, 71000 Sarajevo')
  const phone = getSetting('public_contact_phone', '+387 61 234 567')
  const contactEmail = getSetting('public_contact_email', 'info@salon.ba')
  const facebook = getSetting('public_social_facebook', '').trim()
  const instagram = getSetting('public_social_instagram', '').trim()
  const tiktok = getSetting('public_social_tiktok', '').trim()

  const canonicalPath = '/kontakt'
  const description = `${contactSubtitle}`.trim()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: site.siteName,
    url: site.baseUrl,
    telephone: phone,
    email: contactEmail,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address,
      addressCountry: 'BA',
    },
  }

  return (
    <div className="bg-white min-h-screen pb-20">
      <Seo
        title={t('public.contact.seoTitle')}
        description={description}
        canonicalUrl={canonicalPath}
        jsonLd={jsonLd}
      />
      <div className={`${publicPageHero.section} relative overflow-hidden`}>
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.08]"
          style={{ backgroundImage: cssBackgroundImage(contactBg) }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 via-white/85 to-white" />
        <div className={`${publicPageHero.innerNarrow} text-center relative z-[1]`}>
          <h1 className={publicHeader.title}>
            {contactTitle}
          </h1>
          <p className={`${publicHeader.subtitle} mt-4 max-w-2xl mx-auto`}>
            {contactSubtitle}
          </p>
        </div>
      </div>

      <div className={`${publicPage.container} ${publicPage.contentAfterHero}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <MotionDiv
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="rounded-2xl border-slate-200/80 shadow-soft">
              <CardContent className="p-8">
                <div className="text-lg font-semibold tracking-tight text-slate-950 mb-6">
                  {t('public.contact.formTitle')}
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t('public.contact.name')}</Label>
                    <Input
                      id="fullName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('public.contact.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">{t('public.contact.message')}</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? t('public.contact.sending') : t('public.contact.send')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="space-y-8">
              <Card className="rounded-2xl border-slate-200/80 shadow-soft">
                <CardContent className="p-8">
                  <div className="text-base font-semibold tracking-tight text-slate-950 mb-4">
                    {t('public.contact.info')}
                  </div>
                  <div className="space-y-4 text-slate-600">
                    <div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        {t('public.contact.address')}
                      </div>
                      <div>
                        {address}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        {t('public.contact.phone')}
                      </div>
                      <div>
                        {phone}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        {t('public.contact.email')}
                      </div>
                      <div>
                        {contactEmail}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        {t('public.contact.hours')}
                      </div>
                      <div className="whitespace-pre-line">
                        {hoursLoadError
                          ? t('public.contact.hoursLoadFailed')
                          : hoursLoading
                            ? t('public.contact.hoursLoading')
                            : hoursText || '—'}
                      </div>
                      {hoursLoadError ? (
                        <Button
                          variant="outline"
                          className="mt-2"
                          onClick={() => void loadSalonHours()}
                        >
                          {t('public.contact.retry')}
                        </Button>
                      ) : null}
                    </div>
                    {facebook || instagram || tiktok ? (
                      <div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          {t('public.contact.social')}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {facebook ? (
                            <a href={facebook} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                              <ExternalLink className="h-4 w-4 opacity-70" aria-hidden />
                              Facebook
                            </a>
                          ) : null}
                          {instagram ? (
                            <a href={instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                              <ExternalLink className="h-4 w-4 opacity-70" aria-hidden />
                              Instagram
                            </a>
                          ) : null}
                          {tiktok ? (
                            <a href={tiktok} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                              <ExternalLink className="h-4 w-4 opacity-70" aria-hidden />
                              TikTok
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
              
              {getSetting('public_contact_map_embed', '') ? (
                <div className="rounded-2xl overflow-hidden shadow-soft h-[300px] bg-white border border-slate-200/80">
                  <iframe
                    src={getSetting('public_contact_map_embed', '')}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={t('public.contact.mapLocation')}
                  />
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden shadow-sm h-[300px] bg-slate-200 flex items-center justify-center flex-col text-slate-500">
                  <div className="font-semibold">{t('public.contact.mapTitle')}</div>
                  <div className="text-sm">{t('public.contact.mapLocation')}</div>
                </div>
              )}
            </div>
          </MotionDiv>
        </div>
      </div>
    </div>
  )
}