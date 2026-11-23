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

export function useUserCreation({ loadData, showApiError, setSaving }: BaseParams) {
  const { t } = useTranslation()
  const { success, error, warning } = useAppToast()
  const createTriggerRef = useRef<HTMLButtonElement | null>(null)
  const transitioningToCredentials = useRef(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [credentialsOpen, setCredentialsOpen] = useState(false)
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

  return {
    createTriggerRef, transitioningToCredentials, createOpen, setCreateOpen, credentialsOpen, setCredentialsOpen,
    createData, setCreateData, setIsUsernameManuallyEdited, usernameStatus, createdCredentials, setCreatedCredentials, handleCreate,
  }
}
