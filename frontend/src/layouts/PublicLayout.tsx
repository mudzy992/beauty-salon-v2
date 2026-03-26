import { Outlet, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Flex,
  Heading,
  Container,
  Link,
  Button,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  VStack,
  IconButton,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const publicNav = [
  { path: '/', labelKey: 'public.nav.home' },
  { path: '/usluge', labelKey: 'public.nav.services' },
  { path: '/blog', labelKey: 'public.nav.blog' },
  { path: '/galerija', labelKey: 'public.nav.gallery' },
  { path: '/kontakt', labelKey: 'public.nav.contact' },
];

export default function PublicLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { getSetting } = useSettings();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };
  const isProfileIncomplete =
    !!user && (!user.email || !user.phone || !user.isEmailVerified);

  const NavLinks = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      {publicNav.map((item) => (
        <Link
          key={item.path}
          as={RouterLink}
          to={item.path}
          onClick={onItemClick}
          px={3}
          py={2}
          fontWeight={isActive(item.path) ? 600 : 400}
          color={isActive(item.path) ? 'brand.600' : 'gray.700'}
          _hover={{ color: 'brand.500' }}
        >
          {t(item.labelKey)}
        </Link>
      ))}
    </>
  );

  return (
    <Box minH="100vh" display="flex" flexDirection="column" bg="gray.50">
      <Box as="header" bg="white" borderBottom="1px" borderColor="gray.200" py={3}>
        <Container maxW="container.xl">
          <Flex align="center" justify="space-between" gap={4}>
            <Link as={RouterLink} to="/" _hover={{ textDecoration: 'none' }}>
              <Heading size="md" color="brand.700">
                {getSetting('app_title', t('app.title'))}
              </Heading>
            </Link>
            <Flex align="center" gap={2} display={{ base: 'none', md: 'flex' }}>
              <NavLinks />
              {user ? (
                <>
                  <Button as={RouterLink} to="/rezervacija" size="sm" colorScheme="brand" variant="solid">
                    {t('public.nav.reserve')}
                  </Button>
                  <Button as={RouterLink} to="/profil" size="sm" variant="ghost">
                    Profil
                  </Button>
                  {(['SYSTEM_ADMIN', 'OWNER'] as string[]).some((r) => user.roles.includes(r)) && (
                    <Button as={RouterLink} to="/admin" size="sm" variant="outline">
                      {t('app.admin')}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={logout}>
                    {t('auth.logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Button as={RouterLink} to="/login" size="sm" variant="ghost">
                    {t('auth.login')}
                  </Button>
                  <Button as={RouterLink} to="/register" size="sm" colorScheme="brand">
                    {t('public.nav.register')}
                  </Button>
                </>
              )}
            </Flex>
            <IconButton
              aria-label="Meni"
              icon={<HamburgerIcon />}
              display={{ md: 'none' }}
              onClick={onOpen}
              variant="ghost"
            />
          </Flex>
        </Container>
      </Box>

      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader>{t('app.title')}</DrawerHeader>
          <DrawerBody>
            <VStack align="stretch" spacing={2}>
              <NavLinks onItemClick={onClose} />
              {user ? (
                <>
                  <Button as={RouterLink} to="/rezervacija" onClick={onClose} colorScheme="brand" w="full">
                    {t('public.nav.reserve')}
                  </Button>
                  <Button as={RouterLink} to="/profil" onClick={onClose} variant="ghost" w="full">
                    Profil
                  </Button>
                  {(['SYSTEM_ADMIN', 'OWNER'] as string[]).some((r) => user.roles.includes(r)) && (
                    <Button as={RouterLink} to="/admin" onClick={onClose} variant="outline" w="full">
                      {t('app.admin')}
                    </Button>
                  )}
                  <Button onClick={() => { logout(); onClose(); }} variant="ghost" w="full">
                    {t('auth.logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Button as={RouterLink} to="/login" onClick={onClose} variant="ghost" w="full">
                    {t('auth.login')}
                  </Button>
                  <Button as={RouterLink} to="/register" onClick={onClose} colorScheme="brand" w="full">
                    {t('public.nav.register')}
                  </Button>
                </>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Box flex={1}>
        {isProfileIncomplete && (
          <Container maxW="container.xl" pt={4}>
            <Alert status="warning" rounded="md">
              <AlertIcon />
              Potrebno je da unesete email i telefon, te verifikujete email prije rezervacije.
              <Button as={RouterLink} to="/profil" size="sm" ml={3} colorScheme="orange">
                Uredi profil
              </Button>
            </Alert>
          </Container>
        )}
        <Outlet />
      </Box>

      <Box as="footer" bg="gray.800" color="white" py={8} mt="auto">
        <Container maxW="container.xl">
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align={{ base: 'center', md: 'start' }}
            gap={6}
            mb={6}
          >
            <Box textAlign={{ base: 'center', md: 'left' }}>
              <Heading size="sm" mb={2}>{getSetting('app_title', t('app.title'))}</Heading>
              {getSetting('public_footer_text', '') && (
                <Box fontSize="sm" opacity={0.8} maxW="400px">
                  {getSetting('public_footer_text', '')}
                </Box>
              )}
            </Box>
            <VStack spacing={1} align={{ base: 'center', md: 'start' }} fontSize="sm" opacity={0.8}>
              {getSetting('public_contact_address', '') && (
                <Box>{getSetting('public_contact_address', '')}</Box>
              )}
              {getSetting('public_contact_phone', '') && (
                <Box>{getSetting('public_contact_phone', '')}</Box>
              )}
              {getSetting('public_contact_email', '') && (
                <Box>{getSetting('public_contact_email', '')}</Box>
              )}
            </VStack>
            <Flex gap={3}>
              {getSetting('public_social_facebook', '') && (
                <Link href={getSetting('public_social_facebook', '')} isExternal opacity={0.7} _hover={{ opacity: 1 }}>
                  Facebook
                </Link>
              )}
              {getSetting('public_social_instagram', '') && (
                <Link href={getSetting('public_social_instagram', '')} isExternal opacity={0.7} _hover={{ opacity: 1 }}>
                  Instagram
                </Link>
              )}
              {getSetting('public_social_tiktok', '') && (
                <Link href={getSetting('public_social_tiktok', '')} isExternal opacity={0.7} _hover={{ opacity: 1 }}>
                  TikTok
                </Link>
              )}
            </Flex>
          </Flex>
          <Box
            borderTopWidth="1px"
            borderColor="whiteAlpha.200"
            pt={4}
            textAlign="center"
            fontSize="sm"
            opacity={0.7}
          >
            {getSetting('public_footer_copyright', `© ${new Date().getFullYear()} ${getSetting('app_title', t('app.title'))}. ${t('public.footer.rights')}.`)}
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
