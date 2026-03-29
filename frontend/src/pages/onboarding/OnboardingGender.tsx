import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button, HStack, Text, useToast, VStack } from '@chakra-ui/react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import OnboardingShell from '../../components/OnboardingShell'

type Gender = 'MALE' | 'FEMALE'

export default function OnboardingGender() {
  const { user, refreshProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [gender, setGender] = useState<Gender | null>(() =>
    user?.gender === 'MALE' || user?.gender === 'FEMALE' ? user.gender : null,
  )
  const [saving, setSaving] = useState(false)

  const isClient = useMemo(() => (user?.roles ?? []).includes('CLIENT'), [user?.roles])

  useEffect(() => {
    if (gender !== null) return
    if (user?.gender === 'MALE' || user?.gender === 'FEMALE') setGender(user.gender)
  }, [user?.gender, gender])

  if (!user || !isClient) return null
  if (user.genderOnboardingCompleted === true) {
    return <Navigate to="/onboarding/email" replace />
  }

  const handleContinue = async () => {
    if (!gender) {
      toast({ title: 'Odaberite spol.', status: 'warning', isClosable: true })
      return
    }
    setSaving(true)
    try {
      await api.put('/api/users/profile', { gender })
      await refreshProfile()
      navigate('/onboarding/email', { replace: true })
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || 'Spremanje nije uspjelo.',
        status: 'error',
        isClosable: true,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <OnboardingShell
      step={2}
      totalSteps={3}
      heroDecoration="gender"
      title="Vaš spol"
      subtitle="Odaberite spol. Ovaj korak je obavezan i možete ga kasnije promijeniti u profilu."
      tip="Podatak koristimo za personalizaciju i filtriranje usluga."
    >
      <VStack align="stretch" spacing={4}>
        <Text fontWeight="700">Spol</Text>
        <HStack spacing={3}>
          <Button
            flex={1}
            variant={gender === 'MALE' ? 'solid' : 'outline'}
            colorScheme={gender === 'MALE' ? 'brand' : 'gray'}
            onClick={() => setGender('MALE')}
          >
            Muški
          </Button>
          <Button
            flex={1}
            variant={gender === 'FEMALE' ? 'solid' : 'outline'}
            colorScheme={gender === 'FEMALE' ? 'brand' : 'gray'}
            onClick={() => setGender('FEMALE')}
          >
            Ženski
          </Button>
        </HStack>
        <Button colorScheme="brand" onClick={handleContinue} isLoading={saving}>
          Nastavi
        </Button>
      </VStack>
    </OnboardingShell>
  )
}

