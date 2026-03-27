import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
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
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const MotionBox = motion(Box as any);

export default function Login() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { login, token, user, isReady } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const fallbackRedirect = useMemo(() => {
    const roles = user?.roles ?? [];
    const isAdmin = roles.includes('SYSTEM_ADMIN') || roles.includes('OWNER');
    return isAdmin ? '/admin' : '/';
  }, [user?.roles]);

  useEffect(() => {
    if (!isReady) return;
    if (!token) return;
    navigate(fallbackRedirect, { replace: true });
  }, [isReady, token, navigate, fallbackRedirect]);

  const resolveFrom = (fromState: unknown): string | null => {
    if (typeof fromState === 'string') {
      return fromState.startsWith('/') ? fromState : null;
    }
    if (fromState && typeof fromState === 'object') {
      const anyObj = fromState as { pathname?: unknown; search?: unknown; hash?: unknown };
      const pathname = typeof anyObj.pathname === 'string' ? anyObj.pathname : '';
      if (!pathname.startsWith('/')) return null;
      const search = typeof anyObj.search === 'string' ? anyObj.search : '';
      const hash = typeof anyObj.hash === 'string' ? anyObj.hash : '';
      return `${pathname}${search}${hash}`;
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let loggedInUser;
    try {
      loggedInUser = await login(username, password);
    } catch {
      toast({
        title: t('auth.loginError'),
        status: 'error',
        isClosable: true,
      });
      setLoading(false);
      return;
    }

    setLoading(false);
    toast({ title: 'Uspješna prijava!', status: 'success', duration: 2000, isClosable: true });
    if (loggedInUser.mustChangePassword) {
      navigate('/force-change-password', { replace: true });
      return;
    }

    const from = (location.state as { from?: string } | null)?.from;
    const resolvedFrom = resolveFrom(from);
    if (resolvedFrom) {
      navigate(resolvedFrom, { replace: true });
      return;
    }
    const isAdmin = loggedInUser.roles.includes('SYSTEM_ADMIN') || loggedInUser.roles.includes('OWNER');
    navigate(isAdmin ? '/admin' : '/', { replace: true });
  };

  return (
    <Flex minH="100vh">
      <Box display={{ base: 'none', lg: 'block' }} flex={1} position="relative" overflow="hidden">
        <Image
          src={getSetting('public_login_image', 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&q=80&w=1200')}
          alt="Beauty Salon"
          objectFit="cover"
          w="full"
          h="full"
          transform="scale(1.05)"
          transition="transform 10s ease-out"
          _hover={{ transform: 'scale(1)' }}
        />
        <Box position="absolute" inset={0} bgGradient="linear(to-t, blackAlpha.800, transparent)" />
        <Box position="absolute" bottom={12} left={12} right={12} color="white">
          <Heading size="2xl" mb={4} fontWeight="light">
            {getSetting('public_login_title', 'Beauty Salon Nejra')}
          </Heading>
          <Text fontSize="xl" color="gray.200" maxW="md">
            {getSetting('public_login_subtitle', 'Vaša kosa zaslužuje samo najbolje. Prijavite se kako biste brzo i jednostavno rezervisali svoj termin kod naših vrhunskih stilista.')}
          </Text>
        </Box>
      </Box>

      <Flex flex={1} align="center" justify="center" bg="gray.50" px={8}>
        <MotionBox
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          w="full"
          maxW="md"
        >
          <Button as={RouterLink} to="/" variant="ghost" mb={8} leftIcon={<ArrowBackIcon />}>
            Nazad na početnu
          </Button>

          <Box bg="whiteAlpha.900" backdropFilter="blur(10px)" p={10} rounded="2xl" shadow="2xl" borderWidth="1px" borderColor="whiteAlpha.400">
            <Heading size="xl" mb={2} color="brand.800">
              {t('auth.login')}
            </Heading>
            <Text color="gray.500" mb={8}>
              Unesite svoje podatke za prijavu
            </Text>

            <form onSubmit={handleSubmit}>
              <VStack spacing={5}>
                <FormControl isRequired>
                  <FormLabel color="gray.700">Korisničko ime ili Email</FormLabel>
                  <Input
                    size="lg"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="vasemail@example.com"
                    autoComplete="username"
                    focusBorderColor="brand.400"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel color="gray.700">{t('auth.password')}</FormLabel>
                  <Input
                    size="lg"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    focusBorderColor="brand.400"
                  />
                </FormControl>
                <Button
                  type="submit"
                  size="lg"
                  colorScheme="brand"
                  w="full"
                  isLoading={loading}
                  mt={2}
                >
                  Prijavi se
                </Button>
              </VStack>
            </form>

            <Text mt={6} textAlign="center" color="gray.600">
              Nemate račun?{' '}
              <Link as={RouterLink} to="/register" color="brand.500" fontWeight="bold">
                {t('public.nav.register')}
              </Link>
            </Text>
          </Box>
        </MotionBox>
      </Flex>
    </Flex>
  );
}
