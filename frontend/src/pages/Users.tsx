import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { getErrorMessage } from '../api/error'
import { useAppToast } from '../lib/toast/useAppToast'
import { getUploadUrl } from '../utils/uploadUrl'

import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
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
  const { t } = useTranslation()
  const { success, error, warning } = useAppToast()
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
    avatar: '' as string | null,
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
    avatar: '' as string,
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

  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarEditRef = useRef<HTMLInputElement>(null)
  const avatarCreateRef = useRef<HTMLInputElement>(null)

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
      api.get<PaginatedResponse<UserRow>>('/api/users/clients', {
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

  const handleSettleClientDebt = async (debtId: string) => {
    if (!editUser) return
    try {
      await api.patch(`/api/client-debts/${debtId}/settle`, {})
      success('Dug je označen kao vraćen')
      const { data } = await api.get('/api/client-debts', { params: { clientId: editUser.id } })
      setClientDebts(Array.isArray(data) ? data : [])
    } catch (err) {
      error(getErrorMessage(err))
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
      avatar: u.avatar ?? null,
    })
    setInitialEmail(u.email ?? '')
    setInitialUsername(u.username ?? '')
    setEditIsUsernameManuallyEdited(!!u.username && baseUsername.trim().length > 0 && u.username.trim() !== baseUsername)
    setEditUsernameStatus({ loading: false, available: null, suggestions: [] })
    setEditOpen(true)
  }

  const handleUploadAvatar = async (file: File, target: 'edit' | 'create') => {
    if (!file.type.startsWith('image/')) return
    setUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('entity', 'avatars')
      const { data } = await api.post<{ pathThumb?: string; pathSmall?: string; pathOriginal: string }>(
        '/api/uploads',
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      const path = data.pathThumb || data.pathSmall || data.pathOriginal
      if (target === 'edit') setFormData((prev) => ({ ...prev, avatar: path }))
      else setCreateData((prev) => ({ ...prev, avatar: path }))
      success('Avatar uploadovan')
    } catch (err) {
      error(getErrorMessage(err))
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    if (!editUser) return
    const isClient = getUserRoles(editUser).includes('CLIENT')
    const trimmedFirst = formData.firstName.trim()
    const trimmedLast = formData.lastName.trim()
    const trimmedUsername = formData.username.trim()
    if (!trimmedFirst || !trimmedLast) {
      warning('Ime i prezime su obavezni.')
      return
    }
    if (!trimmedUsername) {
      warning('Korisničko ime je obavezno.')
      return
    }
    if (isClient && !formData.gender) {
      warning('Spol je obavezan za klijente.')
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
        avatar: formData.avatar || null,
      })
      success('Korisnik ažuriran')
      loadData()
      setEditOpen(false)
    } catch (err) {
      error(getErrorMessage(err, 'Greška pri ažuriranju'))
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
      warning('Popunite sva obavezna polja')
      return
    }
    if (!createData.gender) {
      warning('Spol je obavezan.')
      return
    }
    setSaving(true)
    try {
      const response = await api.post('/api/users', {
        ...createData,
        role: 'CLIENT',
        gender: createData.gender || undefined,
        ...(createData.avatar && { avatar: createData.avatar }),
      })
      success('Korisnik kreiran')
      setCreatedCredentials({
        username: response.data?.username || createData.username,
        initialPassword: response.data?.initialPassword || 'Init2026!',
      })
      loadData()
      setCreateOpen(false)
      setCredentialsOpen(true)
      setCreateData({ username: '', firstName: '', lastName: '', role: 'CLIENT', avatar: '', gender: '' })
      setIsUsernameManuallyEdited(false)
      setUsernameStatus({ loading: false, available: null, suggestions: [] })
    } catch (err) {
      error(getErrorMessage(err, 'Greška pri kreiranju'))
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
    if (!window.confirm(`Deaktivirati korisnika "${username}"?`)) return
    try {
      await api.patch(`/api/users/${id}`, { isActive: false })
      success('Korisnik deaktiviran')
      loadData()
    } catch (err) {
      error(getErrorMessage(err))
    }
  }

  const handleAssignRole = async (userId: string, roleName: string) => {
    try {
      await api.post(`/api/users/${userId}/roles`, { role: roleName })
      if (roleName === 'STYLIST') {
        success('Stilist kreiran (pending)', 'Završite profil u Stylists.')
      } else {
        success(`Uloga ${roleName} dodijeljena`)
      }
      loadData()
    } catch (err) {
      error(getErrorMessage(err, 'Greška pri dodjeli uloge'))
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
      { key: 'dailyLogs', label: 'Daily logovi', count: c.dailyLogEntriesCount },
      { key: 'confirmedReservations', label: 'Potvrđene rezervacije', count: c.confirmedReservationsCount },
      { key: 'reservationResponses', label: 'Odgovori/lockovi rezervacija', count: c.reservationResponsesCount },
      { key: 'reviews', label: 'Reviews', count: c.reviewsCount },
    ] as const
    return rows
      .filter((r) => (r.count ?? 0) > 0)
      .map((r) => {
        const mode = removalModes[r.key]
        const target = (removalTargets as any)[r.key] as string | undefined
        return { key: r.key, label: r.label, count: r.count, mode, target }
      })
  }, [removalPreview, removalModes, removalTargets])

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
        success('STYLIST rola uklonjena')
        setRemoveStylistOpen(false)
        loadData()
        setRemovalSubmitting(false)
        return
      }

      const stylistsRes = await api.get<StylistOption[] | { items: StylistOption[] }>('/api/stylists', {
        params: { page: 0, pageSize: 300 },
      })
      const items = Array.isArray((stylistsRes.data as any)?.items)
        ? (stylistsRes.data as any).items
        : Array.isArray(stylistsRes.data)
          ? stylistsRes.data
          : []
      setAllStylists(items)
    } catch (err) {
      error(getErrorMessage(err, 'Greška pri pripremi uklanjanja stiliste'))
      setRemovalSubmitting(false)
      setRemoveStylistOpen(false)
    }
  }

  const handleRemoveRole = async (userId: string, roleName: string) => {
    if (roleName === 'STYLIST') {
      await openRemoveStylist(userId)
      return
    }
    if (!window.confirm(`Ukloniti ulogu ${roleName}?`)) return
    try {
      await api.delete(`/api/users/${userId}/roles/${roleName}`)
      success(`Uloga ${roleName} uklonjena`)
      loadData()
    } catch (err) {
      error(getErrorMessage(err, 'Greška pri uklanjanju uloge'))
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
      warning('Odaberite target stilistu za sve TRANSFER opcije.')
      return
    }

    setRemovalSubmitting(true)
    try {
      await api.post(`/api/users/${removeStylistUser.id}/remove-stylist-role`, payload)
      success('STYLIST rola uklonjena')
      setRemoveStylistOpen(false)
      loadData()
    } catch (err) {
      error(getErrorMessage(err, 'Greška pri uklanjanju stiliste'))
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
                {roleName}
              </Badge>
              {isStylist ? <span className="text-slate-500">(Stylists)</span> : null}
              {isPending ? (
                <button
                  type="button"
                  className="text-[10px] font-medium text-amber-700 underline underline-offset-2 dark:text-amber-300"
                  onClick={() => navigate('/admin/stylists')}
                >
                  profil nije završen
                </button>
              ) : null}
              {canRemoveRole(roleName) ? (
                <button
                  type="button"
                  className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label={`Ukloni ulogu ${roleName}`}
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
              <Button type="button" size="icon" variant="outline" className="h-8 w-8" aria-label="Dodaj ulogu">
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {addable.map((r) => (
                <DropdownMenuItem key={r} onClick={() => void handleAssignRole(u.id, r)}>
                  {r}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/admin/stylists')}>Otvori Stylists</DropdownMenuItem>
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
              {u.isEmailVerified ? 'Verifikovan' : 'Nije verifikovan'}
            </Badge>
          ) : null}
        </div>
      </td>
      <td className="p-3">{[u.firstName, u.lastName].filter(Boolean).join(' ') || '-'}</td>
      <td className="p-3">{u.phone ?? '-'}</td>
      <td className="p-3">{renderRoles(u)}</td>
      <td className="p-3">
        <Badge variant={u.isActive ? 'success' : 'danger'} className="text-[10px]">
          {u.isActive ? 'Aktivan' : 'Neaktivan'}
        </Badge>
      </td>
      <td className="p-3 text-right">
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Analitika"
            onClick={() => navigate(`/admin/client-analytics?userId=${u.id}`)}
          >
            <Eye className="h-4 w-4 text-teal-600" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label="Uredi"
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
              aria-label="Deaktiviraj"
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
          {u.isActive ? 'Aktivan' : 'Neaktivan'}
        </Badge>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Email</span>
          <span className="truncate text-slate-900 dark:text-slate-50">{u.email ?? '-'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Telefon</span>
          <span className="truncate text-slate-900 dark:text-slate-50">{u.phone ?? '-'}</span>
        </div>
        <div className="space-y-2">
          <p className="text-slate-500">Uloge</p>
          {renderRoles(u)}
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => navigate(`/admin/client-analytics?userId=${u.id}`)}>
          Analitika
        </Button>
        <Button type="button" size="sm" onClick={() => openEdit(u)}>
          Uredi
        </Button>
      </div>
    </Card>
  )

  const headerTitle = activeTab === 'admins' ? 'ADMINISTRATORI' : activeTab === 'stylists' ? 'STILISTI' : 'KLIJENTI'

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('nav.users')}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Upravljanje korisnicima, ulogama i statusom.</p>
        </div>

        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Novi korisnik
        </Button>
      </div>

      <Card>
        <div className="p-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList className="h-auto flex-wrap justify-start gap-1 p-2">
                <TabsTrigger value="admins">Administratori ({admins.length})</TabsTrigger>
                <TabsTrigger value="stylists">Stilisti ({stylists.length})</TabsTrigger>
                <TabsTrigger value="clients">Klijenti ({total})</TabsTrigger>
              </TabsList>

              {activeTab === 'clients' ? (
                <div className="relative w-full max-w-[360px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <Input
                    className="pl-9"
                    placeholder="Pretraži klijente..."
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
        <p className="text-sm text-slate-500">Klijenti ukupno: {total}</p>

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Prethodna
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
            Sljedeća
          </Button>
        </div>
      </div>

      {/* Remove STYLIST role */}
      <Dialog open={removeStylistOpen} onOpenChange={setRemoveStylistOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Ukloni STYLIST rolu</DialogTitle>
          </DialogHeader>

          {!removalPreview ? (
            <div className="flex justify-center py-10 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Stilist: <span className="font-semibold text-slate-900 dark:text-slate-50">{removeStylistUser?.username}</span>
              </p>

              {([
                { key: 'dailyLogs', label: 'Daily logovi', count: removalPreview.counts.dailyLogEntriesCount },
                { key: 'confirmedReservations', label: 'Potvrđene rezervacije', count: removalPreview.counts.confirmedReservationsCount },
                { key: 'reservationResponses', label: 'Odgovori/lockovi rezervacija', count: removalPreview.counts.reservationResponsesCount },
                { key: 'reviews', label: 'Reviews', count: removalPreview.counts.reviewsCount },
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
                        <span>Prebaci</span>
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name={`${row.key}-mode`}
                          value="DELETE"
                          checked={mode === 'DELETE'}
                          onChange={() => setRemovalModes((prev) => ({ ...prev, [row.key]: 'DELETE' }))}
                        />
                        <span>Obriši</span>
                      </label>
                    </div>

                    {mode === 'TRANSFER' ? (
                      <div className="mt-3 space-y-2">
                        <Label>Target stilist</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-offset-slate-950"
                          value={(removalTargets as any)[row.key] ?? ''}
                          onChange={(e) => setRemovalTargets((prev) => ({ ...prev, [row.key]: e.target.value }))}
                        >
                          <option value="">Odaberite stilistu</option>
                          {opts.map((o) => (
                            <option key={o.id} value={o.id} disabled={o.isPending}>
                              {o.label}
                              {o.isPending ? ' (PENDING - profil nije završen)' : ''}
                            </option>
                          ))}
                        </select>
                        {opts.some((o) => o.isPending) ? (
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            Nije moguće prebacivanje na stilistu sa PENDING statusom. Prvo završite profil na stranici Stylists.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Ova akcija će trajno obrisati podatke iz ove kategorije.</p>
                    )}
                  </div>
                )
              })}

              {removalSummary.length > 0 ? (
                <div className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
                  <p className="mb-2 font-medium text-slate-900 dark:text-slate-50">Sažetak</p>
                  <div className="space-y-1 text-sm">
                    {removalSummary.map((r) => (
                      <div key={r.label} className="flex items-center justify-between gap-3">
                        <span className="text-slate-700 dark:text-slate-200">
                          {r.label} ({r.count})
                        </span>
                        <span className={r.mode === 'DELETE' ? 'font-medium text-rose-700 dark:text-rose-300' : 'font-medium text-blue-700 dark:text-blue-300'}>
                          {r.mode === 'DELETE' ? 'BRISANJE' : 'PREBACIVANJE'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <Alert>
                <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Napomena</AlertTitle>
                <AlertDescription>
                  Nakon izvršenja, profil stiliste i njegove postavke (servisi, radno vrijeme) se brišu.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setRemoveStylistOpen(false)}>
              Otkaži
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-950/20"
              onClick={() => void handleConfirmRemoveStylist()}
              disabled={!removalPreview || !isRemovalReady || removalSubmitting}
            >
              {removalSubmitting ? 'Uklanjanje...' : 'Ukloni STYLIST'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Uredi korisnika: {editUser?.username}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Korisničko ime</Label>
              <Input
                value={formData.username}
                onChange={(e) => {
                  setEditIsUsernameManuallyEdited(true)
                  setFormData((p) => ({ ...p, username: e.target.value }))
                }}
              />
              {editUsernameStatus.loading ? <p className="text-xs text-slate-500">Provjera dostupnosti...</p> : null}
              {!editUsernameStatus.loading && editUsernameStatus.available === true && formData.username.trim() === initialUsername.trim() ? (
                <p className="text-xs text-blue-600">Trenutno korisničko ime</p>
              ) : null}
              {!editUsernameStatus.loading && editUsernameStatus.available === true && formData.username.trim() !== initialUsername.trim() ? (
                <p className="text-xs text-emerald-600">Korisničko ime je dostupno.</p>
              ) : null}
              {!editUsernameStatus.loading && editUsernameStatus.available === false ? (
                <p className="text-xs text-rose-600">Korisničko ime nije dostupno.</p>
              ) : null}

              {editUsernameStatus.suggestions.length > 0 && editUsernameStatus.available === false ? (
                <Alert className="mt-2">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>Prijedlozi</AlertTitle>
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
                <Label className="mb-0">Email</Label>
                {formData.email.trim().length > 0 ? (
                  <Badge
                    variant={formData.email.trim() === initialEmail.trim() && !!editUser?.isEmailVerified ? 'success' : 'warning'}
                    className="text-[10px]"
                  >
                    {formData.email.trim() === initialEmail.trim() && !!editUser?.isEmailVerified ? 'Verifikovan' : 'Nije verifikovan'}
                  </Badge>
                ) : null}
              </div>
              <Input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Ime</Label>
              <Input value={formData.firstName} onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Prezime</Label>
              <Input value={formData.lastName} onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>
                Spol
                {editUser && getUserRoles(editUser).includes('CLIENT') ? <span className="ml-1 text-rose-600">*</span> : null}
              </Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-offset-slate-950"
                value={formData.gender}
                onChange={(e) => setFormData((p) => ({ ...p, gender: e.target.value as any }))}
              >
                <option value="">Odaberite spol</option>
                <option value="FEMALE">Žensko</option>
                <option value="MALE">Muško</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Avatar</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={formData.avatar ? getUploadUrl(formData.avatar) : undefined} alt="Avatar" />
                  <AvatarFallback>{initials(formData.firstName, formData.lastName, formData.username)}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={avatarEditRef}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleUploadAvatar(file, 'edit')
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => avatarEditRef.current?.click()} disabled={uploadingAvatar}>
                    {uploadingAvatar ? 'Upload...' : `${formData.avatar ? 'Promijeni' : 'Dodaj'} avatar`}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800 md:col-span-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Aktivan</p>
                <p className="text-xs text-slate-500">Neaktivni korisnici se ne mogu prijaviti.</p>
              </div>
              <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData((p) => ({ ...p, isActive: checked }))} />
            </div>

            {editUser && getUserRoles(editUser).includes('CLIENT') ? (
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <Label className="mb-0">Dugovanja</Label>
                  {clientDebtsLoading ? <span className="text-xs text-slate-500">Učitavanje...</span> : null}
                </div>

                {clientDebts.length === 0 ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                    Nema otvorenih dugovanja.
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
                            {Number(d.amount).toFixed(2)} KM
                            {d.service?.name ? <span className="ml-2 text-xs text-slate-500">• {d.service.name}</span> : null}
                          </div>
                          {d.note ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{d.note}</div> : null}
                          {d.createdBy?.username ? (
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Zaveo: {d.createdBy.username}</div>
                          ) : null}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => void handleSettleClientDebt(d.id)}>
                          Označi vraćen
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
              {saving ? 'Spremanje...' : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create user */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novi korisnik</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Ime</Label>
              <Input value={createData.firstName} onChange={(e) => setCreateData((p) => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Prezime</Label>
              <Input value={createData.lastName} onChange={(e) => setCreateData((p) => ({ ...p, lastName: e.target.value }))} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Korisničko ime</Label>
              <Input
                value={createData.username}
                onChange={(e) => {
                  const value = e.target.value
                  setIsUsernameManuallyEdited(value.trim().length > 0)
                  setCreateData((p) => ({ ...p, username: value }))
                }}
              />
              {usernameStatus.loading ? <p className="text-xs text-slate-500">Provjera dostupnosti...</p> : null}
              {!usernameStatus.loading && usernameStatus.available === true ? <p className="text-xs text-emerald-600">Korisničko ime je dostupno.</p> : null}
              {!usernameStatus.loading && usernameStatus.available === false ? <p className="text-xs text-rose-600">Korisničko ime nije dostupno.</p> : null}
            </div>

            {usernameStatus.suggestions.length > 0 && usernameStatus.available === false ? (
              <div className="md:col-span-2">
                <Alert>
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>Prijedlozi</AlertTitle>
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
              <Label>Uloga</Label>
              <Input value="CLIENT" readOnly />
              <p className="text-xs text-slate-500">
                Svi korisnici su klijenti. Dodatne role dodajte naknadno kroz listu korisnika.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Spol</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-offset-slate-950"
                value={createData.gender}
                onChange={(e) => setCreateData((p) => ({ ...p, gender: e.target.value as any }))}
              >
                <option value="">Odaberite spol</option>
                <option value="FEMALE">Žensko</option>
                <option value="MALE">Muško</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Avatar (opciono)</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={createData.avatar ? getUploadUrl(createData.avatar) : undefined} alt="Avatar" />
                  <AvatarFallback>{initials(createData.firstName, createData.lastName, createData.username)}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={avatarCreateRef}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleUploadAvatar(file, 'create')
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => avatarCreateRef.current?.click()} disabled={uploadingAvatar}>
                    {uploadingAvatar ? 'Upload...' : createData.avatar ? 'Promijeni avatar' : 'Dodaj avatar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={saving}>
              {saving ? 'Spremanje...' : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials */}
      <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kredencijali korisnika (prikaz jednom)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-xs text-slate-500">Korisničko ime</p>
              <p className="font-semibold text-slate-900 dark:text-slate-50">{createdCredentials?.username}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-xs text-slate-500">Inicijalna lozinka</p>
              <p className="font-semibold text-slate-900 dark:text-slate-50">{createdCredentials?.initialPassword}</p>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Sačuvajte ove podatke i proslijedite korisniku. Nakon prve prijave korisnik mora promijeniti lozinku.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" onClick={() => setCredentialsOpen(false)}>
              U redu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  if (loading) {
    return (
      <div className="flex justify-center p-10 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="p-6 text-sm text-slate-500">{'Nema podataka.'}</p>
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:hidden">{items.map((u) => renderCard(u))}</div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
              <th className="p-3 font-medium w-[56px]">Avatar</th>
              <th className="p-3 font-medium">Korisničko ime</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Ime i prezime</th>
              <th className="p-3 font-medium">Telefon</th>
              <th className="p-3 font-medium">Uloge</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Akcije</th>
            </tr>
          </thead>
          <tbody>{items.map((u) => renderRow(u) as any)}</tbody>
        </table>
      </div>
    </>
  )
}
