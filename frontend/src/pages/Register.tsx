import { useState, FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  useToast,
  Flex,
  Image,
  Link,
  SimpleGrid,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowBackIcon } from '@chakra-ui/icons';
import api from '../api/client';
import { useSettings } from '../context/SettingsContext';

const MotionBox = motion(Box as any);

export default function Register() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const navigate = useNavigate();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/register', {
        username,
        email,
        password,
        firstName,
        lastName,
        ...(phone.trim() && { phone: phone.trim() }),
      });
      toast({ title: t('public.registerSuccess'), status: 'success', isClosable: true });
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
        ? (err as { response: { data: { message: string } } }).response.data.message
        : t('auth.loginError');
      toast({ title: msg, status: 'error', isClosable: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh">
      <Box display={{ base: 'none', lg: 'block' }} flex={1} position="relative" overflow="hidden">
        <Image
          src={getSetting('public_register_image', 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200')}
          alt="Salon Details"
          objectFit="cover"
          w="full"
          h="full"
          transform="scale(1.05)"
          transition="transform 10s ease-out"
          _hover={{ transform: 'scale(1)' }}
        />
        <Box position="absolute" inset={0} bgGradient="linear(to-t, brand.900, transparent)" opacity={0.9} />
        <Box position="absolute" bottom={12} left={12} right={12} color="white">
          <Heading size="2xl" mb={4} fontWeight="light">
            {getSetting('public_register_title', 'Postanite dio naše priče')}
          </Heading>
          <Text fontSize="xl" color="gray.300" maxW="md">
            {getSetting('public_register_subtitle', 'Kreirajte račun kako biste jednostavno zakazivali termine i pratili svoju historiju frizerskih posjeta.')}
          </Text>
        </Box>
      </Box>

      <Flex flex={{ base: 1, lg: 1.2 }} align="center" justify="center" bg="gray.50" px={8} py={12}>
        <MotionBox
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          w="full"
          maxW="xl"
        >
          <Button as={RouterLink} to="/" variant="ghost" mb={6} leftIcon={<ArrowBackIcon />}>
            Nazad na početnu
          </Button>

          <Box bg="whiteAlpha.900" backdropFilter="blur(10px)" p={10} rounded="2xl" shadow="2xl" borderWidth="1px" borderColor="whiteAlpha.400">
            <Heading size="xl" mb={2} color="brand.800">
              Registracija
            </Heading>
            <Text color="gray.500" mb={8}>
              Pridružite nam se brzo i besplatno
            </Text>

            <form onSubmit={handleSubmit}>
              <VStack spacing={5} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
                  <FormControl isRequired>
                    <FormLabel color="gray.700">Ime</FormLabel>
                    <Input
                      size="lg"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      focusBorderColor="brand.400"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel color="gray.700">Prezime</FormLabel>
                    <Input
                      size="lg"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      focusBorderColor="brand.400"
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl isRequired>
                  <FormLabel color="gray.700">Email</FormLabel>
                  <Input
                    size="lg"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    focusBorderColor="brand.400"
                  />
                </FormControl>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
                  <FormControl isRequired>
                    <FormLabel color="gray.700">{t('auth.username')}</FormLabel>
                    <Input
                      size="lg"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      focusBorderColor="brand.400"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel color="gray.700">Telefon</FormLabel>
                    <Input
                      size="lg"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      focusBorderColor="brand.400"
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl isRequired>
                  <FormLabel color="gray.700">{t('auth.password')}</FormLabel>
                  <Input
                    size="lg"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    focusBorderColor="brand.400"
                  />
                </FormControl>

                <Button
                  type="submit"
                  size="lg"
                  colorScheme="brand"
                  w="full"
                  isLoading={loading}
                  mt={4}
                >
                  Registruj se
                </Button>
              </VStack>
            </form>

            <Text mt={6} textAlign="center" color="gray.600">
              Već imate račun?{' '}
              <Link as={RouterLink} to="/login" color="brand.500" fontWeight="bold">
                Prijavite se
              </Link>
            </Text>
          </Box>
        </MotionBox>
      </Flex>
    </Flex>
  );
}
