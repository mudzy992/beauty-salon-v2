import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Text,
  VStack,
  useToast,
  List,
  ListItem,
} from '@chakra-ui/react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getUploadUrl } from '../utils/uploadUrl';

interface ProfileData {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  roles: string[];
}

export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{
    loading: boolean;
    available: boolean | null;
    suggestions: string[];
  }>({ loading: false, available: null, suggestions: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [initialEmail, setInitialEmail] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ProfileData>('/api/users/profile');
      setProfile(data);
      setUsername(data.username ?? '');
      setFirstName(data.firstName ?? '');
      setLastName(data.lastName ?? '');
      setEmail(data.email ?? '');
      setInitialEmail(data.email ?? '');
      setPhone(data.phone ?? '');
      setAvatar(data.avatar ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!username.trim()) {
      setUsernameStatus({ loading: false, available: null, suggestions: [] });
      return;
    }
    const timeout = setTimeout(async () => {
      setUsernameStatus((prev) => ({ ...prev, loading: true }));
      try {
        const { data } = await api.get('/api/users/profile/username-availability', {
          params: { username },
        });
        setUsernameStatus({
          loading: false,
          available: !!data.available,
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        });
      } catch {
        setUsernameStatus({ loading: false, available: null, suggestions: [] });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [username]);

  const handleUploadAvatar = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('entity', 'avatars');
      const { data } = await api.post<{ pathThumb?: string; pathSmall?: string; pathOriginal: string }>('/api/uploads', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatar(data.pathThumb || data.pathSmall || data.pathOriginal);
      toast({ title: 'Avatar uploadovan.', status: 'success', isClosable: true });
    } catch {
      toast({ title: 'Upload avatara nije uspio.', status: 'error', isClosable: true });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.sub) return;
    if (!username.trim()) {
      toast({ title: 'Korisničko ime je obavezno.', status: 'warning', isClosable: true });
      return;
    }
    if (usernameStatus.available === false) {
      toast({ title: 'Korisničko ime nije dostupno.', status: 'warning', isClosable: true });
      return;
    }
    setSaving(true);
    try {
      const hasEmailChanged = email.trim() !== initialEmail;
      await api.patch(`/api/users/${user.sub}`, {
        username,
        firstName,
        lastName,
        email,
        phone,
        avatar,
      });
      await refreshProfile();
      await loadProfile();
      if (hasEmailChanged) {
        try {
          await api.post('/auth/send-verification-email');
          toast({
            title: 'Profil je ažuriran. Poslali smo verifikacijski kod na novi email.',
            status: 'success',
            isClosable: true,
          });
        } catch {
          toast({
            title: 'Profil je ažuriran. Pošaljite verifikacijski kod za novi email.',
            status: 'warning',
            isClosable: true,
          });
        }
      } else {
        toast({ title: 'Profil je ažuriran.', status: 'success', isClosable: true });
      }
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
    <Box maxW="4xl" mx="auto" mt={8}>
      <Heading size="lg" mb={6}>Moj profil</Heading>
      {loading ? (
        <Text>Učitavanje...</Text>
      ) : (
        <VStack align="stretch" spacing={5}>
          <Card>
            <CardBody>
              <Flex direction={{ base: 'column', md: 'row' }} gap={4} justify="space-between">
                <HStack align="start" spacing={4}>
                  <Avatar
                    size="xl"
                    src={avatar ? getUploadUrl(avatar) : undefined}
                    name={[firstName, lastName].filter(Boolean).join(' ') || username}
                    bg="brand.100"
                  />
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="700">{[firstName, lastName].filter(Boolean).join(' ') || username}</Text>
                    <Text color="gray.600">@{username}</Text>
                    <HStack spacing={2}>
                      {(profile?.roles ?? []).map((role) => (
                        <Badge key={role} colorScheme={role === 'SYSTEM_ADMIN' ? 'red' : role === 'STYLIST' ? 'blue' : 'green'}>
                          {role}
                        </Badge>
                      ))}
                    </HStack>
                  </VStack>
                </HStack>
                <VStack align={{ base: 'stretch', md: 'end' }} spacing={2}>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files?.[0] && handleUploadAvatar(e.target.files[0])}
                  />
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} isLoading={uploadingAvatar}>
                    {avatar ? 'Promijeni avatar' : 'Dodaj avatar'}
                  </Button>
                  <Text fontSize="xs" color="gray.500">
                    Kreiran: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('bs-BA') : '-'}
                  </Text>
                </VStack>
              </Flex>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <form onSubmit={handleSave}>
                <VStack spacing={4} align="stretch">
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Korisničko ime</FormLabel>
                      <Input value={username} onChange={(e) => setUsername(e.target.value)} />
                      {usernameStatus.loading && (
                        <Text fontSize="xs" color="gray.500" mt={1}>Provjera korisničkog imena...</Text>
                      )}
                      {!usernameStatus.loading && usernameStatus.available === true && (
                        <Text fontSize="xs" color="green.600" mt={1}>Korisničko ime je dostupno.</Text>
                      )}
                      {!usernameStatus.loading && usernameStatus.available === false && (
                        <Text fontSize="xs" color="red.600" mt={1}>Korisničko ime nije dostupno.</Text>
                      )}
                      {usernameStatus.suggestions.length > 0 && usernameStatus.available === false && (
                        <List mt={2} spacing={1}>
                          {usernameStatus.suggestions.map((item) => (
                            <ListItem key={item}>
                              <Button size="xs" variant="outline" onClick={() => setUsername(item)}>
                                {item}
                              </Button>
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </FormControl>
                    <FormControl>
                      <FormLabel>Telefon</FormLabel>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </FormControl>
                  </SimpleGrid>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <FormControl>
                      <FormLabel>Ime</FormLabel>
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Prezime</FormLabel>
                      <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </FormControl>
                  </SimpleGrid>
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </FormControl>
                  <Button
                    type="submit"
                    colorScheme="brand"
                    isLoading={saving}
                    isDisabled={usernameStatus.available === false}
                    alignSelf="start"
                  >
                    Sačuvaj izmjene
                  </Button>
                </VStack>
              </form>
            </CardBody>
          </Card>

          <Alert
            status={profile?.isEmailVerified ? 'success' : 'warning'}
            variant="subtle"
            rounded="lg"
            alignItems="start"
          >
            <AlertIcon mt={1} />
            <Box>
              <AlertTitle>Email verifikacija</AlertTitle>
              <AlertDescription>
                {profile?.isEmailVerified
                  ? 'Email je verifikovan.'
                  : 'Email nije verifikovan. Pošaljite kod i potvrdite email radi pune funkcionalnosti naloga.'}
              </AlertDescription>
            </Box>
          </Alert>

          {!profile?.isEmailVerified && (
            <Card>
              <CardBody>
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
              </CardBody>
            </Card>
          )}
        </VStack>
      )}
    </Box>
  );
}
