import { Outlet, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Flex,
  Heading,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Container,
  IconButton,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  VStack,
  Link,
  Text,
} from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

// Grupisana navigacija: sekcija (opciono) + linkovi
const navSections: { sectionKey?: string; items: { path: string; labelKey: string }[] }[] = [
  { items: [{ path: '/admin', labelKey: 'nav.home' }] },
  {
    sectionKey: 'nav.sectionOperational',
    items: [
      { path: '/admin/reservations', labelKey: 'nav.reservations' },
      { path: '/admin/daily-log', labelKey: 'nav.dailyLog' },
    ],
  },
  {
    sectionKey: 'nav.sectionSalon',
    items: [
      { path: '/admin/salon', labelKey: 'nav.salon' },
      { path: '/admin/services', labelKey: 'nav.services' },
      { path: '/admin/stylists', labelKey: 'nav.stylists' },
    ],
  },
  { items: [{ path: '/admin/finance', labelKey: 'nav.finance' }] },
  {
    sectionKey: 'nav.sectionContent',
    items: [
      { path: '/admin/blog', labelKey: 'nav.blog' },
      { path: '/admin/gallery', labelKey: 'nav.gallery' },
      { path: '/admin/reviews', labelKey: 'nav.reviews' },
    ],
  },
  {
    sectionKey: 'nav.sectionPeople',
    items: [
      { path: '/admin/users', labelKey: 'nav.users' },
      { path: '/admin/client-analytics', labelKey: 'nav.clientAnalytics' },
    ],
  },
  { items: [{ path: '/admin/analytics', labelKey: 'nav.analytics' }] },
  {
    sectionKey: 'nav.sectionSettings',
    items: [
      { path: '/admin/settings', labelKey: 'nav.settings' },
      { path: '/admin/notifications', labelKey: 'nav.notifications' },
      { path: '/admin/loyalty', labelKey: 'nav.loyalty' },
    ],
  },
];

function SidebarNav({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const location = useLocation();
  return (
    <VStack align="stretch" spacing={3}>
      {navSections.map((section, idx) => (
        <Box key={idx}>
          {section.sectionKey && (
            <Text px={4} py={1} fontSize="xs" fontWeight={600} color="gray.500" textTransform="uppercase" letterSpacing="wider">
              {t(section.sectionKey)}
            </Text>
          )}
          <VStack align="stretch" spacing={0}>
            {section.items.map((item) => (
              <Link
                key={item.path}
                as={RouterLink}
                to={item.path}
                onClick={onClose}
                px={4}
                py={2}
                rounded="md"
                bg={location.pathname === item.path ? 'brand.100' : 'transparent'}
                color={location.pathname === item.path ? 'brand.800' : 'gray.700'}
                _hover={{ bg: 'brand.50' }}
                fontWeight={location.pathname === item.path ? 600 : 400}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </VStack>
        </Box>
      ))}
    </VStack>
  );
}

export default function DashboardLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const location = useLocation();

  const pathNames: Record<string, string> = {
    '/admin': t('nav.home'),
    '/admin/users': t('nav.users'),
    '/admin/salon': t('nav.salon'),
    '/admin/services': t('nav.services'),
    '/admin/stylists': t('nav.stylists'),
    '/admin/reservations': t('nav.reservations'),
    '/admin/daily-log': t('nav.dailyLog'),
    '/admin/finance': t('nav.finance'),
    '/admin/blog': t('nav.blog'),
    '/admin/gallery': t('nav.gallery'),
    '/admin/reviews': t('nav.reviews'),
    '/admin/settings': t('nav.settings'),
    '/admin/notifications': t('nav.notifications'),
    '/admin/client-analytics': t('nav.clientAnalytics'),
    '/admin/analytics': t('nav.analytics'),
    '/admin/loyalty': t('nav.loyalty'),
  };
  const currentLabel = pathNames[location.pathname] ?? location.pathname;

  return (
    <Flex minH="100vh" direction={{ base: 'column', md: 'row' }}>
      <Box
        display={{ base: 'none', md: 'block' }}
        w="240px"
        borderRight="1px"
        borderColor="gray.200"
        bg="white"
        py={4}
        px={2}
      >
        <Heading size="sm" px={4} mb={4} color="brand.600">
          {t('app.admin')}
        </Heading>
        <SidebarNav />
      </Box>

      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader>{t('app.admin')}</DrawerHeader>
          <DrawerBody>
            <SidebarNav onClose={onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Box flex={1} display="flex" flexDirection="column" minW={0}>
        <Flex
          as="header"
          h="56px"
          align="center"
          justify="space-between"
          px={4}
          borderBottom="1px"
          borderColor="gray.200"
          bg="white"
        >
          <IconButton
            aria-label="Meni"
            icon={<HamburgerIcon />}
            display={{ md: 'none' }}
            onClick={onOpen}
            variant="ghost"
          />
          <Breadcrumb spacing={2} flex={1}>
            <BreadcrumbItem>
              <BreadcrumbLink as={RouterLink} to="/admin">
                {t('app.title')}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink isCurrentPage>{currentLabel}</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
          <Flex align="center" gap={2}>
            <Text fontSize="sm" color="gray.600">
              {user?.username}
            </Text>
            <Button size="sm" variant="outline" onClick={logout}>
              {t('auth.logout')}
            </Button>
          </Flex>
        </Flex>

        <Container maxW="container.xl" py={6} flex={1}>
          <Outlet />
        </Container>
      </Box>
    </Flex>
  );
}
