import { ChangeEvent, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { useAppToast } from '../../../lib/toast/useAppToast'
import { MediaImage } from '../../../components/media-image'
import { getUploadUrl } from '../../../utils/uploadUrl'
import {
  attachDailyLogImage,
  completeDailyLogEntry,
  proposeReschedule,
  uploadDailyLogImage,
} from '../api/stylist-workbook.api'
import { useWorkbookEntry } from '../hooks/useWorkbookEntry'
import { DailyLogDispositionPanel } from '../components/daily-log-disposition-panel'
import { getCollectedTotal, getSettledDebtsSum } from '../workbook-display'

const formatKm = (v: number) => `${Number(v || 0).toFixed(2)} KM`

export const WorkbookDetailPage = () => {
  const navigate = useNavigate()
  const { entryId } = useParams()
  const { toastApiError, success, warning } = useAppToast()

  const id = String(entryId ?? '')
  const { entry, isLoading, isFetching, refetch } = useWorkbookEntry(id)

  const [acting, setActing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)

  const [reschedulePromptOpen, setReschedulePromptOpen] = useState(false)
  const [rescheduleReservationId, setRescheduleReservationId] = useState<string | null>(null)
  const [rescheduleOverrunLabel, setRescheduleOverrunLabel] = useState<number>(0)

  const canComplete = entry?.status !== 'COMPLETED'
  const beforeImages = useMemo(() => entry?.images?.filter((i) => i.isBefore) ?? [], [entry?.images])
  const afterImages = useMemo(() => entry?.images?.filter((i) => i.isAfter) ?? [], [entry?.images])
  const hasBeforeAfter = beforeImages.length > 0 || afterImages.length > 0

  const handleUpload = async (isBefore: boolean, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!entry) return
    setUploading(true)
    try {
      const upload = await uploadDailyLogImage(file)
      await attachDailyLogImage({
        entryId: entry.id,
        body: { uploadId: upload.id, isBefore, isAfter: !isBefore },
      })
      success('Dodano', 'Slika je dodana.')
      await refetch()
    } catch (err) {
      toastApiError(err, 'Greška pri uploadu')
    } finally {
      setUploading(false)
    }
  }

  const handleComplete = async () => {
    if (!entry) return
    setConfirmOpen(false)
    setActing(true)
    const reservationId = entry.reservationId ?? null
    try {
      await completeDailyLogEntry(entry.id)
      await refetch()

      if (!reservationId) {
        success('Završeno', 'Zapis je završen i prihod je upisan u knjigu.')
        return
      }

      try {
        const proposal = await proposeReschedule({
          reservationId,
          includeBreaks: false,
          mode: 'actual_overrun',
        })

        const delay = proposal?.delayMinutes ?? 0
        const itemCount = proposal?.items?.length ?? 0
        const overrunLabel = proposal?.overrunMinutes ?? delay

        if (delay > 0 && itemCount > 0) {
          setRescheduleReservationId(reservationId)
          setRescheduleOverrunLabel(overrunLabel)
          setReschedulePromptOpen(true)
          return
        }

        if (delay > 0 && itemCount === 0) {
          warning(
            'Kašnjenje termina',
            `Ovaj termin je kasnio ${overrunLabel} min. Nema drugih potvrđenih termina danas za pomjeranje — rekalkulacija rasporeda nije potrebna.`,
          )
        }
      } catch {
        // optional step: ignore errors (matches mobile)
      }
    } catch (err) {
      toastApiError(err, 'Greška')
    } finally {
      setActing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-hidden="true" />
      </div>
    )
  }

  if (!entry) {
    return (
      <Card className="p-6">
        <p className="text-slate-900 dark:text-slate-50 font-semibold">Zapis nije pronađen.</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => navigate('/stylist/workbook')}>
          Nazad
        </Button>
      </Card>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 truncate">
            {entry.publicReferenceCode ?? entry.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {entry.date?.slice(0, 10)} {entry.isManual ? '· Ručno' : '· Rezervacija'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'Osvježavam…' : 'Osvježi'}
          </Button>
          <Link to="/stylist/workbook">
            <Button type="button" variant="outline">
              Nazad
            </Button>
          </Link>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-3 w-full">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Servisi</p>
              <ul className="mt-1 space-y-1">
                {(entry.items && entry.items.length > 0
                  ? entry.items
                  : entry.service
                    ? [{ serviceId: entry.serviceId, service: entry.service, unitPrice: entry.actualPrice }]
                    : []
                ).map((it) => (
                  <li
                    key={it.serviceId}
                    className="flex justify-between text-sm text-slate-700 dark:text-slate-200"
                  >
                    <span>{it.service?.name ?? 'Usluga'}</span>
                    <span>{formatKm(Number(it.unitPrice ?? 0))}</span>
                  </li>
                ))}
              </ul>
            </div>
            {(entry.debtPaymentEntries?.length ?? 0) > 0 ? (
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Naplata dugovanja
                </p>
                <ul className="mt-1 space-y-1">
                  {entry.debtPaymentEntries!.map((dp) => (
                    <li
                      key={dp.id}
                      className="flex justify-between text-sm text-slate-700 dark:text-slate-200"
                    >
                      <span>
                        {dp.debt?.service?.name ?? dp.service?.name ?? 'Dug'}
                        {dp.debt?.createdAt ? ` · ${String(dp.debt.createdAt).slice(0, 10)}` : ''}
                      </span>
                      <span>{formatKm(Number(dp.actualPrice))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Klijent:{' '}
              <span className="font-medium text-slate-900 dark:text-slate-50">
                {entry.client
                  ? [entry.client.firstName, entry.client.lastName].filter(Boolean).join(' ') ||
                    entry.client.user?.username ||
                    '—'
                  : '—'}
              </span>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Ukupno naplaćeno:{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-50">
                {formatKm(getCollectedTotal(entry))}
              </span>
              <span className="block text-xs mt-1">
                Servisi {formatKm(Number(entry.actualPrice))}
                {getSettledDebtsSum(entry) > 0
                  ? ` · Dugovi ${formatKm(getSettledDebtsSum(entry))}`
                  : ''}
                {Number(entry.tipAmount) > 0
                  ? ` · Napojnica ${formatKm(Number(entry.tipAmount))}`
                  : ''}
              </span>
            </div>
            {entry.notes ? (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Bilješke: <span className="text-slate-900 dark:text-slate-50">{entry.notes}</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={entry.status === 'COMPLETED' ? 'success' : 'warning'}>
              {entry.status === 'COMPLETED' ? 'Završeno' : 'Na čekanju'}
            </Badge>
            {canComplete ? (
              <Button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={acting}
                className="whitespace-nowrap"
              >
                {acting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Završavam…
                  </>
                ) : entry.reservationId ? (
                  'Završi zapis (završava i rezervaciju)'
                ) : (
                  'Završi zapis (upis u knjigu)'
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {(canComplete || hasBeforeAfter) ? (
        <Card className="mt-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-900 dark:text-slate-50">Before / After</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Dodajte slike prije/poslije (kvadratni crop kao na mobilnoj).
              </p>
            </div>
          </div>

          {beforeImages.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Prije</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {beforeImages.map((img) => {
                  const uri = getUploadUrl(img.upload?.pathMedium ?? img.upload?.pathThumb ?? img.upload?.pathOriginal)
                  return (
                    <MediaImage
                      key={img.id}
                      src={uri}
                      alt="Prije"
                      className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-800"
                      loading="lazy"
                    />
                  )
                })}
              </div>
            </div>
          ) : null}

          {afterImages.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Poslije</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {afterImages.map((img) => {
                  const uri = getUploadUrl(img.upload?.pathMedium ?? img.upload?.pathThumb ?? img.upload?.pathOriginal)
                  return (
                    <MediaImage
                      key={img.id}
                      src={uri}
                      alt="Poslije"
                      className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-800"
                      loading="lazy"
                    />
                  )
                })}
              </div>
            </div>
          ) : null}

          {canComplete ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <label className="inline-flex">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleUpload(true, e)}
                  disabled={uploading}
                />
                <Button type="button" variant="outline" size="sm" disabled={uploading}>
                  {uploading ? 'Upload…' : 'Dodaj prije'}
                </Button>
              </label>
              <label className="inline-flex">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleUpload(false, e)}
                  disabled={uploading}
                />
                <Button type="button" variant="outline" size="sm" disabled={uploading}>
                  {uploading ? 'Upload…' : 'Dodaj poslije'}
                </Button>
              </label>
              {uploading ? (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Upload u toku…
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : null}

      <DailyLogDispositionPanel
        entry={entry}
        onDone={() => {
          void refetch()
          navigate('/stylist/workbook')
        }}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Završi zapis</DialogTitle>
            <DialogDescription>
              {entry.reservationId
                ? 'Označiti zapis kao završen? Ovo će završiti i rezervaciju, te upisati prihod u knjigu.'
                : 'Označiti zapis kao završen? Prihod će biti upisan u knjigu.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)} disabled={acting}>
              Odustani
            </Button>
            <Button type="button" onClick={() => void handleComplete()} disabled={acting}>
              {acting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Završavam…
                </>
              ) : (
                'Završi'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={reschedulePromptOpen}
        onOpenChange={(v) => {
          setReschedulePromptOpen(v)
          if (!v) {
            setRescheduleReservationId(null)
            setRescheduleOverrunLabel(0)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kašnjenje termina</DialogTitle>
            <DialogDescription>
              Ovaj termin je kasnio {rescheduleOverrunLabel} min. Želite li rekalkulaciju budućih termina i preview novog rasporeda?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setReschedulePromptOpen(false)
              }}
            >
              Ne sada
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!rescheduleReservationId) return
                navigate(
                  `/stylist/workbook/reschedule-preview/${rescheduleReservationId}?includeBreaks=0`,
                )
              }}
            >
              Bez pauza
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!rescheduleReservationId) return
                navigate(
                  `/stylist/workbook/reschedule-preview/${rescheduleReservationId}?includeBreaks=1`,
                )
              }}
            >
              Uključi pauze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

