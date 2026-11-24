import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'

import { getErrorMessage, getErrorCode } from '../api/error'
import { resolveAdminApiErrorKey } from '../features/admin/admin-api-error.mjs'
import { useAppToast } from '../lib/toast/useAppToast'

import type { UserRow } from '../features/users/user-types'
import { UsersPanel } from '../features/users/users-panel'
import { useUsersList } from '../features/users/use-users-list'
import { useUserEditor } from '../features/users/use-user-editor'
import { useUserCreation } from '../features/users/use-user-creation'
import { useUserActions } from '../features/users/use-user-actions'
import { useStylistRemoval } from '../features/users/use-stylist-removal'
import { useUserRowPresentation } from '../features/users/use-user-row-presentation'
import { EditUserDialog } from '../features/users/edit-user-dialog'
import { CreateUserDialog } from '../features/users/create-user-dialog'
import { UserCredentialsDialog } from '../features/users/user-credentials-dialog'
import { StylistRemovalDialog } from '../features/users/stylist-removal-dialog'
import { ErrorState } from '../features/shell/admin/ui/data-state'
import { Button } from '../components/ui/button'
import { ConfirmDialog } from '../features/finance/components/confirm-dialog'
import { AdminConfirmDialog } from '../features/shell/admin/ui/admin-confirm-dialog'

export default function Users() {
  const { t } = useTranslation()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const focusBeforePanelError = useCallback(() => {
    if (panelRef.current?.contains(document.activeElement)) headingRef.current?.focus()
  }, [])
  const { error } = useAppToast()
  const showApiError = (err: unknown, fallbackKey: string) => {
    const message = getErrorMessage(err, '')
    error(t(resolveAdminApiErrorKey(message, fallbackKey, getErrorCode(err))))
  }
  const getRoleLabel = (roleName: string) =>
    t(`users.roleNames.${roleName}`, { defaultValue: roleName })

  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'admins' | 'stylists' | 'clients'>('clients')

  const {
    admins, stylists, clients, loading, loadError, clientsSearch, setClientsSearch,
    page, setPage, total, totalPages, visiblePageNumbers, loadData,
  } = useUsersList(focusBeforePanelError)

  const getUserRoles = useCallback((u: UserRow): string[] => u.userRoles?.map((r) => r.role.name) ?? [], [])

  const {
    editTriggerRef, editOpen, setEditOpen, editUser, formData, setFormData, initialEmail, initialUsername,
    setEditIsUsernameManuallyEdited, editUsernameStatus, clientDebtsQuery, debtToWriteOff, setDebtToWriteOff,
    writeOffPending, handleWriteOffClientDebt, openEdit, handleSave,
  } = useUserEditor({ loadData, showApiError, getUserRoles, setSaving })
  const {
    createTriggerRef, transitioningToCredentials, createOpen, setCreateOpen, credentialsOpen, setCredentialsOpen,
    createData, setCreateData, setIsUsernameManuallyEdited, usernameStatus, createdCredentials, setCreatedCredentials, handleCreate,
  } = useUserCreation({ loadData, showApiError, setSaving })

  const {
    removalTriggerRef, removalPreviewSequence, removeStylistOpen, setRemoveStylistOpen, removeStylistUser,
    removalPreview, removalSubmitting, financialTarget, setFinancialTarget, financialConfirmed, setFinancialConfirmed,
    removalModes, setRemovalModes, removalTargets, setRemovalTargets, getTargetOptions, removalSummary, isRemovalReady,
    openRemoveStylist, handleConfirmRemoveStylist,
  } = useStylistRemoval({ admins, stylists, clients, loadData, showApiError })

  const { resetLinkSendingId, assigningUsers, confirmRequest, setConfirmRequest, handleIssueInitialPasswordResetLink,
    handleDeactivate, handleAssignRole, handleRemoveRole } = useUserActions({ loadData, showApiError, getRoleLabel, openRemoveStylist })

  const { userColumns, renderUserCard } = useUserRowPresentation({
    getUserRoles, getRoleLabel, resetLinkSendingId, assigningUsers, editTriggerRef, removalTriggerRef,
    openEdit, handleRemoveRole, handleAssignRole, handleIssueInitialPasswordResetLink, handleDeactivate,
  })

  return (
    <div data-admin-users>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold text-content">{t('nav.users')}</h1>
          <p className="mt-1 text-sm text-content-strong ">{t('users.subtitle')}</p>
        </div>

        <Button type="button" ref={createTriggerRef} onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('users.createButton')}
        </Button>
      </div>

      {loadError && !loading ? (
        <ErrorState description={t('users.errors.loadFailed')} onRetry={() => { headingRef.current?.focus(); loadData() }} />
      ) : (
        <div ref={panelRef}>
      <UsersPanel activeTab={activeTab} setActiveTab={setActiveTab} admins={admins} stylists={stylists} clients={clients} loading={loading}
        clientsSearch={clientsSearch} setClientsSearch={setClientsSearch} page={page} setPage={setPage} total={total} totalPages={totalPages}
        visiblePageNumbers={visiblePageNumbers} onPaginationFocusFallback={() => headingRef.current?.focus()} userColumns={userColumns} renderUserCard={renderUserCard} />
        </div>
      )}

      <StylistRemovalDialog removeStylistOpen={removeStylistOpen} removalSubmitting={removalSubmitting}
        removalTriggerRef={removalTriggerRef} removalPreview={removalPreview} removeStylistUser={removeStylistUser}
        financialTarget={financialTarget} setFinancialTarget={setFinancialTarget} financialConfirmed={financialConfirmed} setFinancialConfirmed={setFinancialConfirmed}
        getTargetOptions={getTargetOptions} removalModes={removalModes} setRemovalModes={setRemovalModes} removalTargets={removalTargets} setRemovalTargets={setRemovalTargets}
        removalSummary={removalSummary} isRemovalReady={isRemovalReady}
        onOpenChange={(open) => { if (!open && removalSubmitting) return; if (!open) removalPreviewSequence.current += 1; setRemoveStylistOpen(open) }}
        onConfirm={() => void handleConfirmRemoveStylist()} />

      <EditUserDialog editOpen={editOpen} setEditOpen={setEditOpen} saving={saving} editTriggerRef={editTriggerRef}
        editUser={editUser} formData={formData} setFormData={setFormData} setEditIsUsernameManuallyEdited={setEditIsUsernameManuallyEdited}
        initialUsername={initialUsername} initialEmail={initialEmail} editUsernameStatus={editUsernameStatus} getUserRoles={getUserRoles}
        clientDebtsQuery={clientDebtsQuery} debtToWriteOff={debtToWriteOff} setDebtToWriteOff={setDebtToWriteOff} onSave={() => void handleSave()} />

      <CreateUserDialog createOpen={createOpen} setCreateOpen={setCreateOpen} saving={saving}
        transitioningToCredentials={transitioningToCredentials} createTriggerRef={createTriggerRef}
        createData={createData} setCreateData={setCreateData} setIsUsernameManuallyEdited={setIsUsernameManuallyEdited}
        usernameStatus={usernameStatus} getRoleLabel={getRoleLabel} onCreate={() => void handleCreate()} />

      <UserCredentialsDialog credentialsOpen={credentialsOpen} setCredentialsOpen={setCredentialsOpen} createdCredentials={createdCredentials}
        setCreatedCredentials={setCreatedCredentials} transitioningToCredentials={transitioningToCredentials} createTriggerRef={createTriggerRef} />

      <AdminConfirmDialog fallbackFocusRef={headingRef} request={confirmRequest} onClose={() => setConfirmRequest(null)} />

      <ConfirmDialog
        open={Boolean(debtToWriteOff)}
        onOpenChange={(next) => {
          if (!next) setDebtToWriteOff(null)
        }}
        title={t('users.debts.confirmTitle')}
        description={t('users.debts.confirmDescription')}
        confirmLabel={t('users.debts.confirmButton')}
        isDestructive
        isPending={writeOffPending}
        reasonLabel={t('users.debts.reason')}
        onConfirm={(reason) => void handleWriteOffClientDebt(reason)}
      />
    </div>
  )
}
