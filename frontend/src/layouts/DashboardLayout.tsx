import { useState, useEffect, type ElementType } from 'react';
import { Outlet, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Flex,
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
  HStack,
  Link,
  Text,
  Collapse,
  Icon,
} from '@chakra-ui/react';
import {
  HamburgerIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  CalendarIcon,
  TimeIcon,
  SettingsIcon,
  StarIcon,
  EditIcon,
  BellIcon,
  InfoIcon,
} from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

type NavItem = { path: string; labelKey: string };
type NavEntry =
  | { type: 'link'; path: string; labelKey: string; icon: ElementType }
  | { type: 'submenu'; labelKey: string; icon: ElementType; children: NavItem[] };

const navConfig: NavEntry[] = [
  { type: 'link', path: '/admin', labelKey: 'nav.home', icon: InfoIcon },
  {
    type: 'submenu',
    labelKey: 'nav.sectionOperational',
    icon: CalendarIcon,
    children: [
      { path: '/admin/reservations', labelKey: 'nav.reservations' },
      { path: '/admin/daily-log', labelKey: 'nav.dailyLog' },
    ],
  },
  {
    type: 'submenu',
    labelKey: 'nav.sectionSalon',
    icon: SettingsIcon,
    children: [
      { path: '/admin/salon', labelKey: 'nav.salon' },
      { path: '/admin/services', labelKey: 'nav.services' },
      { path: '/admin/stylists', labelKey: 'nav.stylists' },
    ],
  },
  { type: 'link', path: '/admin/finance', labelKey: 'nav.finance', icon: TimeIcon },
  {
    type: 'submenu',
    labelKey: 'nav.sectionContent',
    icon: EditIcon,
    children: [
      { path: '/admin/blog', labelKey: 'nav.blog' },
      { path: '/admin/gallery', labelKey: 'nav.gallery' },
      { path: '/admin/reviews', labelKey: 'nav.reviews' },
    ],
  },
  {
    type: 'submenu',
    labelKey: 'nav.sectionPeople',
    icon: StarIcon,
    children: [
      { path: '/admin/users', labelKey: 'nav.users' },
      { path: '/admin/client-analytics', labelKey: 'nav.clientAnalytics' },
    ],
  },
  { type: 'link', path: '/admin/analytics', labelKey: 'nav.analytics', icon: InfoIcon },
  {
    type: 'submenu',
    labelKey: 'nav.sectionSettings',
    icon: BellIcon,
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
              <HStack spacing={2}>
                <Icon as={entry.icon} boxSize={4} />
                <Text as="span">{t(entry.labelKey)}</Text>
              </HStack>
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
              <Icon as={entry.icon} boxSize={4} mr={2} />
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
    '/admin/stylist-analytics': t('nav.stylistAnalytics'),
    '/admin/analytics': t('nav.analytics'),
    '/admin/loyalty': t('nav.loyalty'),
  };
  const currentLabel = pathNames[location.pathname] ?? location.pathname;

  return (
    <Flex minH="100vh" direction="column">
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
          minH="56px"
          align={{ base: 'stretch', md: 'center' }}
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          px={4}
          py={{ base: 2, md: 0 }}
          gap={{ base: 2, md: 3 }}
          borderBottom="1px"
          borderColor="gray.200"
          bg="white"
        >
          <Flex align="center" gap={2} minW={0} w="full">
            <IconButton
              aria-label="Meni"
              icon={<HamburgerIcon />}
              onClick={onOpen}
              variant="ghost"
              flexShrink={0}
            />
            <Breadcrumb spacing={2} flex={1} minW={0}>
              <BreadcrumbItem>
                <BreadcrumbLink as={RouterLink} to="/admin" whiteSpace="nowrap">
                  {t('app.title')}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem minW={0}>
                <BreadcrumbLink isCurrentPage noOfLines={1}>
                  {currentLabel}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </Breadcrumb>
          </Flex>
          <Flex
            align="center"
            gap={2}
            wrap={{ base: 'wrap', md: 'nowrap' }}
            justify={{ base: 'space-between', md: 'flex-end' }}
            w={{ base: 'full', md: 'auto' }}
            minW={0}
          >
            <Link
              as={RouterLink}
              to="/"
              color="brand.600"
              _hover={{ color: 'brand.700', textDecoration: 'underline' }}
              display={{ base: 'none', sm: 'flex' }}
              alignItems="center"
              gap={1}
              whiteSpace="nowrap"
            >
              <ExternalLinkIcon boxSize={4} />
              Pogledaj stranicu
            </Link>
            <Text
              color="gray.600"
              noOfLines={1}
              maxW={{ base: '120px', md: '180px' }}
            >
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
