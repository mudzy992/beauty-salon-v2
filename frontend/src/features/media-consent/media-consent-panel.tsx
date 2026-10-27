import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, ImageOff, Loader2, ShieldCheck } from 'lucide-react'

import api from '../../api/client'
import { getIntlLocale } from '../../i18n/locale-utils.mjs'
import { MediaImage } from '../../components/media-image'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import {
  formatDateOnlyLocale,
  formatInstantDateLocale,
} from '../../../../shared/business-date.mjs'

interface ConsentItem {
  imageId: string
  entryId: string
  serviceName: string
  serviceDate: string
  completedAt: string | null
  isBefore: boolean
  isAfter: boolean
  description: string | null
  previewUrl: string
  consentedAt: string | null
  revokedAt: string | null
  isPublished: boolean
  publishedCategories: Array<{ id: string; name: string }>
}

interface ConsentPayload {
  policyVersion: string
  consentText: string
  pending: ConsentItem[]
  active: ConsentItem[]
}

export function MediaConsentPanel() {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.resolvedLanguage ?? i18n.language)
  const [payload, setPayload] = useState<ConsentPayload | null>(null)
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<ConsentPayload>('/api/media/consents/me')
      setPayload(data)
      setAccepted({})
      setMessage('')
    } catch {
      setPayload(null)
      setMessage(i18n.t('mediaConsent.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [i18n])

  useEffect(() => {
    void load()
  }, [load])

  const previewItems = useMemo(
    () => [...(payload?.pending ?? []), ...(payload?.active ?? [])],
    [payload],
  )
  const previewKey = previewItems
    .map((item) => `${item.imageId}:${item.previewUrl}`)
    .join('|')

  useEffect(() => {
    let active = true
    const objectUrls: string[] = []
    setPreviews({})
    const current = [...(payload?.pending ?? []), ...(payload?.active ?? [])]
    if (current.length === 0)
      return () => {
        active = false
      }

    void Promise.all(
      current.map(async (item) => {
        try {
          const { data } = await api.get<Blob>(item.previewUrl, {
            responseType: 'blob',
          })
          const url = URL.createObjectURL(data)
          if (!active) {
            URL.revokeObjectURL(url)
            return [item.imageId, ''] as const
          }
          objectUrls.push(url)
          return [item.imageId, url] as const
        } catch {
          return [item.imageId, ''] as const
        }
      }),
    ).then((entries) => {
      if (active) setPreviews(Object.fromEntries(entries))
    })

    return () => {
      active = false
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewKey, payload])

  const grant = async (item: ConsentItem) => {
    if (!payload || !accepted[item.imageId]) return
    setSavingId(item.imageId)
    setMessage('')
    try {
      await api.post(`/api/media/consents/${item.imageId}/grant`, {
        policyVersion: payload.policyVersion,
      })
      await load()
      setMessage(t('mediaConsent.toast.granted'))
    } catch {
      setMessage(t('mediaConsent.errors.grantFailed'))
    } finally {
      setSavingId(null)
    }
  }

  const revoke = async (item: ConsentItem) => {
    if (
      !window.confirm(t('mediaConsent.confirmRevoke'))
    )
      return
    setSavingId(item.imageId)
    setMessage('')
    try {
      await api.delete(`/api/media/consents/${item.imageId}`)
      await load()
      setMessage(t('mediaConsent.toast.revoked'))
    } catch {
      setMessage(t('mediaConsent.errors.revokeFailed'))
    } finally {
      setSavingId(null)
    }
  }

  const labelFor = (item: ConsentItem) =>
    t(item.isBefore ? 'mediaConsent.photoBefore' : 'mediaConsent.photoAfter')

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck
            className="mt-0.5 h-5 w-5 shrink-0 text-brand-gold-text"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {t('mediaConsent.title')}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t('mediaConsent.intro')}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading')}
          </div>
        ) : null}

        {!loading && payload?.pending.length ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              {payload.consentText}
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {t('mediaConsent.pendingHeading')}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {payload.pending.map((item) => (
                <div
                  key={item.imageId}
                  className="overflow-hidden rounded-xl border border-slate-200"
                >
                  {previews[item.imageId] ? (
                    <MediaImage
                      src={previews[item.imageId]}
                      alt={labelFor(item)}
                      className="aspect-[4/3] w-full bg-slate-100 object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 text-slate-400">
                      <ImageOff
                        className="h-6 w-6"
                        aria-label={t('mediaConsent.previewUnavailable')}
                      />
                    </div>
                  )}
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {labelFor(item)}
                      </p>
                      <p className="text-sm text-slate-600">
                        {item.serviceName} ·{' '}
                        {formatDateOnlyLocale(item.serviceDate.slice(0, 10), locale)}
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-start gap-2 text-sm leading-5 text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(accepted[item.imageId])}
                        onChange={(event) =>
                          setAccepted((current) => ({
                            ...current,
                            [item.imageId]: event.target.checked,
                          }))
                        }
                        className="mt-1 h-4 w-4 accent-amber-700"
                      />
                      <span>
                        {t('mediaConsent.explicitConsent')}
                      </span>
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        !accepted[item.imageId] || savingId === item.imageId
                      }
                      onClick={() => void grant(item)}
                    >
                      {savingId === item.imageId
                        ? t('mediaConsent.saving')
                        : t('mediaConsent.grant')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!loading && payload?.active.length ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-800">
              {t('mediaConsent.activeHeading')}
            </p>
            <div className="grid gap-3">
              {payload.active.map((item) => (
                <div
                  key={item.imageId}
                  className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 sm:flex-row sm:items-center"
                >
                  {previews[item.imageId] ? (
                    <MediaImage
                      src={previews[item.imageId]}
                      alt={labelFor(item)}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                      <ImageOff
                        className="h-5 w-5"
                        aria-label={t('mediaConsent.previewUnavailable')}
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {labelFor(item)} · {item.serviceName}
                    </p>
                    <p className="text-sm text-slate-600">
                      {formatDateOnlyLocale(item.serviceDate.slice(0, 10), locale)}
                      {item.consentedAt
                        ? ` · ${t('mediaConsent.consentedAt', { date: formatInstantDateLocale(item.consentedAt, locale) })}`
                        : ''}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('mediaConsent.activeDescription')}
                    </p>
                    {item.isPublished ? (
                      <p className="mt-1 text-xs font-medium text-emerald-900">
                        {t('mediaConsent.publishedCategories', {
                          categories: item.publishedCategories.map((category) => category.name).join(', '),
                        })}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-600">
                        {t('mediaConsent.notPublished')}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={savingId === item.imageId}
                    onClick={() => void revoke(item)}
                  >
                    {savingId === item.imageId
                      ? t('mediaConsent.saving')
                      : t('mediaConsent.revoke')}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!loading &&
        payload &&
        payload.pending.length === 0 &&
        payload.active.length === 0 ? (
          <p className="text-sm text-slate-600">
            {t('mediaConsent.nonePending')}
          </p>
        ) : null}

        {message ? (
          <p role="status" className="text-sm text-slate-700">
            {message}
          </p>
        ) : null}
        <p className="text-xs leading-5 text-slate-500">
          {t('mediaConsent.privacyNote')}
        </p>
      </CardContent>
    </Card>
  )
}
