import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Eye,
  X,
} from 'lucide-react'

import api from '../api/client'
import { fetchAllAdminStylists } from '../api/catalog'
import { getErrorMessage } from '../api/error'
import { resolveAdminApiErrorKey } from '../features/admin/admin-api-error.mjs'
import { formatLocalizedAmount } from '../i18n/locale-utils.mjs'
import { useAppToast } from '../lib/toast/useAppToast'
import { getUploadUrl } from '../utils/uploadUrl'

import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { ConfirmDialog } from '../features/finance/components/confirm-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { Switch } from '../components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

interface UserRole {
  role: { name: string }
}

interface UserRow {
  id: string
  username: string
  email: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  gender?: 'MALE' | 'FEMALE' | null
  avatar: string | null
  isActive: boolean
  isEmailVerified: boolean
  createdAt: string
  userRoles?: UserRole[]
  stylistProfile?: { id: string; status?: string | null } | null
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

interface StylistRemovalPreview {
  stylistProfileId: string
  counts: {
    dailyLogEntriesCount: number
    confirmedReservationsCount: number
    reservationResponsesCount: number
    reviewsCount: number
  }
}

interface StylistOption {
  id: string
  user?: {
    firstName?: string | null
    lastName?: string | null
    username?: string | null
  }
  status?: 'PENDING' | 'ACTIVE' | string | null
}

type ClientDebtRow = {
  id: string
  amount: number | string
  note?: string | null
  createdAt: string
  service?: { id: string; name: string } | null
  createdBy?: { id: string; username: string } | null
}

const ROLES_MANAGED_IN_UI = ['SYSTEM_ADMIN', 'OWNER', 'CLIENT', 'STYLIST'] as const

const getRoleBadgeVariant = (roleName: string) => {
  if (roleName === 'SYSTEM_ADMIN') return 'danger'
  if (roleName === 'OWNER') return 'brand'
  if (roleName === 'STYLIST') return 'secondary'
  if (roleName === 'CLIENT') return 'success'
  return 'secondary'
}

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

const getUserDisplayName = (u: Pick<UserRow, 'firstName' | 'lastName' | 'username'>) =>
  [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || '-'

const initials = (firstName?: string | null, lastName?: string | null, username?: string | null) => {
  const f = (firstName ?? '').trim()
  const l = (lastName ?? '').trim()
  if (f || l) return `${(f[0] ?? '').toUpperCase()}${(l[0] ?? '').toUpperCase()}`.trim() || 'U'
  return (username ?? 'U')[0]?.toUpperCase() ?? 'U'
}

export default function Users() {
  const { t, i18n } = useTranslation()
  const { success, error, warning } = useAppToast()
  const showApiError = (err: unknown, fallbackKey: string) => {
    const message = getErrorMessage(err, '')
    error(t(resolveAdminApiErrorKey(message, fallbackKey)))
  }
  const getRoleLabel = (roleName: string) =>
    t(`users.roleNames.${roleName}`, { defaultValue: roleName })
  const navigate = useNavigate()

  const [admins, setAdmins] = useState<UserRow[]>([])
  const [stylists, setStylists] = useState<UserRow[]>([])
  const [clients, setClients] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  const [clientsSearch, setClientsSearch] = useState('')
  const [debouncedClientsSearch, setDebouncedClientsSearch] = useState('')

  const [saving, setSaving] = useState(false)
  const [clientDebts, setClientDebts] = useState<ClientDebtRow[]>([])
  const [clientDebtsLoading, setClientDebtsLoading] = useState(false)
  const [debtToWriteOff, setDebtToWriteOff] = useState<string | null>(null)
  const [writeOffPending, setWriteOffPending] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const [activeTab, setActiveTab] = useState<'admins' | 'stylists' | 'clients'>('clients')

  const [editOpen, setEditOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [credentialsOpen, setCredentialsOpen] = useState(false)

  const [editUser, setEditUser] = useState<UserRow | null>(null)
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

  const [removeStylistOpen, setRemoveStylistOpen] = useState(false)
  const [removeStylistUser, setRemoveStylistUser] = useState<UserRow | null>(null)
  const [removalPreview, setRemovalPreview] = useState<StylistRemovalPreview | null>(null)
  const [allStylists, setAllStylists] = useState<StylistOption[]>([])
  const [removalSubmitting, setRemovalSubmitting] = useState(false)

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
    setLoading(true)
    Promise.all([
      api.get<UserRow[]>('/api/users/system-admins'),
      api.get<UserRow[]>('/api/users/stylists'),
      api.get<PaginatedResponse<UserRow>>('/api/users/clients/admin', {
        params: { page, pageSize, q: debouncedClientsSearch.trim() || undefined },
      }),
    ])
      .then(([adminsRes, stylistsRes, clientsRes]) => {
        setAdmins(Array.isArray(adminsRes.data) ? adminsRes.data : [])
        setStylists(Array.isArray(stylistsRes.data) ? stylistsRes.data : [])
        setClients(Array.isArray(clientsRes.data.items) ? clientsRes.data.items : [])
        setTotal(clientsRes.data.total ?? 0)
      })
      .catch(() => {
        setAdmins([])
        setStylists([])
        setClients([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [page, pageSize, debouncedClientsSearch])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedClientsSearch(clientsSearch)
    }, 400)
    return () => clearTimeout(timer)
  }, [clientsSearch])

  const getUserRoles = useCallback((u: UserRow): string[] => u.userRoles?.map((r) => r.role.name) ?? [], [])

  useEffect(() => {
    if (!editOpen || !editUser) return
    const roles = getUserRoles(editUser)
    if (!roles.includes('CLIENT')) {
      setClientDebts([])
      return
    }
    setClientDebtsLoading(true)
    api
      .get('/api/client-debts', { params: { clientId: editUser.id } })
      .then((r) => setClientDebts(Array.isArray(r.data) ? r.data : []))
      .catch(() => setClientDebts([]))
      .finally(() => setClientDebtsLoading(false))
  }, [editOpen, editUser, getUserRoles])

  const handleWriteOffClientDebt = async (reason: string) => {
    if (!editUser || !debtToWriteOff) return
    setWriteOffPending(true)
    try {
      await api.patch(`/api/client-debts/${debtToWriteOff}/write-off`, { note: reason })
      success(t('users.toast.debtWrittenOff'))
      const { data } = await api.get('/api/client-debts', { params: { clientId: editUser.id } })
      setClientDebts(Array.isArray(data) ? data : [])
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
        gender: formData.gender || null,
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
  }, [editUser, editIsUsernameManuallyEdited, formData.firstName, formData.lastName])

  useEffect(() => {
    if (!editUser) return
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
        setEditUsernameStatus({
          loading: false,
          available: !!data.available,
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        })
      } catch {
        setEditUsernameStatus({ loading: false, available: null, suggestions: [] })
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [editUser, formData.username, initialUsername])

  const handleCreate = async () => {
    if (!createData.firstName || !createData.lastName || !createData.role) {
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
        setUsernameStatus({
          loading: false,
          available: !!data.available,
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        })
      } catch {
        setUsernameStatus({ loading: false, available: null, suggestions: [] })
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [createData.firstName, createData.lastName, createData.username, isUsernameManuallyEdited])

  const handleDeactivate = async (id: string, username: string) => {
    if (!window.confirm(t('users.confirmDeactivate', { username }))) return
    try {
      await api.patch(`/api/users/${id}`, { isActive: false })
      success(t('users.toast.deactivated'))
      loadData()
    } catch (err) {
      showApiError(err, 'users.errors.deactivateFailed')
    }
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
      .filter((s) => s.id !== currentStylistId)
      .map((s) => ({
        id: s.id,
        label: [s.user?.firstName, s.user?.lastName].filter(Boolean).join(' ') || s.user?.username || s.id,
        isPending: String(s.status ?? '').toUpperCase() === 'PENDING',
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
    for (const row of removalSummary) {
      if (row.mode === 'TRANSFER' && !row.target) return false
    }
    return true
  }, [removalPreview, removalSummary])

  const openRemoveStylist = async (userId: string) => {
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
    setRemoveStylistOpen(true)

    try {
      const previewRes = await api.get<StylistRemovalPreview>(`/api/users/${userId}/stylist-removal-preview`)
      setRemovalPreview(previewRes.data)
      const c = previewRes.data.counts
      const hasAnyLinks =
        (c.dailyLogEntriesCount ?? 0) > 0 ||
        (c.confirmedReservationsCount ?? 0) > 0 ||
        (c.reservationResponsesCount ?? 0) > 0 ||
        (c.reviewsCount ?? 0) > 0
      if (!hasAnyLinks) {
        setRemovalSubmitting(true)
        await api.post(`/api/users/${userId}/remove-stylist-role`, {
          dailyLogs: { mode: 'DELETE' },
          confirmedReservations: { mode: 'DELETE' },
          reservationResponses: { mode: 'DELETE' },
          reviews: { mode: 'DELETE' },
        })
        success(t('users.toast.stylistRoleRemoved'))
        setRemoveStylistOpen(false)
        loadData()
        setRemovalSubmitting(false)
        return
      }

      const items = await fetchAllAdminStylists<StylistOption>()
      setAllStylists(items)
    } catch (err) {
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
    if (!window.confirm(t('users.confirmRemoveRole', { role: getRoleLabel(roleName) }))) return
    try {
      await api.delete(`/api/users/${userId}/roles/${roleName}`)
      success(t('users.toast.roleRemoved', { role: getRoleLabel(roleName) }))
      loadData()
    } catch (err) {
      showApiError(err, 'users.errors.removeRoleFailed')
    }
  }

  const handleConfirmRemoveStylist = async () => {
    if (!removeStylistUser || !removalPreview) return
    const counts = removalPreview.counts
    const payload = {
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

    const missingTarget = (key: keyof typeof payload) =>
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
      showApiError(err, 'users.errors.stylistRemovalFailed')
    } finally {
      setRemovalSubmitting(false)
    }
  }

  const getAvailableRolesToAssign = (u: UserRow) => {
    const current = getUserRoles(u)
    return ROLES_MANAGED_IN_UI.filter((r) => !current.includes(r))
  }

  const canRemoveRole = (roleName: string) => roleName !== 'CLIENT' && ROLES_MANAGED_IN_UI.includes(roleName as any)

  const renderRoles = (u: UserRow) => {
    const roles = getUserRoles(u)
    const addable = getAvailableRolesToAssign(u)
    return (
      <div className="flex flex-wrap items-center gap-2">
        {roles.map((roleName) => {
          const isStylist = roleName === 'STYLIST'
          const isPending = isStylist && String(u.stylistProfile?.status ?? '').toUpperCase() === 'PENDING'
          return (
            <span
              key={roleName}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <Badge variant={getRoleBadgeVariant(roleName)} className="rounded-full px-2 py-0.5 text-[10px]">
                {getRoleLabel(roleName)}
              </Badge>
              {isStylist ? <span className="text-slate-500">{t('users.stylistRoleBadge')}</span> : null}
              {isPending ? (
                <button
                  type="button"
                  className="text-[10px] font-medium text-amber-700 underline underline-offset-2 dark:text-amber-300"
                  onClick={() => navigate('/admin/stylists')}
                >
                  {t('users.status.profileIncomplete')}
                </button>
              ) : null}
              {canRemoveRole(roleName) ? (
                <button
                  type="button"
                  className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label={t('users.aria.removeRole', { role: getRoleLabel(roleName) })}
                  onClick={() => void handleRemoveRole(u.id, roleName)}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ) : null}
            </span>
          )
        })}

        {addable.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="icon" variant="outline" className="h-8 w-8" aria-label={t('users.aria.addRole')}>
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {addable.map((r) => (
                <DropdownMenuItem key={r} onClick={() => void handleAssignRole(u.id, r)}>
                  {getRoleLabel(r)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/admin/stylists')}>{t('users.openStylists')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    )
  }

  const renderUserRow = (u: UserRow) => (
    <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800/80">
      <td className="p-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={u.avatar ? getUploadUrl(u.avatar) : undefined} alt={getUserDisplayName(u)} />
          <AvatarFallback>{initials(u.firstName, u.lastName, u.username)}</AvatarFallback>
        </Avatar>
      </td>
      <td className="p-3 font-medium text-slate-900 dark:text-slate-50">{u.username}</td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <span className="truncate">{u.email ?? '-'}</span>
          {u.email ? (
            <Badge variant={u.isEmailVerified ? 'success' : 'warning'} className="text-[10px]">
              {u.isEmailVerified ? t('users.status.emailVerified') : t('users.status.emailUnverified')}
            </Badge>
          ) : null}
        </div>
      </td>
      <td className="p-3">{[u.firstName, u.lastName].filter(Boolean).join(' ') || '-'}</td>
      <td className="p-3">{u.phone ?? '-'}</td>
      <td className="p-3">{renderRoles(u)}</td>
      <td className="p-3">
        <Badge variant={u.isActive ? 'success' : 'danger'} className="text-[10px]">
          {u.isActive ? t('common.active') : t('common.inactive')}
        </Badge>
      </td>
      <td className="p-3 text-right">
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={t('users.aria.analytics')}
            onClick={() => navigate(`/admin/client-analytics?userId=${u.id}`)}
          >
            <Eye className="h-4 w-4 text-teal-600" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={t('users.aria.edit')}
            onClick={() => openEdit(u)}
          >
            <Pencil className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </Button>
          {u.isActive ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label={t('users.aria.deactivate')}
              onClick={() => void handleDeactivate(u.id, u.username)}
            >
              <Trash2 className="h-4 w-4 text-rose-600" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  )

  const renderUserCard = (u: UserRow) => (
    <Card key={u.id} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={u.avatar ? getUploadUrl(u.avatar) : undefined} alt={getUserDisplayName(u)} />
            <AvatarFallback>{initials(u.firstName, u.lastName, u.username)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900 dark:text-slate-50">{u.username}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{getUserDisplayName(u)}</p>
          </div>
        </div>
        <Badge variant={u.isActive ? 'success' : 'danger'} className="text-[10px]">
          {u.isActive ? t('common.active') : t('common.inactive')}
        </Badge>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">{t('users.email')}</span>
          <span className="truncate text-slate-900 dark:text-slate-50">{u.email ?? '-'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">{t('users.phone')}</span>
          <span className="truncate text-slate-900 dark:text-slate-50">{u.phone ?? '-'}</span>
        </div>
        <div className="space-y-2">
          <p className="text-slate-500">{t('users.roles')}</p>
          {renderRoles(u)}
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/admin/client-analytics?userId=${u.id}`)}>
          {t('users.aria.analytics')}
        </Button>
        <Button type="button" size="sm" onClick={() => openEdit(u)}>
          {t('common.edit')}
        </Button>
      </div>
    </Card>
  )

  const tabCount = activeTab === 'admins' ? admins.length : activeTab === 'stylists' ? stylists.length : total
  const headerTitle = t(`users.tabs.${activeTab}`, { count: tabCount })

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('nav.users')}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('users.subtitle')}</p>
        </div>

        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('users.createButton')}
        </Button>
      </div>

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
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <Input
                    className="pl-9"
                    placeholder={t('users.searchClients')}
                    value={clientsSearch}
                    onChange={(e) => setClientsSearch(e.target.value)}
                  />
                </div>
              ) : (
                <div className="text-sm text-slate-500">{headerTitle}</div>
              )}
            </div>

            <TabsContent value="admins" className="mt-4">
              <UsersList loading={loading} items={admins} renderRow={renderUserRow} renderCard={renderUserCard} />
            </TabsContent>
            <TabsContent value="stylists" className="mt-4">
              <UsersList loading={loading} items={stylists} renderRow={renderUserRow} renderCard={renderUserCard} />
            </TabsContent>
            <TabsContent value="clients" className="mt-4">
              <UsersList loading={loading} items={clients} renderRow={renderUserRow} renderCard={renderUserCard} />
            </TabsContent>
          </Tabs>
        </div>
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{t('users.clientTotal', { count: total })}</p>

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            {t('common.previous')}
          </Button>

          {visiblePageNumbers.pages[0] > 0 ? (
            <>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPage(0)}>
                1
              </Button>
              {visiblePageNumbers.pages[0] > 1 ? <span className="text-sm text-slate-500">…</span> : null}
            </>
          ) : null}

          {visiblePageNumbers.pages.map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={p === page ? 'default' : 'ghost'}
              onClick={() => setPage(p)}
            >
              {p + 1}
            </Button>
          ))}

          {visiblePageNumbers.totalPages - 1 > visiblePageNumbers.pages[visiblePageNumbers.pages.length - 1] ? (
            <>
              {visiblePageNumbers.pages[visiblePageNumbers.pages.length - 1] < visiblePageNumbers.totalPages - 2 ? (
                <span className="text-sm text-slate-500">…</span>
              ) : null}
              <Button type="button" size="sm" variant="ghost" onClick={() => setPage(visiblePageNumbers.totalPages - 1)}>
                {visiblePageNumbers.totalPages}
              </Button>
            </>
          ) : null}

          <span className="text-sm text-slate-600 dark:text-slate-300">
            {page + 1} / {totalPages}
          </span>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('common.next')}
          </Button>
        </div>
      </div>

      {/* Remove STYLIST role */}
      <Dialog open={removeStylistOpen} onOpenChange={setRemoveStylistOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('users.stylistRemoval.title')}</DialogTitle>
          </DialogHeader>

          {!removalPreview ? (
            <div className="flex justify-center py-10 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {t('users.stylistRemoval.stylist', { username: removeStylistUser?.username ?? '' })}
              </p>

              {([
                { key: 'dailyLogs', label: t('users.stylistRemoval.categories.dailyLogs'), count: removalPreview.counts.dailyLogEntriesCount },
                { key: 'confirmedReservations', label: t('users.stylistRemoval.categories.confirmedReservations'), count: removalPreview.counts.confirmedReservationsCount },
                { key: 'reservationResponses', label: t('users.stylistRemoval.categories.reservationResponses'), count: removalPreview.counts.reservationResponsesCount },
                { key: 'reviews', label: t('users.stylistRemoval.categories.reviews'), count: removalPreview.counts.reviewsCount },
              ] as const).map((row) => {
                if (row.count <= 0) return null
                const opts = getTargetOptions()
                const mode = removalModes[row.key]
                return (
                  <div key={row.key} className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900 dark:text-slate-50">{row.label}</p>
                      <Badge variant="secondary">{row.count}</Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name={`${row.key}-mode`}
                          value="TRANSFER"
                          checked={mode === 'TRANSFER'}
                          onChange={() => setRemovalModes((prev) => ({ ...prev, [row.key]: 'TRANSFER' }))}
                        />
                        <span>{t('users.stylistRemoval.transfer')}</span>
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name={`${row.key}-mode`}
                          value="DELETE"
                          checked={mode === 'DELETE'}
                          onChange={() => setRemovalModes((prev) => ({ ...prev, [row.key]: 'DELETE' }))}
                        />
                        <span>{t('users.stylistRemoval.delete')}</span>
                      </label>
                    </div>

                    {mode === 'TRANSFER' ? (
                      <div className="mt-3 space-y-2">
                        <Label>{t('users.stylistRemoval.target')}</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-offset-slate-950"
                          value={(removalTargets as any)[row.key] ?? ''}
                          onChange={(e) => setRemovalTargets((prev) => ({ ...prev, [row.key]: e.target.value }))}
                        >
                          <option value="">{t('users.stylistRemoval.chooseTarget')}</option>
                          {opts.map((o) => (
                            <option key={o.id} value={o.id} disabled={o.isPending}>
                              {o.label}
                              {o.isPending ? ` ${t('users.stylistRemoval.pendingOption')}` : ''}
                            </option>
                          ))}
                        </select>
                        {opts.some((o) => o.isPending) ? (
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            {t('users.stylistRemoval.pendingWarning')}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{t('users.stylistRemoval.deleteWarning')}</p>
                    )}
                  </div>
                )
              })}

              {removalSummary.length > 0 ? (
                <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
                  <p className="mb-2 font-medium text-slate-900 dark:text-slate-50">{t('users.stylistRemoval.summary')}</p>
                  <div className="space-y-1 text-sm">
                    {removalSummary.map((r) => (
                      <div key={r.label} className="flex items-center justify-between gap-3">
                        <span className="text-slate-700 dark:text-slate-200">
                          {r.label} ({r.count})
                        </span>
                        <span className={r.mode === 'DELETE' ? 'font-medium text-rose-700 dark:text-rose-300' : 'font-medium text-blue-700 dark:text-blue-300'}>
                          {r.mode === 'DELETE' ? t('users.stylistRemoval.deleteSummary') : t('users.stylistRemoval.transferSummary')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <Alert>
                <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>{t('users.stylistRemoval.noteTitle')}</AlertTitle>
                <AlertDescription>
                  {t('users.stylistRemoval.note')}
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setRemoveStylistOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-950/20"
              onClick={() => void handleConfirmRemoveStylist()}
              disabled={!removalPreview || !isRemovalReady || removalSubmitting}
            >
              {removalSubmitting ? t('users.stylistRemoval.removing') : t('users.stylistRemoval.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('users.editUserTitle', { username: editUser?.username ?? '' })}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('users.username')}</Label>
              <Input
                value={formData.username}
                onChange={(e) => {
                  setEditIsUsernameManuallyEdited(true)
                  setFormData((p) => ({ ...p, username: e.target.value }))
                }}
              />
              {editUsernameStatus.loading ? <p className="text-xs text-slate-500">{t('users.usernameAvailability.checking')}</p> : null}
              {!editUsernameStatus.loading && editUsernameStatus.available === true && formData.username.trim() === initialUsername.trim() ? (
                <p className="text-xs text-blue-600">{t('users.usernameAvailability.current')}</p>
              ) : null}
              {!editUsernameStatus.loading && editUsernameStatus.available === true && formData.username.trim() !== initialUsername.trim() ? (
                <p className="text-xs text-emerald-600">{t('users.usernameAvailability.available')}</p>
              ) : null}
              {!editUsernameStatus.loading && editUsernameStatus.available === false ? (
                <p className="text-xs text-rose-600">{t('users.usernameAvailability.unavailable')}</p>
              ) : null}

              {editUsernameStatus.suggestions.length > 0 && editUsernameStatus.available === false ? (
                <Alert className="mt-2">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>{t('users.usernameAvailability.suggestions')}</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {editUsernameStatus.suggestions.map((item) => (
                        <Button
                          key={item}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditIsUsernameManuallyEdited(true)
                            setFormData((p) => ({ ...p, username: item }))
                          }}
                        >
                          {item}
                        </Button>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="mb-0">{t('users.email')}</Label>
                {formData.email.trim().length > 0 ? (
                  <Badge
                    variant={formData.email.trim() === initialEmail.trim() && !!editUser?.isEmailVerified ? 'success' : 'warning'}
                    className="text-[10px]"
                  >
                    {formData.email.trim() === initialEmail.trim() && !!editUser?.isEmailVerified ? t('users.status.emailVerified') : t('users.status.emailUnverified')}
                  </Badge>
                ) : null}
              </div>
              <Input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>{t('auth.firstName')}</Label>
              <Input value={formData.firstName} onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t('auth.lastName')}</Label>
              <Input value={formData.lastName} onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>{t('users.phone')}</Label>
              <Input value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>
                {t('users.gender.label')}
                {editUser && getUserRoles(editUser).includes('CLIENT') ? <span className="ml-1 text-rose-600">*</span> : null}
              </Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-offset-slate-950"
                value={formData.gender}
                onChange={(e) => setFormData((p) => ({ ...p, gender: e.target.value as any }))}
              >
                <option value="">{t('users.gender.choose')}</option>
                <option value="FEMALE">{t('users.gender.female')}</option>
                <option value="MALE">{t('users.gender.male')}</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800 md:col-span-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{t('users.form.active')}</p>
                <p className="text-xs text-slate-500">{t('users.form.inactiveHint')}</p>
              </div>
              <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData((p) => ({ ...p, isActive: checked }))} />
            </div>

            {editUser && getUserRoles(editUser).includes('CLIENT') ? (
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <Label className="mb-0">{t('users.debts.title')}</Label>
                  {clientDebtsLoading ? <span className="text-xs text-slate-500">{t('users.debts.loading')}</span> : null}
                </div>

                {clientDebts.length === 0 ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                    {t('users.debts.none')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clientDebts.map((d) => (
                      <div
                        key={d.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 dark:text-slate-50">
                            {formatLocalizedAmount(d.amount, i18n.language)}
                            {d.service?.name ? <span className="ml-2 text-xs text-slate-500">• {d.service.name}</span> : null}
                          </div>
                          {d.note ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{d.note}</div> : null}
                          {d.createdBy?.username ? (
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('users.debts.enteredBy', { username: d.createdBy.username })}</div>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDebtToWriteOff(d.id)}
                        >
                          {t('users.debts.writeOff')}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create user */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('users.newUser')}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('auth.firstName')}</Label>
              <Input value={createData.firstName} onChange={(e) => setCreateData((p) => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t('auth.lastName')}</Label>
              <Input value={createData.lastName} onChange={(e) => setCreateData((p) => ({ ...p, lastName: e.target.value }))} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>{t('users.username')}</Label>
              <Input
                value={createData.username}
                onChange={(e) => {
                  const value = e.target.value
                  setIsUsernameManuallyEdited(value.trim().length > 0)
                  setCreateData((p) => ({ ...p, username: value }))
                }}
              />
              {usernameStatus.loading ? <p className="text-xs text-slate-500">{t('users.usernameAvailability.checking')}</p> : null}
              {!usernameStatus.loading && usernameStatus.available === true ? <p className="text-xs text-emerald-600">{t('users.usernameAvailability.available')}</p> : null}
              {!usernameStatus.loading && usernameStatus.available === false ? <p className="text-xs text-rose-600">{t('users.usernameAvailability.unavailable')}</p> : null}
            </div>

            {usernameStatus.suggestions.length > 0 && usernameStatus.available === false ? (
              <div className="md:col-span-2">
                <Alert>
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>{t('users.usernameAvailability.suggestions')}</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {usernameStatus.suggestions.map((item) => (
                        <Button
                          key={item}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsUsernameManuallyEdited(true)
                            setCreateData((p) => ({ ...p, username: item }))
                          }}
                        >
                          {item}
                        </Button>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}

            <div className="space-y-2 md:col-span-2">
              <Label>{t('users.form.role')}</Label>
              <Input value={getRoleLabel('CLIENT')} readOnly />
              <p className="text-xs text-slate-500">
                {t('users.form.roleNote')}
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>{t('users.gender.label')}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-offset-slate-950"
                value={createData.gender}
                onChange={(e) => setCreateData((p) => ({ ...p, gender: e.target.value as any }))}
              >
                <option value="">{t('users.gender.choose')}</option>
                <option value="FEMALE">{t('users.gender.female')}</option>
                <option value="MALE">{t('users.gender.male')}</option>
              </select>
            </div>

          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials */}
      <Dialog
        open={credentialsOpen}
        onOpenChange={(open) => {
          setCredentialsOpen(open)
          if (!open) setCreatedCredentials(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('users.credentials.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-xs text-slate-500">{t('users.credentials.username')}</p>
              <p className="font-semibold text-slate-900 dark:text-slate-50">{createdCredentials?.username}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-xs text-slate-500">{t('users.credentials.initialPassword')}</p>
              <p className="font-semibold text-slate-900 dark:text-slate-50">{createdCredentials?.initialPassword}</p>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t('users.credentials.instructions')}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" onClick={() => setCredentialsOpen(false)}>
              {t('users.credentials.acknowledge')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

function UsersList({
  loading,
  items,
  renderRow,
  renderCard,
}: {
  loading: boolean
  items: UserRow[]
  renderRow: (u: UserRow) => React.ReactNode
  renderCard: (u: UserRow) => React.ReactNode
}) {
  const { t } = useTranslation()
  if (loading) {
    return (
      <div className="flex justify-center p-10 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="p-6 text-sm text-slate-500">{t('common.noData')}</p>
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:hidden">{items.map((u) => renderCard(u))}</div>

      <div className="hidden app-table-wrap lg:block">
        <table className="app-table w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
              <th className="p-3 font-medium w-[56px]">{t('users.table.avatar')}</th>
              <th className="p-3 font-medium">{t('users.username')}</th>
              <th className="p-3 font-medium">{t('users.email')}</th>
              <th className="p-3 font-medium">{t('users.table.fullName')}</th>
              <th className="p-3 font-medium">{t('users.phone')}</th>
              <th className="p-3 font-medium">{t('users.roles')}</th>
              <th className="p-3 font-medium">{t('common.status')}</th>
              <th className="p-3 font-medium text-right">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>{items.map((u) => renderRow(u) as any)}</tbody>
        </table>
      </div>
    </>
  )
}
