import { useState, useEffect } from 'react';
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
  Collapse,
} from '@chakra-ui/react';
import { HamburgerIcon, ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

type NavItem = { path: string; labelKey: string };
type NavEntry =
  | { type: 'link'; path: string; labelKey: string }
  | { type: 'submenu'; labelKey: string; children: NavItem[] };

const navConfig: NavEntry[] = [
  { type: 'link', path: '/admin', labelKey: 'nav.home' },
  {
    type: 'submenu',
    labelKey: 'nav.sectionOperational',
    children: [
      { path: '/admin/reservations', labelKey: 'nav.reservations' },
      { path: '/admin/daily-log', labelKey: 'nav.dailyLog' },
    ],
  },
  {
    type: 'submenu',
    labelKey: 'nav.sectionSalon',
    children: [
      { path: '/admin/salon', labelKey: 'nav.salon' },
      { path: '/admin/services', labelKey: 'nav.services' },
      { path: '/admin/stylists', labelKey: 'nav.stylists' },
    ],
  },
  { type: 'link', path: '/admin/finance', labelKey: 'nav.finance' },
  {
    type: 'submenu',
    labelKey: 'nav.sectionContent',
    children: [
      { path: '/admin/blog', labelKey: 'nav.blog' },
      { path: '/admin/gallery', labelKey: 'nav.gallery' },
      { path: '/admin/reviews', labelKey: 'nav.reviews' },
    ],
  },
  {
    type: 'submenu',
    labelKey: 'nav.sectionPeople',
    children: [
      { path: '/admin/users', labelKey: 'nav.users' },
      { path: '/admin/client-analytics', labelKey: 'nav.clientAnalytics' },
    ],
  },
  { type: 'link', path: '/admin/analytics', labelKey: 'nav.analytics' },
  {
    type: 'submenu',
    labelKey: 'nav.sectionSettings',
    children: [
      { path: '/admin/settings', labelKey: 'nav.settings' },
      { path: '/admin/notifications', labelKey: 'nav.notifications' },
      { path: '/admin/loyalty', labelKey: 'nav.loyalty' },
    ],
  },
];

function isPathInSubmenu(path: string, children: NavItem[]): boolean {
  return children.some((c) => c.path === path || path.startsWith(c.path + '/'));
}

function SidebarNav({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const location = useLocation();
  const path = location.pathname;

  const [openKeys, setOpenKeys] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    navConfig.forEach((entry, idx) => {
      if (entry.type === 'submenu' && isPathInSubmenu(path, entry.children)) {
        initial.add(idx);
      }
    });
    return initial;
  });

  useEffect(() => {
    const next = new Set<number>();
    navConfig.forEach((entry, idx) => {
      if (entry.type === 'submenu' && isPathInSubmenu(path, entry.children)) {
        next.add(idx);
      }
    });
    setOpenKeys((prev) => (next.size > 0 ? next : prev));
  }, [path]);

  const toggle = (idx: number) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <VStack align="stretch" spacing={0}>
      {navConfig.map((entry, idx) => {
        if (entry.type === 'link') {
          const isActive = path === entry.path;
          return (
            <Link
              key={idx}
              as={RouterLink}
              to={entry.path}
              onClick={onClose}
              px={4}
              py={2}
              rounded="md"
              mx={1}
              bg={isActive ? 'brand.100' : 'transparent'}
              color={isActive ? 'brand.800' : 'gray.700'}
              _hover={{ bg: 'brand.50' }}
              fontWeight={isActive ? 600 : 400}
            >
              {t(entry.labelKey)}
            </Link>
          );
        }
        const isOpen = openKeys.has(idx);
        const hasActiveChild = isPathInSubmenu(path, entry.children);
        return (
          <Box key={idx}>
            <Flex
              align="center"
              px={4}
              py={2}
              mx={1}
              rounded="md"
              cursor="pointer"
              onClick={() => toggle(idx)}
              _hover={{ bg: 'brand.50' }}
              color={hasActiveChild ? 'brand.800' : 'gray.700'}
              fontWeight={hasActiveChild ? 600 : 400}
            >
              {isOpen ? (
                <ChevronDownIcon boxSize={4} mr={2} />
              ) : (
                <ChevronRightIcon boxSize={4} mr={2} />
              )}
              <Text as="span">{t(entry.labelKey)}</Text>
            </Flex>
            <Collapse in={isOpen} animateOpacity>
              <VStack align="stretch" spacing={0} pl={6} borderLeft="2px" borderColor="gray.200" ml={4} my={1}>
                {entry.children.map((item) => {
                  const isActive = path === item.path;
                  return (
                    <Link
                      key={item.path}
                      as={RouterLink}
                      to={item.path}
                      onClick={onClose}
                      px={3}
                      py={1.5}
                      rounded="md"
                      fontSize="sm"
                      bg={isActive ? 'brand.100' : 'transparent'}
                      color={isActive ? 'brand.800' : 'gray.600'}
                      _hover={{ bg: 'brand.50' }}
                      fontWeight={isActive ? 600 : 400}
                    >
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </VStack>
            </Collapse>
          </Box>
        );
      })}
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
