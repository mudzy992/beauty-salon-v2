import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, FormControl, FormLabel, Input, Text, VStack, useToast } from '@chakra-ui/react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import OnboardingShell from '../components/OnboardingShell'
import { getPostAuthRedirectPath } from '../utils/clientOnboarding'

export default function ForceChangePassword() {
  const toast = useToast()
  const { refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (newPassword.length < 6) {
      toast({ title: 'Nova lozinka mora imati najmanje 6 znakova.', status: 'warning', isClosable: true })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Potvrda lozinke nije ispravna.', status: 'warning', isClosable: true })
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
      const updated = await refreshProfile()
      toast({ title: 'Lozinka je uspješno promijenjena.', status: 'success', isClosable: true })
      navigate(getPostAuthRedirectPath(updated), { replace: true })
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || 'Promjena lozinke nije uspjela.',
        status: 'error',
        isClosable: true,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      step={1}
      totalSteps={3}
      heroDecoration="lock"
      title="Promjena inicijalne lozinke"
      subtitle="Za nastavak rada potrebno je da promijenite inicijalnu lozinku."
      tip="Koristite jaku lozinku koju ne dijelite s drugima."
    >
      <Box as="form" onSubmit={handleSubmit}>
        <VStack spacing={4} align="stretch">
          <FormControl isRequired>
            <FormLabel>Trenutna lozinka</FormLabel>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Nova lozinka</FormLabel>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Potvrda nove lozinke</FormLabel>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </FormControl>
          <Button type="submit" colorScheme="brand" w="full" isLoading={loading}>
            Sačuvaj novu lozinku
          </Button>
          <Text fontSize="sm" color="gray.500">
            Nakon ove koraka slijede podešavanje profila.
          </Text>
        </VStack>
      </Box>
    </OnboardingShell>
  )
}
