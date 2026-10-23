import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ImageOff, Loader2, ShieldCheck } from 'lucide-react'

import api from '../../api/client'
import { MediaImage } from '../../components/media-image'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'

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
      setMessage('Saglasnosti trenutno nije moguće učitati. Pokušajte ponovo.')
    } finally {
      setLoading(false)
    }
  }, [])

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
      setMessage(
        'Saglasnost je zabilježena. Status javne objave prikazan je uz aktivnu saglasnost.',
      )
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message ||
          'Saglasnost nije mogla biti sačuvana.',
      )
    } finally {
      setSavingId(null)
    }
  }

  const revoke = async (item: ConsentItem) => {
    if (
      !window.confirm(
        'Povući saglasnost? Fotografija će odmah biti uklonjena iz javnog prikaza.',
      )
    )
      return
    setSavingId(item.imageId)
    setMessage('')
    try {
      await api.delete(`/api/media/consents/${item.imageId}`)
      await load()
      setMessage(
        'Saglasnost je povučena, a budući javni pristup kroz sistem je blokiran.',
      )
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message ||
          'Saglasnost nije mogla biti povučena.',
      )
    } finally {
      setSavingId(null)
    }
  }

  const labelFor = (item: ConsentItem) =>
    item.isBefore
      ? 'Fotografija prije tretmana'
      : 'Fotografija poslije tretmana'

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck
            className="mt-0.5 h-5 w-5 shrink-0 text-brand-gold"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Saglasnosti za fotografije
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Saglasnost je dobrovoljna i odvojena za svaku fotografiju.
              Odbijanje ne utiče na uslugu.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Učitavanje…
          </div>
        ) : null}

        {!loading && payload?.pending.length ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              {payload.consentText}
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Fotografije koje čekaju vašu odluku
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
                        aria-label="Pregled nije dostupan"
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
                        {new Date(item.serviceDate).toLocaleDateString('bs-BA')}
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
                        Pročitao/la sam tekst i izričito pristajem na objavu ove
                        fotografije u navedenom obimu.
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
                        ? 'Spremanje…'
                        : 'Dajem saglasnost'}
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
              Aktivne saglasnosti
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
                        aria-label="Pregled nije dostupan"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {labelFor(item)} · {item.serviceName}
                    </p>
                    <p className="text-sm text-slate-600">
                      {new Date(item.serviceDate).toLocaleDateString('bs-BA')}
                      {item.consentedAt
                        ? ` · saglasnost: ${new Date(item.consentedAt).toLocaleDateString('bs-BA')}`
                        : ''}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Saglasnost je
                      aktivna samo za javni web i aplikaciju salona.
                    </p>
                    {item.isPublished ? (
                      <p className="mt-1 text-xs font-medium text-emerald-900">
                        Objavljeno u galeriji: {item.publishedCategories.map((category) => category.name).join(', ')}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-600">
                        Fotografija još nije u javnom prikazu. Pojedinačna fotografija se objavljuje tek nakon izbora u ručnoj kategoriji; automatski par tek kada su obje strane odobrene i auto-kategorija aktivna.
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
                      ? 'Spremanje…'
                      : 'Povuci saglasnost'}
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
            Trenutno nema fotografija za koje je potrebna odluka.
          </p>
        ) : null}

        {message ? (
          <p role="status" className="text-sm text-slate-700">
            {message}
          </p>
        ) : null}
        <p className="text-xs leading-5 text-slate-500">
          Fotografije bez vaše saglasnosti ostaju privatne. Povlačenje
          zaustavlja budući pristup kroz sistem; kopije koje su već preuzete ili
          snimljene izvan njega ne mogu se opozvati.
        </p>
      </CardContent>
    </Card>
  )
}
