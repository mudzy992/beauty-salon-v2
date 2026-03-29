import { FormEvent, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  PinInput,
  PinInputField,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import OnboardingShell from '../../components/OnboardingShell'

export default function OnboardingEmail() {
  const { user, refreshProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState(user?.email ?? '')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(() => !!user?.email?.trim() && !user?.isEmailVerified)
  const [loading, setLoading] = useState(false)

  const isClient = useMemo(() => (user?.roles ?? []).includes('CLIENT'), [user?.roles])

  if (!user || !isClient) return null
  if (user.genderOnboardingCompleted !== true) {
    return <Navigate to="/onboarding/gender" replace />
  }
  if (user.isEmailVerified && user.email) {
    return <Navigate to="/" replace />
  }

  const handleSaveAndSend = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      toast({ title: 'Email je obavezan.', status: 'warning', isClosable: true })
      return
    }
    setLoading(true)
    try {
      await api.put('/api/users/profile', { email: trimmed })
      await refreshProfile()
      await api.post('/auth/send-verification-email')
      setCodeSent(true)
      toast({ title: 'Poslali smo kod na email.', status: 'success', isClosable: true })
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || 'Slanje koda nije uspjelo.',
        status: 'error',
        isClosable: true,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    const trimmed = code.trim()
    if (trimmed.length !== 6) {
      toast({ title: 'Unesite 6-znamenkasti kod.', status: 'warning', isClosable: true })
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/verify-email', { token: trimmed })
      await refreshProfile()
      navigate('/', { replace: true })
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || 'Verifikacija nije uspjela.',
        status: 'error',
        isClosable: true,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setLoading(true)
    try {
      await api.post('/auth/send-verification-email')
      toast({ title: 'Kod je ponovo poslan.', status: 'success', isClosable: true })
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || 'Slanje koda nije uspjelo.',
        status: 'error',
        isClosable: true,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      step={3}
      totalSteps={3}
      heroDecoration="mail"
      title="Email adresa"
      subtitle="Unesite email na koji šaljemo potvrde i obavještenja, zatim unesite kod iz poruke."
      tip="Provjerite i spam/junk folder ako kod ne stigne odmah."
    >
      <VStack align="stretch" spacing={4}>
        {!codeSent ? (
          <form onSubmit={handleSaveAndSend}>
            <VStack align="stretch" spacing={4}>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                />
              </FormControl>
              <Button type="submit" colorScheme="brand" isLoading={loading}>
                Sačuvaj email i pošalji kod
              </Button>
            </VStack>
          </form>
        ) : (
          <VStack align="stretch" spacing={4}>
            <Text fontWeight="700">Verifikacijski kod</Text>
            <HStack justify="center">
              <PinInput otp value={code} onChange={setCode}>
                <PinInputField />
                <PinInputField />
                <PinInputField />
                <PinInputField />
                <PinInputField />
                <PinInputField />
              </PinInput>
            </HStack>
            <Button colorScheme="brand" onClick={handleVerify} isLoading={loading}>
              Potvrdi email
            </Button>
            <Button variant="outline" onClick={handleResend} isLoading={loading}>
              Pošalji kod ponovo
            </Button>
          </VStack>
        )}
      </VStack>
    </OnboardingShell>
  )
}

