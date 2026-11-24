import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import { normalizeUsernameFromNames } from './normalize-username'

type BaseParams = {
  loadData: () => void
  showApiError: (error: unknown, fallbackKey: string) => void
  setSaving: Dispatch<SetStateAction<boolean>>
}
import type { UserRow } from './user-types'
import { useUserDebts } from './use-user-debts'

type Params = BaseParams & { getUserRoles: (user: UserRow) => string[] }
export function useUserEditor({ loadData, showApiError, getUserRoles, setSaving }: Params) {
  const { t } = useTranslation()
  const { success, warning } = useAppToast()
  const editTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const { clientDebtsQuery, debtToWriteOff, setDebtToWriteOff, writeOffPending, handleWriteOffClientDebt } = useUserDebts({ editUser, editOpen, showApiError })
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

  return {
    editTriggerRef, editOpen, setEditOpen, editUser, formData, setFormData, initialEmail, initialUsername,
    setEditIsUsernameManuallyEdited, editUsernameStatus, clientDebtsQuery, debtToWriteOff, setDebtToWriteOff,
    writeOffPending, handleWriteOffClientDebt, openEdit, handleSave,
  }
}
