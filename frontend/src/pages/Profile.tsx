import { FormEvent, useState } from 'react';
import { Box, Button, FormControl, FormLabel, Heading, Input, Text, VStack, useToast } from '@chakra-ui/react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [verifyToken, setVerifyToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put('/api/users/profile', { email, phone });
      await refreshProfile();
      toast({ title: 'Profil je ažuriran.', status: 'success', isClosable: true });
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || 'Ažuriranje nije uspjelo.',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendCode = async () => {
    setSendingCode(true);
    try {
      await api.post('/auth/send-verification-email');
      toast({ title: 'Verifikacijski kod je poslan na email.', status: 'success', isClosable: true });
    } catch (error: any) {
      toast({ title: error?.response?.data?.message || 'Slanje koda nije uspjelo.', status: 'error', isClosable: true });
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await api.post('/auth/verify-email', { token: verifyToken });
      await refreshProfile();
      setVerifyToken('');
      toast({ title: 'Email je verifikovan.', status: 'success', isClosable: true });
    } catch (error: any) {
      toast({ title: error?.response?.data?.message || 'Verifikacija nije uspjela.', status: 'error', isClosable: true });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Box maxW="lg" mx="auto" mt={10} p={8} bg="white" rounded="xl" shadow="sm">
      <Heading size="lg" mb={6}>
        Moj profil
      </Heading>
      <form onSubmit={handleSave}>
        <VStack spacing={4} align="stretch">
          <FormControl isRequired>
            <FormLabel>Email</FormLabel>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Telefon</FormLabel>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormControl>
          <Button type="submit" colorScheme="brand" isLoading={saving}>
            Sačuvaj
          </Button>
        </VStack>
      </form>
      <Box mt={8} pt={6} borderTopWidth="1px">
        <Text fontWeight="600" mb={3}>
          Verifikacija emaila
        </Text>
        <Text mb={3} color={user?.isEmailVerified ? 'green.600' : 'orange.600'}>
          {user?.isEmailVerified ? 'Email je verifikovan.' : 'Email nije verifikovan.'}
        </Text>
        {!user?.isEmailVerified && (
          <VStack align="stretch" spacing={3}>
            <Button variant="outline" onClick={handleSendCode} isLoading={sendingCode}>
              Pošalji verifikacijski kod
            </Button>
            <Input
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              placeholder="Unesite kod iz emaila"
            />
            <Button colorScheme="brand" onClick={handleVerify} isLoading={verifying}>
              Verifikuj email
            </Button>
          </VStack>
        )}
      </Box>
    </Box>
  );
}
