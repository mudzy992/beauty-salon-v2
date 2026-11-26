import { useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Drawer, DrawerContent } from '../../../components/ui/drawer'
import { DialogTitle, DialogDescription } from '../../../components/ui/dialog'
import { useWorkbookNewEntryForm } from '../hooks/useWorkbookNewEntryForm'
import { NewEntryClientCard } from '../components/new-entry-client-card'
import { NewEntryServiceCard } from '../components/new-entry-service-card'
import { NewEntryPaymentCard } from '../components/new-entry-payment-card'
import { NewEntryLoyaltyCard } from '../components/new-entry-loyalty-card'
import { NewEntryPartialPaymentDialog } from '../components/new-entry-partial-payment-dialog'
import { getIntlLocale } from '../../../i18n/locale-utils.mjs'

/**
 * Novi unos u radnoj knjizi (S10) — **tanka kompozicija**.
 *
 * Logika stanja je u `hooks/useWorkbookNewEntryForm.ts`, a prikaz je podijeljen
 * u četiri kartice + dijalog (`components/new-entry-*.tsx`). Ova datoteka drži
 * samo: `useId` veze između labela i kontrola, naslov, akcije i navigaciju.
 *
 * Sve poruke, validacije, payloadovi i notifikacije su **identični** ranijem
 * monolitnom fajlu — razlika je samo u tome gdje se nalaze.
 */
export const WorkbookNewEntryForm = ({
  mode,
  onClose,
}: {
  mode: 'page' | 'drawer'
  onClose?: () => void
}) => {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const navigate = useNavigate()
  const formId = useId()
  const clientSearchId = `${formId}-client-search`
  const serviceSearchId = `${formId}-service-search`
  const dateId = `${formId}-date`
  const paidAmountId = `${formId}-paid-amount`
  const notesId = `${formId}-notes`
  const discountPercentId = `${formId}-discount-percent`
  const paymentGroupLabelId = `${formId}-payment-group-label`
  const loyaltyLabelId = `${formId}-loyalty-label`

  const form = useWorkbookNewEntryForm()

  const goToEntry = (entryId: string) => {
    onClose?.()
    navigate(`/stylist/workbook/${entryId}`)
  }

  if (form.profileLoading || (form.loading && !form.profileId)) {
    return (
      <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-20">
        <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none text-content-muted" aria-hidden="true" />
        <span className="text-sm text-content-muted">{t('common.loading')}</span>
      </div>
    )
  }

  if (!form.profileId) {
    return (
      <Card className="p-6">
        <p className="text-content font-semibold">{t('stylistWorkbook.newEntry.noProfile')}</p>
        <p className="mt-1 text-sm text-content-strong">
          {t('stylistWorkbook.newEntry.profileNotFound')}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => {
            onClose?.()
            navigate('/stylist/workbook')
          }}
        >
          {t('common.back')}
        </Button>
      </Card>
    )
  }

  return (
    <div className={mode === 'page' ? 'max-w-2xl' : ''}>
      {mode === 'page' ? (
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-content">
            {t('stylistWorkbook.newEntry.title')}
          </h1>
          <p className="mt-1 text-sm text-content-strong">
            {t('stylistWorkbook.newEntry.pageDescription')}
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        <NewEntryClientCard
          clientSearchId={clientSearchId}
          clientSearch={form.clientSearch}
          onClientSearchChange={form.handleClientSearchChange}
          onClientSearchFocus={() => form.setShowClientDropdown(true)}
          showClientDropdown={form.showClientDropdown}
          filteredClients={form.filteredClients}
          clientDropdownRef={form.clientDropdownRef}
          selectedClient={form.selectedClient}
          onSelectClient={form.handleSelectClient}
        />

        <NewEntryServiceCard
          serviceSearchId={serviceSearchId}
          serviceSearch={form.serviceSearch}
          onServiceSearchChange={form.handleServiceSearchChange}
          onServiceSearchFocus={() => form.setShowServiceDropdown(true)}
          showServiceDropdown={form.showServiceDropdown}
          filteredServices={form.filteredServices}
          serviceDropdownRef={form.serviceDropdownRef}
          selectedClient={form.selectedClient}
          selectedServices={form.selectedServices}
          serviceIds={form.serviceIds}
          onToggleService={form.toggleService}
          locale={locale}
        />

        <NewEntryPaymentCard
          dateId={dateId}
          paidAmountId={paidAmountId}
          notesId={notesId}
          paymentGroupLabelId={paymentGroupLabelId}
          date={form.date}
          onDateChange={form.setDate}
          paidAmount={form.paidAmount}
          onPaidAmountChange={form.setPaidAmount}
          notes={form.notes}
          onNotesChange={form.setNotes}
          basePrice={form.basePrice}
          loyaltyPercent={form.loyaltyPercent}
          loyaltyDiscountAmount={form.loyaltyDiscountAmount}
          chargeAmount={form.chargeAmount}
          locale={locale}
        />

        <NewEntryLoyaltyCard
          loyaltyLabelId={loyaltyLabelId}
          discountPercentId={discountPercentId}
          loyaltyInfo={form.loyaltyInfo}
          loadingLoyalty={form.loadingLoyalty}
          desiredLoyaltyPercent={form.desiredLoyaltyPercent}
          onDesiredLoyaltyPercentChange={form.handleDesiredLoyaltyPercentChange}
          locale={locale}
        />

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose?.()
              navigate('/stylist/workbook')
            }}
            disabled={form.saving}
          >
            {t('common.back')}
          </Button>
          <Button
            type="button"
            onClick={() => void form.handleSubmit()}
            disabled={form.saving}
          >
            {form.saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                {t('stylistWorkbook.newEntry.creating')}
              </>
            ) : (
              t('stylistWorkbook.newEntry.createEntry')
            )}
          </Button>
        </div>
      </div>

      <NewEntryPartialPaymentDialog
        open={form.partialOpen}
        onOpenChange={form.setPartialOpen}
        partialDiff={form.partialDiff}
        saving={form.saving}
        onIgnoreDebt={async () => {
          const result = await form.confirmPartialPayment('IGNORE_DEBT')
          if (result.created) goToEntry(result.entryId)
        }}
        onRecordDebt={async () => {
          const result = await form.confirmPartialPayment('CREATE_DEBT')
          if (result.created) goToEntry(result.entryId)
        }}
        locale={locale}
      />
    </div>
  )
}

export const WorkbookNewEntryPage = () => {
  return <WorkbookNewEntryForm mode="page" />
}

export const WorkbookNewEntryDrawer = ({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) => {
  const { t } = useTranslation()

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="flex flex-col">
        <div className="h-full overflow-y-auto p-5">
          <div className="mb-3">
            <DialogTitle className="text-sm font-semibold text-content">
              {t('stylistWorkbook.newEntry.title')}
            </DialogTitle>
            <DialogDescription className="text-xs text-content-muted">
              {t('stylistWorkbook.newEntry.drawerDescription')}
            </DialogDescription>
          </div>
          <WorkbookNewEntryForm mode="drawer" onClose={() => onOpenChange(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
