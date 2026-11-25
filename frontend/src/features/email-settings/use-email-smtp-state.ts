import { useMemo, useState } from 'react'

import type { ProviderType } from './email-settings-types'

/**
 * Stanje SMTP forme (S9).
 *
 * Izdvojeno iz `use-email-smtp.ts` bez promjene: ista početna vrijednost za
 * svako polje, isti nazivi i isti `isCustomLike` izvod (`custom` i `exchange`
 * nemaju unaprijed zadane kredencijale).
 */
export function useEmailSmtpState() {
  const [saving, setSaving] = useState(false)
  const [provider, setProvider] = useState<ProviderType>('google')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('587')
  const [secure, setSecure] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [hasPasswordConfigured, setHasPasswordConfigured] = useState(false)
  const [clearPasswordRequested, setClearPasswordRequested] = useState(false)
  const [rejectUnauthorized, setRejectUnauthorized] = useState(true)
  const [requireTls, setRequireTls] = useState(false)
  const [ignoreTls, setIgnoreTls] = useState(false)
  const [connectionTimeoutMs, setConnectionTimeoutMs] = useState('10000')
  const [greetingTimeoutMs, setGreetingTimeoutMs] = useState('10000')
  const [socketTimeoutMs, setSocketTimeoutMs] = useState('20000')
  const [pool, setPool] = useState(true)
  const [maxConnections, setMaxConnections] = useState('5')
  const [maxMessages, setMaxMessages] = useState('100')
  const [fromEmail, setFromEmail] = useState('')
  const [fromName, setFromName] = useState('Beauty Salon')
  const [replyTo, setReplyTo] = useState('')
  const [signature, setSignature] = useState('Beauty Salon Nejra')
  const [publicAppUrl, setPublicAppUrl] = useState('')
  const [testEmailTo, setTestEmailTo] = useState('')

  /** `custom` i `exchange` nemaju unaprijed zadane kredencijale. */
  const isCustomLike = useMemo(
    () => provider === 'custom' || provider === 'exchange',
    [provider],
  )

  return {
    saving,
    setSaving,
    provider,
    setProvider,
    host,
    setHost,
    port,
    setPort,
    secure,
    setSecure,
    username,
    setUsername,
    password,
    setPassword,
    hasPasswordConfigured,
    setHasPasswordConfigured,
    clearPasswordRequested,
    setClearPasswordRequested,
    rejectUnauthorized,
    setRejectUnauthorized,
    requireTls,
    setRequireTls,
    ignoreTls,
    setIgnoreTls,
    connectionTimeoutMs,
    setConnectionTimeoutMs,
    greetingTimeoutMs,
    setGreetingTimeoutMs,
    socketTimeoutMs,
    setSocketTimeoutMs,
    pool,
    setPool,
    maxConnections,
    setMaxConnections,
    maxMessages,
    setMaxMessages,
    fromEmail,
    setFromEmail,
    fromName,
    setFromName,
    replyTo,
    setReplyTo,
    signature,
    setSignature,
    publicAppUrl,
    setPublicAppUrl,
    testEmailTo,
    setTestEmailTo,
    isCustomLike,
  }
}
