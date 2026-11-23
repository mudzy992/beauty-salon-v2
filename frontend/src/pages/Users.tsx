import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSessionQuery as useQuery } from '../query/use-session-query'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'

import api from '../api/client'
import {
  fetchAllAdminStylists,
  fetchAllAdminUserRoleList,
} from '../api/catalog'
import { getErrorMessage, getErrorCode } from '../api/error'
import { resolveAdminApiErrorKey } from '../features/admin/admin-api-error.mjs'
import { useAppToast } from '../lib/toast/useAppToast'

import type { UserRow, PaginatedResponse, StylistRemovalPreview, StylistOption, ClientDebtRow } from '../features/users/user-types'
import { UsersList } from '../features/users/users-list'
import { UsersPagination } from '../features/users/users-pagination'
import { useUserRowPresentation } from '../features/users/use-user-row-presentation'
import { EditUserDialog } from '../features/users/edit-user-dialog'
import { CreateUserDialog } from '../features/users/create-user-dialog'
import { StylistRemovalDialog } from '../features/users/stylist-removal-dialog'
import { ErrorState } from '../features/shell/admin/ui/data-state'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { ConfirmDialog } from '../features/finance/components/confirm-dialog'
import { AdminConfirmDialog, type AdminConfirmRequest } from '../features/shell/admin/ui/admin-confirm-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

type RemovalMode = 'DELETE' | 'TRANSFER'

const normalizeUsernameFromNames = (first: string, last: string): string => {
  const base = `${first}.${last}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, '')
    .trim()
    .replace(/\s+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\./, '')
    .replace(/\.$/, '')
  return base
}

export default function Users() {
  const { t } = useTranslation()
  const { success, error, warning } = useAppToast()
  const showApiError = (err: unknown, fallbackKey: string) => {
    const message = getErrorMessage(err, '')
    error(t(resolveAdminApiErrorKey(message, fallbackKey, getErrorCode(err))))
  }
  const getRoleLabel = (roleName: string) =>
    t(`users.roleNames.${roleName}`, { defaultValue: roleName })

  const [admins, setAdmins] = useState<UserRow[]>([])
  const [stylists, setStylists] = useState<UserRow[]>([])
  const [clients, setClients] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const requestSequenceRef = useRef(0)

  const [clientsSearch, setClientsSearch] = useState('')
  const [debouncedClientsSearch, setDebouncedClientsSearch] = useState('')

  const [saving, setSaving] = useState(false)
  const [resetLinkSendingId, setResetLinkSendingId] = useState<string | null>(null)
  const [confirmRequest, setConfirmRequest] = useState<AdminConfirmRequest | null>(null)
  const [debtToWriteOff, setDebtToWriteOff] = useState<string | null>(null)
  const [writeOffPending, setWriteOffPending] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const [activeTab, setActiveTab] = useState<'admins' | 'stylists' | 'clients'>('clients')

  const editTriggerRef = useRef<HTMLButtonElement | null>(null)
  const createTriggerRef = useRef<HTMLButtonElement | null>(null)
  const transitioningToCredentials = useRef(false)
  const [editOpen, setEditOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [credentialsOpen, setCredentialsOpen] = useState(false)

  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const queryClient = useQueryClient()
  const clientDebtsQuery = useQuery({
    queryKey: ['client-debts', editUser?.id ?? ''],
    enabled: Boolean(
      editOpen && editUser?.userRoles?.some((userRole) => userRole.role.name === 'CLIENT'),
    ),
    queryFn: async (): Promise<ClientDebtRow[]> => {
      if (!editUser) return []
      const { data } = await api.get('/api/client-debts', {
        params: { clientId: editUser.id },
      })
      if (!Array.isArray(data)) throw new Error('Invalid client debts response')
      return data
    },
  })
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    gender: '' as '' | 'MALE' | 'FEMALE',
    isActive: true,
  })
  const [initialEmail, setInitialEmail] = useState('')
  const [initialUsername, setInitialUsername] = useState('')
  const [editIsUsernameManuallyEdited, setEditIsUsernameManuallyEdited] = useState(false)
  const [editUsernameStatus, setEditUsernameStatus] = useState<{
    loading: boolean
    available: boolean | null
    suggestions: string[]
  }>({ loading: false, available: null, suggestions: [] })

  const [createData, setCreateData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    role: 'CLIENT' as string,
    gender: '' as '' | 'MALE' | 'FEMALE',
  })
  const [isUsernameManuallyEdited, setIsUsernameManuallyEdited] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<{
    loading: boolean
    available: boolean | null
    suggestions: string[]
  }>({ loading: false, available: null, suggestions: [] })

  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string
    initialPassword: string
  } | null>(null)

  const removalTriggerRef = useRef<HTMLButtonElement | null>(null)
  const removalPreviewSequence = useRef(0)
  const [removeStylistOpen, setRemoveStylistOpen] = useState(false)
  const [removeStylistUser, setRemoveStylistUser] = useState<UserRow | null>(null)
  const [removalPreview, setRemovalPreview] = useState<StylistRemovalPreview | null>(null)
  const [allStylists, setAllStylists] = useState<StylistOption[]>([])
  const [removalSubmitting, setRemovalSubmitting] = useState(false)
  const [financialTarget, setFinancialTarget] = useState('')
  const [financialConfirmed, setFinancialConfirmed] = useState(false)

  const [removalModes, setRemovalModes] = useState<{
    dailyLogs: RemovalMode
    confirmedReservations: RemovalMode
    reservationResponses: RemovalMode
    reviews: RemovalMode
  }>({
    dailyLogs: 'TRANSFER',
    confirmedReservations: 'TRANSFER',
    reservationResponses: 'TRANSFER',
    reviews: 'TRANSFER',
  })

  const [removalTargets, setRemovalTargets] = useState<{
    dailyLogs?: string
    confirmedReservations?: string
    reservationResponses?: string
    reviews?: string
  }>({})

  const loadData = useCallback(() => {
    const requestSequence = ++requestSequenceRef.current
    setLoading(true)
    setLoadError(false)
    Promise.all([
      fetchAllAdminUserRoleList<UserRow>('/api/users/system-admins'),
      fetchAllAdminUserRoleList<UserRow>('/api/users/stylists'),
      api.get<PaginatedResponse<UserRow>>('/api/users/clients/admin', {
        params: { page, pageSize, q: debouncedClientsSearch.trim() || undefined },
      }),
      api.get<Array<{ id: string }>>('/api/users/password-reset-candidates'),
    ])
      .then(([admins, stylists, clientsRes, resetCandidatesRes]) => {
        if (requestSequence !== requestSequenceRef.current) return
        if (!clientsRes.data || !Array.isArray(clientsRes.data.items) ||
            !Number.isSafeInteger(clientsRes.data.total) || clientsRes.data.total < 0 ||
            !Number.isSafeInteger(clientsRes.data.page) || clientsRes.data.page < 0 ||
            !Array.isArray(resetCandidatesRes.data)) throw new Error('Invalid users list response')
        const resetCandidateIds = new Set(resetCandidatesRes.data.map(({ id }) => id))
        const withResetStatus = (users: UserRow[]) =>
          users.map((user) => ({
            ...user,
            mustChangePassword: resetCandidateIds.has(user.id),
          }))
        setAdmins(withResetStatus(admins))
        setStylists(withResetStatus(stylists))
        setClients(withResetStatus(clientsRes.data.items))
        setTotal(clientsRes.data.total)
        if (clientsRes.data.page !== page) setPage(clientsRes.data.page)
      })
      .catch(() => {
        if (requestSequence !== requestSequenceRef.current) return
        setLoadError(true)
      })
      .finally(() => {
        if (requestSequence === requestSequenceRef.current) setLoading(false)
      })
  }, [page, pageSize, debouncedClientsSearch])

  useEffect(() => {
    loadData()
    return () => { requestSequenceRef.current += 1 }
  }, [loadData])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedClientsSearch(clientsSearch)
    }, 400)
    return () => clearTimeout(timer)
  }, [clientsSearch])

  const getUserRoles = useCallback((u: UserRow): string[] => u.userRoles?.map((r) => r.role.name) ?? [], [])

  const handleWriteOffClientDebt = async (reason: string) => {
    if (!editUser || !debtToWriteOff) return
    setWriteOffPending(true)
    try {
      await api.patch(`/api/client-debts/${debtToWriteOff}/write-off`, { note: reason })
      success(t('users.toast.debtWrittenOff'))
      await queryClient.invalidateQueries({
        queryKey: ['client-debts', editUser.id],
      })
      setDebtToWriteOff(null)
    } catch (err) {
      showApiError(err, 'users.errors.writeOffFailed')
    } finally {
      setWriteOffPending(false)
    }
  }

  useEffect(() => {
    setPage(0)
  }, [debouncedClientsSearch])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const visiblePageNumbers = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const current = Math.min(totalPages - 1, Math.max(0, page))
    const windowSize = 5
    const half = Math.floor(windowSize / 2)
    const start = Math.max(0, Math.min(current - half, totalPages - windowSize))
    const end = Math.min(totalPages, start + windowSize)
    return { pages: Array.from({ length: end - start }, (_, i) => start + i), totalPages }
  }, [page, pageSize, total])

  const openEdit = (u: UserRow) => {
    setEditUser(u)
    const baseUsername = normalizeUsernameFromNames(u.firstName ?? '', u.lastName ?? '')
    setFormData({
      username: u.username,
      email: u.email ?? '',
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      phone: u.phone ?? '',
      gender: (u.gender ?? '') as '' | 'MALE' | 'FEMALE',
      isActive: u.isActive,
    })
    setInitialEmail(u.email ?? '')
    setInitialUsername(u.username ?? '')
    setEditIsUsernameManuallyEdited(!!u.username && baseUsername.trim().length > 0 && u.username.trim() !== baseUsername)
    setEditUsernameStatus({ loading: false, available: null, suggestions: [] })
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!editUser) return
    const isClient = getUserRoles(editUser).includes('CLIENT')
    const trimmedFirst = formData.firstName.trim()
    const trimmedLast = formData.lastName.trim()
    const trimmedUsername = formData.username.trim()
    if (!trimmedFirst || !trimmedLast) {
      warning(t('users.validation.nameRequired'))
      return
    }
    if (!trimmedUsername) {
      warning(t('users.validation.usernameRequired'))
      return
    }
    if (isClient && !formData.gender) {
      warning(t('users.validation.genderRequiredForClients'))
      return
    }
    setSaving(true)
    try {
      const trimmedEmail = formData.email.trim()
      const trimmedPhone = formData.phone.trim()
      await api.patch(`/api/users/${editUser.id}`, {
        username: trimmedUsername,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        email: trimmedEmail ? trimmedEmail : null,
        phone: trimmedPhone ? trimmedPhone : null,
        ...((formData.gender || null) !== (editUser.gender ?? null) ? { gender: formData.gender || null } : {}),
        isActive: formData.isActive,
      })
      success(t('users.toast.updated'))
      loadData()
      setEditOpen(false)
    } catch (err) {
      showApiError(err, 'users.errors.updateFailed')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!editUser) return
    if (editIsUsernameManuallyEdited) return
    const baseUsername = normalizeUsernameFromNames(formData.firstName, formData.lastName)
    if (!baseUsername) return
    if (baseUsername.trim() === formData.username.trim()) return
    setFormData((prev) => ({ ...prev, username: baseUsername }))
  }, [editUser, editIsUsernameManuallyEdited, formData.firstName, formData.lastName, formData.username])

  useEffect(() => {
    if (!editOpen || !editUser) return
    let cancelled = false
    const username = formData.username.trim()
    if (!username) {
      setEditUsernameStatus({ loading: false, available: null, suggestions: [] })
      return
    }
    if (username === initialUsername.trim()) {
      setEditUsernameStatus({ loading: false, available: true, suggestions: [] })
      return
    }
    const timeout = setTimeout(async () => {
      setEditUsernameStatus((prev) => ({ ...prev, loading: true }))
      try {
        const { data } = await api.get(`/api/users/${editUser.id}/username-availability`, {
          params: { username },
        })
        if (cancelled) return
        setEditUsernameStatus({
          loading: false,
          available: !!data.available,
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        })
      } catch {
        if (!cancelled) setEditUsernameStatus({ loading: false, available: null, suggestions: [] })
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(timeout) }
  }, [editOpen, editUser, formData.username, initialUsername])

  const handleIssueInitialPasswordResetLink = (user: UserRow) => {
    if (!user.mustChangePassword) return
    if (!user.email || !user.isEmailVerified) {
      warning(t('users.credentials.resetLinkNeedsVerifiedEmail'))
      return
    }
    setConfirmRequest({
      title: t('common.confirmTitle'),
      description: t('users.credentials.resetLinkConfirm', { email: user.email }),
      confirmLabel: t('common.confirm'),
      action: async () => {
        setResetLinkSendingId(user.id)
        try {
          await api.post(`/auth/admin/users/${encodeURIComponent(user.id)}/password-reset-link`)
          success(t('users.credentials.resetLinkSent'))
          loadData()
        } catch (err) {
          showApiError(err, 'users.errors.passwordResetLinkFailed')
        } finally {
          setResetLinkSendingId(null)
        }
      },
    })
  }

  const handleCreate = async () => {
    if (!createData.firstName.trim() || !createData.lastName.trim() || !createData.role) {
      warning(t('users.validation.allRequired'))
      return
    }
    if (!createData.gender) {
      warning(t('users.validation.genderRequired'))
      return
    }
    setSaving(true)
    try {
      const response = await api.post('/api/users', {
        ...createData,
        firstName: createData.firstName.trim(),
        lastName: createData.lastName.trim(),
        role: 'CLIENT',
        gender: createData.gender || undefined,
      })
      const username = response.data?.username || createData.username.trim()
      const initialPassword = response.data?.initialPassword
      if (!username || typeof initialPassword !== 'string' || initialPassword.length === 0) {
        loadData()
        setCreateOpen(false)
        setCreateData({ username: '', firstName: '', lastName: '', role: 'CLIENT', gender: '' })
        error(t('users.credentials.unavailable'))
        return
      }
      success(t('users.toast.created'))
      setCreatedCredentials({ username, initialPassword })
      loadData()
      transitioningToCredentials.current = true
      setCreateOpen(false)
      setCredentialsOpen(true)
      setCreateData({ username: '', firstName: '', lastName: '', role: 'CLIENT', gender: '' })
      setIsUsernameManuallyEdited(false)
      setUsernameStatus({ loading: false, available: null, suggestions: [] })
    } catch (err) {
      showApiError(err, 'users.errors.createFailed')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!createOpen) return
    let cancelled = false
    const base = normalizeUsernameFromNames(createData.firstName, createData.lastName)
    const username = (isUsernameManuallyEdited ? createData.username : base).trim()
    if (!username) {
      setUsernameStatus({ loading: false, available: null, suggestions: [] })
      return
    }
    if (!isUsernameManuallyEdited && createData.username !== base) {
      setCreateData((prev) => ({ ...prev, username: base }))
    }
    const timeout = setTimeout(async () => {
      setUsernameStatus((prev) => ({ ...prev, loading: true }))
      try {
        const { data } = await api.get('/api/users/username-availability', { params: { username } })
        if (cancelled) return
        setUsernameStatus({
          loading: false,
          available: !!data.available,
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        })
      } catch {
        if (!cancelled) setUsernameStatus({ loading: false, available: null, suggestions: [] })
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(timeout) }
  }, [createOpen, createData.firstName, createData.lastName, createData.username, isUsernameManuallyEdited])

  const handleDeactivate = (id: string, username: string) => {
    setConfirmRequest({
      title: t('common.confirmTitle'),
      description: t('users.confirmDeactivate', { username }),
      confirmLabel: t('common.confirm'),
      action: async () => {
        try {
          await api.patch(`/api/users/${id}`, { isActive: false })
          success(t('users.toast.deactivated'))
          loadData()
        } catch (err) {
          showApiError(err, 'users.errors.deactivateFailed')
        }
      },
    })
  }

  const handleAssignRole = async (userId: string, roleName: string) => {
    try {
      await api.post(`/api/users/${userId}/roles`, { role: roleName })
      if (roleName === 'STYLIST') {
        success(t('users.toast.stylistPendingTitle'), t('users.toast.stylistPendingDescription'))
      } else {
        success(t('users.toast.roleAssigned', { role: getRoleLabel(roleName) }))
      }
      loadData()
    } catch (err) {
      showApiError(err, 'users.errors.assignRoleFailed')
    }
  }

  const getTargetOptions = () => {
    const currentStylistId = removalPreview?.stylistProfileId
    return allStylists
      .filter((s) => typeof s.id === 'string' && s.id.trim() !== '' && s.id !== currentStylistId && ['ACTIVE', 'PENDING'].includes(String(s.status ?? '').toUpperCase()))
      .map((s) => ({
        id: s.id,
        label: [s.user?.firstName, s.user?.lastName].filter(Boolean).join(' ') || s.user?.username || s.id,
        isPending: String(s.status ?? '').toUpperCase() !== 'ACTIVE' || s.isActive !== true || s.user?.isActive !== true,
      }))
  }

  const removalSummary = useMemo(() => {
    if (!removalPreview) return []
    const c = removalPreview.counts
    const rows = [
      { key: 'dailyLogs', label: t('users.stylistRemoval.categories.dailyLogs'), count: c.dailyLogEntriesCount },
      { key: 'confirmedReservations', label: t('users.stylistRemoval.categories.confirmedReservations'), count: c.confirmedReservationsCount },
      { key: 'reservationResponses', label: t('users.stylistRemoval.categories.reservationResponses'), count: c.reservationResponsesCount },
      { key: 'reviews', label: t('users.stylistRemoval.categories.reviews'), count: c.reviewsCount },
    ] as const
    return rows
      .filter((r) => (r.count ?? 0) > 0)
      .map((r) => {
        const mode = removalModes[r.key]
        const target = (removalTargets as any)[r.key] as string | undefined
        return { key: r.key, label: r.label, count: r.count, mode, target }
      })
  }, [removalPreview, removalModes, removalTargets, t])

  const isRemovalReady = useMemo(() => {
    if (!removalPreview) return false
    const financial = removalPreview.financial
    if ((financial.clientDebtsCount > 0 || financial.manualIncomeCount > 0) && (!financialTarget || !financialConfirmed)) return false
    if (financial.bookedDailyLogsCount > 0 && removalModes.dailyLogs === 'DELETE') return false
    for (const row of removalSummary) {
      if (row.mode === 'TRANSFER' && !row.target) return false
    }
    return true
  }, [removalPreview, removalSummary, removalModes.dailyLogs, financialTarget, financialConfirmed])

  const openRemoveStylist = async (userId: string) => {
    const sequence = ++removalPreviewSequence.current
    const u = [...admins, ...stylists, ...clients].find((x) => x.id === userId) ?? null
    setRemoveStylistUser(u)
    setRemovalPreview(null)
    setAllStylists([])
    setRemovalModes({
      dailyLogs: 'TRANSFER',
      confirmedReservations: 'TRANSFER',
      reservationResponses: 'TRANSFER',
      reviews: 'TRANSFER',
    })
    setRemovalTargets({})
    setFinancialTarget('')
    setFinancialConfirmed(false)
    setRemoveStylistOpen(true)

    try {
      const previewRes = await api.get<StylistRemovalPreview>(`/api/users/${userId}/stylist-removal-preview`)
      if (sequence !== removalPreviewSequence.current) return
      const preview = previewRes.data
      if (!preview || typeof preview.stylistProfileId !== 'string' ||
          typeof preview.revision !== 'string' || !/^[a-f0-9]{64}$/.test(preview.revision) ||
          !preview.counts || !preview.financial || [preview.counts.dailyLogEntriesCount, preview.counts.confirmedReservationsCount,
            preview.counts.reservationResponsesCount, preview.counts.reviewsCount, preview.financial.clientDebtsCount,
            preview.financial.manualIncomeCount, preview.financial.bookedDailyLogsCount].some(value => !Number.isSafeInteger(value) || value < 0)) {
        throw new Error('Invalid stylist removal preview')
      }
      if (preview.financial.bookedDailyLogsCount > preview.counts.dailyLogEntriesCount) {
        throw new Error('Inconsistent stylist removal preview')
      }
      const c = preview.counts
      const hasAnyLinks =
        (c.dailyLogEntriesCount ?? 0) > 0 ||
        (c.confirmedReservationsCount ?? 0) > 0 ||
        (c.reservationResponsesCount ?? 0) > 0 ||
        (c.reviewsCount ?? 0) > 0 ||
        preview.financial.clientDebtsCount > 0 || preview.financial.manualIncomeCount > 0
      // Even with no linked records, role removal must be explicitly confirmed.
      if (!hasAnyLinks) {
        setRemovalPreview(preview)
        return
      }

      const items = await fetchAllAdminStylists<StylistOption>()
      if (sequence !== removalPreviewSequence.current) return
      setAllStylists(items)
      setRemovalPreview(preview)
    } catch (err) {
      if (sequence !== removalPreviewSequence.current) return
      showApiError(err, 'users.errors.prepareStylistRemovalFailed')
      setRemovalSubmitting(false)
      setRemoveStylistOpen(false)
    }
  }

  const handleRemoveRole = async (userId: string, roleName: string) => {
    if (roleName === 'STYLIST') {
      await openRemoveStylist(userId)
      return
    }
    setConfirmRequest({
      title: t('common.confirmTitle'),
      description: t('users.confirmRemoveRole', { role: getRoleLabel(roleName) }),
      confirmLabel: t('common.confirm'),
      action: async () => {
        try {
          await api.delete(`/api/users/${userId}/roles/${roleName}`)
          success(t('users.toast.roleRemoved', { role: getRoleLabel(roleName) }))
          loadData()
        } catch (err) {
          showApiError(err, 'users.errors.removeRoleFailed')
        }
      },
    })
  }

  const handleConfirmRemoveStylist = async () => {
    if (!removeStylistUser || !removalPreview) return
    const counts = removalPreview.counts
    const payload = {
      previewRevision: removalPreview.revision,
      financialTargetStylistProfileId: financialTarget || undefined,
      confirmFinancialTransfer: financialConfirmed,
      dailyLogs: {
        mode: counts.dailyLogEntriesCount > 0 ? removalModes.dailyLogs : 'DELETE',
        targetStylistProfileId: removalModes.dailyLogs === 'TRANSFER' ? removalTargets.dailyLogs : undefined,
      },
      confirmedReservations: {
        mode: counts.confirmedReservationsCount > 0 ? removalModes.confirmedReservations : 'DELETE',
        targetStylistProfileId:
          removalModes.confirmedReservations === 'TRANSFER' ? removalTargets.confirmedReservations : undefined,
      },
      reservationResponses: {
        mode: counts.reservationResponsesCount > 0 ? removalModes.reservationResponses : 'DELETE',
        targetStylistProfileId:
          removalModes.reservationResponses === 'TRANSFER' ? removalTargets.reservationResponses : undefined,
      },
      reviews: {
        mode: counts.reviewsCount > 0 ? removalModes.reviews : 'DELETE',
        targetStylistProfileId: removalModes.reviews === 'TRANSFER' ? removalTargets.reviews : undefined,
      },
    } as const

    const missingTarget = (key: 'dailyLogs' | 'confirmedReservations' | 'reservationResponses' | 'reviews') =>
      payload[key].mode === 'TRANSFER' && !payload[key].targetStylistProfileId

    if (
      missingTarget('dailyLogs') ||
      missingTarget('confirmedReservations') ||
      missingTarget('reservationResponses') ||
      missingTarget('reviews')
    ) {
      warning(t('users.validation.transferTargetRequired'))
      return
    }

    setRemovalSubmitting(true)
    try {
      await api.post(`/api/users/${removeStylistUser.id}/remove-stylist-role`, payload)
      success(t('users.toast.stylistRoleRemoved'))
      setRemoveStylistOpen(false)
      loadData()
    } catch (err) {
      if (getErrorCode(err) === 'USERS_STYLIST_PREVIEW_CHANGED') setRemoveStylistOpen(false)
      showApiError(err, 'users.errors.stylistRemovalFailed')
    } finally {
      setRemovalSubmitting(false)
    }
  }

  const { userColumns, renderUserCard } = useUserRowPresentation({
    getUserRoles, getRoleLabel, resetLinkSendingId, editTriggerRef, removalTriggerRef,
    openEdit, handleRemoveRole, handleAssignRole, handleIssueInitialPasswordResetLink, handleDeactivate,
  })

  const tabCount = activeTab === 'admins' ? admins.length : activeTab === 'stylists' ? stylists.length : total
  const headerTitle = t(`users.tabs.${activeTab}`, { count: tabCount })

  return (
    <div data-admin-users>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-content">{t('nav.users')}</h1>
          <p className="mt-1 text-sm text-content-strong ">{t('users.subtitle')}</p>
        </div>

        <Button type="button" ref={createTriggerRef} onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('users.createButton')}
        </Button>
      </div>

      {loadError && !loading ? (
        <ErrorState description={t('users.errors.loadFailed')} onRetry={loadData} />
      ) : (
        <>
      <Card>
        <div className="p-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList className="h-auto flex-wrap justify-start gap-1 p-2">
                <TabsTrigger value="admins">{t('users.tabs.admins', { count: admins.length })}</TabsTrigger>
                <TabsTrigger value="stylists">{t('users.tabs.stylists', { count: stylists.length })}</TabsTrigger>
                <TabsTrigger value="clients">{t('users.tabs.clients', { count: total })}</TabsTrigger>
              </TabsList>

              {activeTab === 'clients' ? (
                <div className="relative w-full max-w-[360px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-strong" aria-hidden="true" />
                  <Input
                    className="pl-9"
                    aria-label={t('users.searchClients')}
                    placeholder={t('users.searchClients')}
                    value={clientsSearch}
                    onChange={(e) => setClientsSearch(e.target.value)}
                  />
                </div>
              ) : (
                <div className="text-sm text-content-strong">{headerTitle}</div>
              )}
            </div>

            <TabsContent value="admins" className="mt-4">
              <UsersList loading={loading} items={admins} columns={userColumns} renderCard={renderUserCard} />
            </TabsContent>
            <TabsContent value="stylists" className="mt-4">
              <UsersList loading={loading} items={stylists} columns={userColumns} renderCard={renderUserCard} />
            </TabsContent>
            <TabsContent value="clients" className="mt-4">
              <UsersList loading={loading} items={clients} columns={userColumns} renderCard={renderUserCard} />
            </TabsContent>
          </Tabs>
        </div>
      </Card>

      {activeTab === 'clients' ? (
        <UsersPagination total={total} page={page} totalPages={totalPages} visiblePageNumbers={visiblePageNumbers} setPage={setPage} />
      ) : null}

        </>
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
        clientDebtsQuery={clientDebtsQuery} setDebtToWriteOff={setDebtToWriteOff} onSave={() => void handleSave()} />

      <CreateUserDialog createOpen={createOpen} setCreateOpen={setCreateOpen} saving={saving}
        transitioningToCredentials={transitioningToCredentials} createTriggerRef={createTriggerRef}
        createData={createData} setCreateData={setCreateData} setIsUsernameManuallyEdited={setIsUsernameManuallyEdited}
        usernameStatus={usernameStatus} getRoleLabel={getRoleLabel} onCreate={() => void handleCreate()} />

      {/* Credentials */}
      <Dialog
        open={credentialsOpen}
        onOpenChange={(open) => {
          setCredentialsOpen(open)
          if (!open) setCreatedCredentials(null)
        }}
      >
        <DialogContent data-users-dialog className="max-w-lg" onCloseAutoFocus={(event) => {
          transitioningToCredentials.current = false
          if (createTriggerRef.current?.isConnected) {
            event.preventDefault()
            createTriggerRef.current.focus()
          }
        }}>
          <DialogHeader>
            <DialogTitle>{t('users.credentials.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-line p-3 ">
              <p className="text-xs text-content-strong">{t('users.credentials.username')}</p>
              <p className="font-semibold text-content">{createdCredentials?.username}</p>
            </div>
            <div className="rounded-md border border-line p-3 ">
              <p className="text-xs text-content-strong">{t('users.credentials.initialPassword')}</p>
              <p className="font-semibold text-content">{createdCredentials?.initialPassword}</p>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t('users.credentials.instructions')}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" onClick={() => { setCredentialsOpen(false); setCreatedCredentials(null) }}>
              {t('users.credentials.acknowledge')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />

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
