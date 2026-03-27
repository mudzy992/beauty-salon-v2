import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRef } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Spinner, Text,
  Badge, IconButton, Flex, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Input, Button, useToast, Switch, Select,
  Menu, MenuButton, MenuList, MenuItem, InputGroup, InputLeftElement,
  HStack, Tag, TagLabel, TagCloseButton, Avatar, Alert, AlertIcon, VStack,
  useBreakpointValue, SimpleGrid, RadioGroup, Radio, Stack,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { EditIcon, DeleteIcon, AddIcon, SearchIcon, ViewIcon } from '@chakra-ui/icons';
import api from '../api/client';
import { getUploadUrl } from '../utils/uploadUrl';

interface UserRole { role: { name: string } }

interface UserRow {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
  avatar: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  userRoles?: UserRole[];
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface StylistRemovalPreview {
  stylistProfileId: string;
  counts: {
    dailyLogEntriesCount: number;
    confirmedReservationsCount: number;
    reservationResponsesCount: number;
    reviewsCount: number;
  };
}

interface StylistOption {
  id: string;
  user?: { firstName?: string | null; lastName?: string | null; username?: string | null };
  status?: 'PENDING' | 'ACTIVE' | string | null;
}

/** Uloge koje admin može ručno dodavati/uklanjati. */
const ROLES_MANAGED_IN_UI = ['SYSTEM_ADMIN', 'OWNER', 'CLIENT', 'STYLIST'] as const;
const roleColorMap: Record<string, string> = {
  SYSTEM_ADMIN: 'red', OWNER: 'purple', STYLIST: 'blue', CLIENT: 'green',
};

export default function Users() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<UserRow[]>([]);
  const [stylists, setStylists] = useState<UserRow[]>([]);
  const [clients, setClients] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientsSearch, setClientsSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const {
    isOpen: isCredentialsOpen,
    onOpen: onCredentialsOpen,
    onClose: onCredentialsClose,
  } = useDisclosure();
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    gender: '' as '' | 'MALE' | 'FEMALE',
    isActive: true,
    avatar: '' as string | null,
  });
  const [initialEmail, setInitialEmail] = useState<string>('');
  const [initialUsername, setInitialUsername] = useState<string>('');
  const [editIsUsernameManuallyEdited, setEditIsUsernameManuallyEdited] =
    useState<boolean>(false);
  const [editUsernameStatus, setEditUsernameStatus] = useState<{
    loading: boolean;
    available: boolean | null;
    suggestions: string[];
  }>({ loading: false, available: null, suggestions: [] });

  const [createData, setCreateData] = useState({
    username: '', firstName: '', lastName: '', role: 'CLIENT' as string, avatar: '' as string,
    gender: '' as '' | 'MALE' | 'FEMALE',
  });
  const [isUsernameManuallyEdited, setIsUsernameManuallyEdited] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{
    loading: boolean;
    available: boolean | null;
    suggestions: string[];
  }>({ loading: false, available: null, suggestions: [] });
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string;
    initialPassword: string;
  } | null>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const isMobile = useBreakpointValue({ base: true, lg: false }) ?? false;
  const avatarEditRef = useRef<HTMLInputElement>(null);
  const avatarCreateRef = useRef<HTMLInputElement>(null);

  const {
    isOpen: isRemoveStylistOpen,
    onOpen: onRemoveStylistOpen,
    onClose: onRemoveStylistClose,
  } = useDisclosure();
  const [removeStylistUser, setRemoveStylistUser] = useState<UserRow | null>(null);
  const [removalPreview, setRemovalPreview] = useState<StylistRemovalPreview | null>(null);
  const [allStylists, setAllStylists] = useState<StylistOption[]>([]);
  const [removalSubmitting, setRemovalSubmitting] = useState(false);

  type RemovalMode = 'DELETE' | 'TRANSFER';
  const [removalModes, setRemovalModes] = useState<{
    dailyLogs: RemovalMode;
    confirmedReservations: RemovalMode;
    reservationResponses: RemovalMode;
    reviews: RemovalMode;
  }>({
    dailyLogs: 'TRANSFER',
    confirmedReservations: 'TRANSFER',
    reservationResponses: 'TRANSFER',
    reviews: 'TRANSFER',
  });
  const [removalTargets, setRemovalTargets] = useState<{
    dailyLogs?: string;
    confirmedReservations?: string;
    reservationResponses?: string;
    reviews?: string;
  }>({});

  const normalizeUsernameFromNames = (first: string, last: string): string => {
    const base = `${first}.${last}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9.\s]/g, '')
      .trim()
      .replace(/\s+/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\./, '')
      .replace(/\.$/, '');
    return base;
  };

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<UserRow[]>('/api/users/system-admins'),
      api.get<UserRow[]>('/api/users/stylists'),
      api.get<PaginatedResponse<UserRow>>('/api/users/clients', {
        params: { page, pageSize, q: clientsSearch.trim() || undefined },
      }),
    ])
      .then(([adminsRes, stylistsRes, clientsRes]) => {
        setAdmins(Array.isArray(adminsRes.data) ? adminsRes.data : []);
        setStylists(Array.isArray(stylistsRes.data) ? stylistsRes.data : []);
        setClients(Array.isArray(clientsRes.data.items) ? clientsRes.data.items : []);
        setTotal(clientsRes.data.total ?? 0);
      })
      .catch(() => {
        setAdmins([]);
        setStylists([]);
        setClients([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, clientsSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getUserRoles = useCallback((u: UserRow): string[] => u.userRoles?.map((r) => r.role.name) ?? [], []);
  const groupedUsers = useMemo(() => {
    return { administrators: admins, stylists, clients };
  }, [admins, stylists, clients]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    setPage(0);
  }, [clientsSearch]);

  const visiblePageNumbers = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(totalPages - 1, Math.max(0, page));
    const windowSize = 5;
    const half = Math.floor(windowSize / 2);
    const start = Math.max(0, Math.min(current - half, totalPages - windowSize));
    const end = Math.min(totalPages, start + windowSize);
    return { pages: Array.from({ length: end - start }, (_, i) => start + i), totalPages };
  }, [page, pageSize, total]);

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    const baseUsername = normalizeUsernameFromNames(u.firstName ?? '', u.lastName ?? '');
    setFormData({
      username: u.username,
      email: u.email ?? '',
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      phone: u.phone ?? '',
      gender: (u.gender ?? '') as '' | 'MALE' | 'FEMALE',
      isActive: u.isActive,
      avatar: u.avatar ?? null,
    });
    setInitialEmail(u.email ?? '');
    setInitialUsername(u.username ?? '');
    setEditIsUsernameManuallyEdited(
      !!u.username && baseUsername.trim().length > 0 && u.username.trim() !== baseUsername,
    );
    setEditUsernameStatus({ loading: false, available: null, suggestions: [] });
    onOpen();
  };

  const handleUploadAvatarEdit = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('entity', 'avatars');
      const { data } = await api.post<{ pathThumb?: string; pathSmall?: string; pathOriginal: string }>('/api/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const path = data.pathThumb || data.pathSmall || data.pathOriginal;
      setFormData((prev) => ({ ...prev, avatar: path }));
      toast({ title: 'Avatar uploadovan', status: 'success', isClosable: true, duration: 2000 });
    } catch {
      toast({ title: 'Greška pri uploadu', status: 'error', isClosable: true });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUploadAvatarCreate = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('entity', 'avatars');
      const { data } = await api.post<{ pathThumb?: string; pathSmall?: string; pathOriginal: string }>('/api/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const path = data.pathThumb || data.pathSmall || data.pathOriginal;
      setCreateData((prev) => ({ ...prev, avatar: path }));
      toast({ title: 'Avatar uploadovan', status: 'success', isClosable: true, duration: 2000 });
    } catch {
      toast({ title: 'Greška pri uploadu', status: 'error', isClosable: true });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!editUser) return;
    const isClient = getUserRoles(editUser).includes('CLIENT');
    const trimmedFirst = formData.firstName.trim();
    const trimmedLast = formData.lastName.trim();
    const trimmedUsername = formData.username.trim();
    if (!trimmedFirst || !trimmedLast) {
      toast({ title: 'Ime i prezime su obavezni.', status: 'warning', isClosable: true });
      return;
    }
    if (!trimmedUsername) {
      toast({ title: 'Korisničko ime je obavezno.', status: 'warning', isClosable: true });
      return;
    }
    if (isClient && !formData.gender) {
      toast({ title: 'Spol je obavezan za klijente.', status: 'warning', isClosable: true });
      return;
    }
    setSaving(true);
    try {
      const trimmedEmail = formData.email.trim();
      const trimmedPhone = formData.phone.trim();
      await api.patch(`/api/users/${editUser.id}`, {
        username: trimmedUsername,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        email: trimmedEmail ? trimmedEmail : null,
        phone: trimmedPhone ? trimmedPhone : null,
        gender: formData.gender || null,
        isActive: formData.isActive,
        avatar: formData.avatar || null,
      });
      toast({ title: 'Korisnik ažuriran', status: 'success', isClosable: true });
      loadData();
      onClose();
    } catch {
      toast({ title: 'Greška pri ažuriranju', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!editUser) return;
    if (editIsUsernameManuallyEdited) return;
    const baseUsername = normalizeUsernameFromNames(
      formData.firstName,
      formData.lastName,
    );
    if (!baseUsername) return;
    if (baseUsername.trim() === formData.username.trim()) return;
    setFormData((prev) => ({ ...prev, username: baseUsername }));
  }, [
    editUser,
    editIsUsernameManuallyEdited,
    formData.firstName,
    formData.lastName,
  ]);

  useEffect(() => {
    if (!editUser) return;
    const username = formData.username.trim();
    if (!username) {
      setEditUsernameStatus({ loading: false, available: null, suggestions: [] });
      return;
    }
    if (username === initialUsername.trim()) {
      setEditUsernameStatus({ loading: false, available: true, suggestions: [] });
      return;
    }
    const timeout = setTimeout(async () => {
      setEditUsernameStatus((prev) => ({ ...prev, loading: true }));
      try {
        const { data } = await api.get(`/api/users/${editUser.id}/username-availability`, {
          params: { username },
        });
        setEditUsernameStatus({
          loading: false,
          available: !!data.available,
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        });
      } catch {
        setEditUsernameStatus({
          loading: false,
          available: null,
          suggestions: [],
        });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [editUser, formData.username]);

  const handleCreate = async () => {
    if (!createData.firstName || !createData.lastName || !createData.role) {
      toast({ title: 'Popunite sva obavezna polja', status: 'warning', isClosable: true });
      return;
    }
    if (!createData.gender) {
      toast({ title: 'Spol je obavezan.', status: 'warning', isClosable: true });
      return;
    }
    setSaving(true);
    try {
      const response = await api.post('/api/users', {
        ...createData,
        role: 'CLIENT',
        gender: createData.gender || undefined,
        ...(createData.avatar && { avatar: createData.avatar }),
      });
      toast({ title: 'Korisnik kreiran', status: 'success', isClosable: true });
      setCreatedCredentials({
        username: response.data?.username || createData.username,
        initialPassword: response.data?.initialPassword || 'Init2026!',
      });
      loadData();
      onCreateClose();
      onCredentialsOpen();
      setCreateData({ username: '', firstName: '', lastName: '', role: 'CLIENT', avatar: '', gender: '' });
      setIsUsernameManuallyEdited(false);
      setUsernameStatus({ loading: false, available: null, suggestions: [] });
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast({ title: msg || 'Greška pri kreiranju', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const base = `${createData.firstName}.${createData.lastName}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9.\s]/g, '')
      .trim()
      .replace(/\s+/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\./, '')
      .replace(/\.$/, '');
    const username = (isUsernameManuallyEdited ? createData.username : base).trim();
    if (!username) {
      setUsernameStatus({ loading: false, available: null, suggestions: [] });
      return;
    }
    if (!isUsernameManuallyEdited && createData.username !== base) {
      setCreateData((prev) => ({ ...prev, username: base }));
    }
    const timeout = setTimeout(async () => {
      setUsernameStatus((prev) => ({ ...prev, loading: true }));
      try {
        const { data } = await api.get('/api/users/username-availability', {
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
  }, [
    createData.firstName,
    createData.lastName,
    createData.username,
    isUsernameManuallyEdited,
  ]);

  const handleDeactivate = async (id: string, username: string) => {
    if (!window.confirm(`Deaktivirati korisnika "${username}"?`)) return;
    try {
      await api.patch(`/api/users/${id}`, { isActive: false });
      toast({ title: 'Korisnik deaktiviran', status: 'success', isClosable: true });
      loadData();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    }
  };

  const handleAssignRole = async (userId: string, roleName: string) => {
    try {
      await api.post(`/api/users/${userId}/roles`, { role: roleName });
      if (roleName === 'STYLIST') {
        toast({
          title: 'Stilist kreiran (pending)',
          description: 'Završite profil u Stylists.',
          status: 'success',
          isClosable: true,
        });
      } else {
        toast({ title: `Uloga ${roleName} dodijeljena`, status: 'success', isClosable: true });
      }
      loadData();
    } catch {
      toast({ title: 'Greška pri dodjeli uloge', status: 'error', isClosable: true });
    }
  };

  const handleRemoveRole = async (userId: string, roleName: string) => {
    if (roleName === 'STYLIST') {
      const u = [...admins, ...stylists, ...clients].find((x) => x.id === userId) ?? null;
      setRemoveStylistUser(u);
      setRemovalPreview(null);
      setAllStylists([]);
      setRemovalModes({
        dailyLogs: 'TRANSFER',
        confirmedReservations: 'TRANSFER',
        reservationResponses: 'TRANSFER',
        reviews: 'TRANSFER',
      });
      setRemovalTargets({});
      onRemoveStylistOpen();
      try {
        const previewRes = await api.get<StylistRemovalPreview>(`/api/users/${userId}/stylist-removal-preview`);
        setRemovalPreview(previewRes.data);
        const c = previewRes.data.counts;
        const hasAnyLinks =
          (c.dailyLogEntriesCount ?? 0) > 0 ||
          (c.confirmedReservationsCount ?? 0) > 0 ||
          (c.reservationResponsesCount ?? 0) > 0 ||
          (c.reviewsCount ?? 0) > 0;
        if (!hasAnyLinks) {
          setRemovalSubmitting(true);
          await api.post(`/api/users/${userId}/remove-stylist-role`, {
            dailyLogs: { mode: 'DELETE' },
            confirmedReservations: { mode: 'DELETE' },
            reservationResponses: { mode: 'DELETE' },
            reviews: { mode: 'DELETE' },
          });
          toast({ title: 'STYLIST rola uklonjena', status: 'success', isClosable: true });
          onRemoveStylistClose();
          loadData();
          setRemovalSubmitting(false);
          return;
        }
        const stylistsRes = await api.get<StylistOption[] | { items: StylistOption[] }>('/api/stylists', {
          params: { page: 0, pageSize: 300 },
        });
        const items = Array.isArray((stylistsRes.data as any)?.items)
          ? (stylistsRes.data as any).items
          : (Array.isArray(stylistsRes.data) ? stylistsRes.data : []);
        setAllStylists(items);
      } catch (err: any) {
        const msg = err?.response?.data?.message;
        toast({ title: msg || 'Greška pri pripremi uklanjanja stiliste', status: 'error', isClosable: true });
        setRemovalSubmitting(false);
        onRemoveStylistClose();
      }
      return;
    }
    if (!window.confirm(`Ukloniti ulogu ${roleName}?`)) return;
    try {
      await api.delete(`/api/users/${userId}/roles/${roleName}`);
      toast({ title: `Uloga ${roleName} uklonjena`, status: 'success', isClosable: true });
      loadData();
    } catch {
      toast({ title: 'Greška pri uklanjanju uloge', status: 'error', isClosable: true });
    }
  };

  const getTargetOptions = () => {
    const currentStylistId = removalPreview?.stylistProfileId;
    return allStylists
      .filter((s) => s.id !== currentStylistId)
      .map((s) => ({
        id: s.id,
        label: [s.user?.firstName, s.user?.lastName].filter(Boolean).join(' ') || s.user?.username || s.id,
        isPending: String(s.status ?? '').toUpperCase() === 'PENDING',
      }));
  };

  const removalSummary = useMemo(() => {
    if (!removalPreview) return [];
    const c = removalPreview.counts;
    const rows = [
      { key: 'dailyLogs', label: 'Daily logovi', count: c.dailyLogEntriesCount },
      { key: 'confirmedReservations', label: 'Potvrđene rezervacije', count: c.confirmedReservationsCount },
      { key: 'reservationResponses', label: 'Odgovori/lockovi rezervacija', count: c.reservationResponsesCount },
      { key: 'reviews', label: 'Reviews', count: c.reviewsCount },
    ] as const;
    return rows
      .filter((r) => (r.count ?? 0) > 0)
      .map((r) => {
        const mode = removalModes[r.key];
        const target = (removalTargets as any)[r.key] as string | undefined;
        return {
          label: r.label,
          count: r.count,
          mode,
          target,
        };
      });
  }, [removalPreview, removalModes, removalTargets]);

  const isRemovalReady = useMemo(() => {
    if (!removalPreview) return false;
    for (const row of removalSummary) {
      if (row.mode === 'TRANSFER' && !row.target) return false;
    }
    return true;
  }, [removalPreview, removalSummary]);

  const handleConfirmRemoveStylist = async () => {
    if (!removeStylistUser || !removalPreview) return;
    const counts = removalPreview.counts;
    const payload = {
      dailyLogs: {
        mode: counts.dailyLogEntriesCount > 0 ? removalModes.dailyLogs : 'DELETE',
        targetStylistProfileId: removalModes.dailyLogs === 'TRANSFER' ? removalTargets.dailyLogs : undefined,
      },
      confirmedReservations: {
        mode: counts.confirmedReservationsCount > 0 ? removalModes.confirmedReservations : 'DELETE',
        targetStylistProfileId: removalModes.confirmedReservations === 'TRANSFER'
          ? removalTargets.confirmedReservations
          : undefined,
      },
      reservationResponses: {
        mode: counts.reservationResponsesCount > 0 ? removalModes.reservationResponses : 'DELETE',
        targetStylistProfileId: removalModes.reservationResponses === 'TRANSFER'
          ? removalTargets.reservationResponses
          : undefined,
      },
      reviews: {
        mode: counts.reviewsCount > 0 ? removalModes.reviews : 'DELETE',
        targetStylistProfileId: removalModes.reviews === 'TRANSFER' ? removalTargets.reviews : undefined,
      },
    } as const;

    const missingTarget = (key: keyof typeof payload) =>
      payload[key].mode === 'TRANSFER' && !payload[key].targetStylistProfileId;

    if (missingTarget('dailyLogs') || missingTarget('confirmedReservations') || missingTarget('reservationResponses') || missingTarget('reviews')) {
      toast({ title: 'Odaberite target stilistu za sve TRANSFER opcije.', status: 'warning', isClosable: true });
      return;
    }

    setRemovalSubmitting(true);
    try {
      await api.post(`/api/users/${removeStylistUser.id}/remove-stylist-role`, payload);
      toast({ title: 'STYLIST rola uklonjena', status: 'success', isClosable: true });
      onRemoveStylistClose();
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast({ title: msg || 'Greška pri uklanjanju stiliste', status: 'error', isClosable: true });
    } finally {
      setRemovalSubmitting(false);
    }
  };

  /** Uloge koje admin može dodati (isključeno STYLIST – dodaje se u Stylists). */
  const getAvailableRolesToAssign = (u: UserRow) => {
    const current = getUserRoles(u);
    return ROLES_MANAGED_IN_UI.filter((r) => !current.includes(r));
  };
  const canRemoveRole = (roleName: string) =>
    roleName !== 'CLIENT' && ROLES_MANAGED_IN_UI.includes(roleName as any);

  const renderMobileUserCard = (u: UserRow) => (
    <Box key={u.id} borderWidth="1px" borderColor="gray.200" rounded="md" p={3}>
      <HStack justify="space-between" align="start">
        <HStack>
          <Avatar size="sm" src={getUploadUrl(u.avatar ?? undefined)} name={[u.firstName, u.lastName].filter(Boolean).join(' ')} bg="brand.100" />
          <Box>
            <Text fontWeight="medium">{u.username}</Text>
            <Text color="gray.500">{[u.firstName, u.lastName].filter(Boolean).join(' ') || '-'}</Text>
          </Box>
        </HStack>
        <Badge colorScheme={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Aktivan' : 'Neaktivan'}</Badge>
      </HStack>
      <Text mt={2} color="gray.600">{u.email ?? '-'}</Text>
      <Flex mt={2} gap={1} flexWrap="wrap">
        {getUserRoles(u).map((roleName) => (
          <Tag key={roleName} size="sm" colorScheme={roleColorMap[roleName] ?? 'gray'}>
            <TagLabel>
              {roleName}
              {roleName === 'STYLIST' ? ' (Stylists)' : ''}
            </TagLabel>
            {canRemoveRole(roleName) ? (
              <TagCloseButton onClick={() => handleRemoveRole(u.id, roleName)} />
            ) : null}
          </Tag>
        ))}
        {getAvailableRolesToAssign(u).length > 0 && (
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<AddIcon />}
              size="xs"
              variant="ghost"
              aria-label="Dodaj ulogu"
            />
            <MenuList>
              {getAvailableRolesToAssign(u).map((r) => (
                <MenuItem key={r} onClick={() => handleAssignRole(u.id, r)}>
                  {r}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        )}
      </Flex>
      <HStack spacing={1} justify="flex-end" mt={3}>
        <IconButton aria-label="Analitika" icon={<ViewIcon />} size="sm" variant="ghost" colorScheme="teal" onClick={() => navigate(`/admin/client-analytics?userId=${u.id}`)} />
        <IconButton aria-label="Uredi" icon={<EditIcon />} size="sm" variant="ghost" colorScheme="blue" onClick={() => openEdit(u)} />
        {u.isActive && <IconButton aria-label="Deaktiviraj" icon={<DeleteIcon />} size="sm" variant="ghost" colorScheme="red" onClick={() => handleDeactivate(u.id, u.username)} />}
      </HStack>
    </Box>
  );

  const renderDesktopUserRow = (u: UserRow) => (
    <Tr key={u.id}>
      <Td><Avatar size="sm" src={getUploadUrl(u.avatar ?? undefined)} name={[u.firstName, u.lastName].filter(Boolean).join(' ')} bg="brand.100" /></Td>
      <Td fontWeight="medium">{u.username}</Td>
      <Td>{u.email ?? '-'}</Td>
      <Td>{[u.firstName, u.lastName].filter(Boolean).join(' ') || '-'}</Td>
      <Td>{u.phone ?? '-'}</Td>
      <Td>
        <Flex gap={1} flexWrap="wrap" align="center">
          {getUserRoles(u).map((roleName) => (
            <Tag key={roleName} size="sm" colorScheme={roleColorMap[roleName] ?? 'gray'}>
              <TagLabel>{roleName}{roleName === 'STYLIST' ? ' (Stylists)' : ''}</TagLabel>
              {canRemoveRole(roleName) ? (
                <TagCloseButton onClick={() => handleRemoveRole(u.id, roleName)} />
              ) : null}
            </Tag>
          ))}
          {getAvailableRolesToAssign(u).length > 0 && (
            <Menu>
              <MenuButton as={IconButton} icon={<AddIcon />} size="xs" variant="ghost" aria-label="Dodaj ulogu" />
              <MenuList>
                {getAvailableRolesToAssign(u).map((r) => (
                  <MenuItem key={r} onClick={() => handleAssignRole(u.id, r)}>{r}</MenuItem>
                ))}
              </MenuList>
            </Menu>
          )}
        </Flex>
      </Td>
      <Td><Badge colorScheme={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Aktivan' : 'Neaktivan'}</Badge></Td>
      <Td textAlign="right">
        <HStack spacing={1} justify="flex-end">
          <IconButton aria-label="Analitika" icon={<ViewIcon />} size="sm" variant="ghost" colorScheme="teal" onClick={() => navigate(`/admin/client-analytics?userId=${u.id}`)} title="Analitika klijenta" />
          <IconButton aria-label="Uredi" icon={<EditIcon />} size="sm" variant="ghost" colorScheme="blue" onClick={() => openEdit(u)} />
          {u.isActive && (
            <IconButton aria-label="Deaktiviraj" icon={<DeleteIcon />} size="sm" variant="ghost" colorScheme="red" onClick={() => handleDeactivate(u.id, u.username)} />
          )}
        </HStack>
      </Td>
    </Tr>
  );

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Heading size="lg">{t('nav.users')}</Heading>
        <Flex w={{ base: 'full', md: 'auto' }} gap={2} direction={{ base: 'column', sm: 'row' }}>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="brand"
            size={{ base: 'sm', md: 'md' }}
            minW={{ base: 'full', sm: 'fit-content' }}
            w={{ base: 'full', sm: 'auto' }}
            onClick={onCreateOpen}
          >
            Novi Korisnik
          </Button>
        </Flex>
      </Flex>

      {loading ? (
        <Box bg="white" rounded="lg" shadow="sm" overflow="auto">
          <Box p={6} textAlign="center"><Spinner size="lg" /></Box>
        </Box>
      ) : (
        <VStack align="stretch" spacing={4}>
          {([
            {
              title: 'ADMINISTRATORI',
              items: groupedUsers.administrators,
              empty: 'Nema administratora.',
            },
            {
              title: 'STILISTI',
              items: groupedUsers.stylists,
              empty: 'Nema stilista.',
            },
            {
              title: 'KLIJENTI',
              items: groupedUsers.clients,
              empty: 'Nema klijenata.',
            },
          ] as const)
            .filter((section) => section.items.length > 0)
            .map((section) => (
            <Box key={section.title} bg="white" rounded="lg" shadow="sm" overflow="hidden">
              <Flex justify="space-between" align="center" px={4} py={3} bg="gray.50">
                <Flex align="center" gap={3} w="full" justify="space-between" flexWrap="wrap">
                  <HStack>
                    <Text fontWeight="bold" color="gray.700">
                      {section.title}
                    </Text>
                    <Badge colorScheme="gray">{section.items.length}</Badge>
                  </HStack>
                  {section.title === 'KLIJENTI' && (
                    <InputGroup maxW={{ base: 'full', md: '320px' }}>
                      <InputLeftElement><SearchIcon color="gray.400" /></InputLeftElement>
                      <Input
                        placeholder="Pretraži klijente..."
                        value={clientsSearch}
                        onChange={(e) => setClientsSearch(e.target.value)}
                        bg="white"
                      />
                    </InputGroup>
                  )}
                </Flex>
              </Flex>
              {isMobile ? (
                <VStack align="stretch" spacing={3} p={3}>
                  {section.items.map(renderMobileUserCard)}
                </VStack>
              ) : (
                <Box overflow="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th w="56px">Avatar</Th>
                        <Th>Korisničko ime</Th>
                        <Th>Email</Th>
                        <Th>Ime i Prezime</Th>
                        <Th>Telefon</Th>
                        <Th>Uloge</Th>
                        <Th>Status</Th>
                        <Th textAlign="right">Akcije</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {section.items.map(renderDesktopUserRow)}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </Box>
          ))}
        </VStack>
      )}
      <Flex justify="space-between" align="center" mt={4}>
        <Text fontSize="sm" color="gray.500">
          Klijenti ukupno: {total}
        </Text>
        <HStack>
          <Button
            size="sm"
            variant="outline"
            isDisabled={page <= 0}
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
          >
            Prethodna
          </Button>
          {visiblePageNumbers.pages[0] > 0 && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setPage(0)}>1</Button>
              {visiblePageNumbers.pages[0] > 1 && <Text fontSize="sm">…</Text>}
            </>
          )}
          {visiblePageNumbers.pages.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={p === page ? 'solid' : 'ghost'}
              colorScheme={p === page ? 'brand' : undefined}
              onClick={() => setPage(p)}
            >
              {p + 1}
            </Button>
          ))}
          {visiblePageNumbers.totalPages - 1 > visiblePageNumbers.pages[visiblePageNumbers.pages.length - 1] && (
            <>
              {visiblePageNumbers.pages[visiblePageNumbers.pages.length - 1] < visiblePageNumbers.totalPages - 2 && (
                <Text fontSize="sm">…</Text>
              )}
              <Button size="sm" variant="ghost" onClick={() => setPage(visiblePageNumbers.totalPages - 1)}>
                {visiblePageNumbers.totalPages}
              </Button>
            </>
          )}
          <Text fontSize="sm">
            {page + 1} / {totalPages}
          </Text>
          <Button
            size="sm"
            variant="outline"
            isDisabled={page >= totalPages - 1}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Sljedeća
          </Button>
        </HStack>
      </Flex>

      <Modal isOpen={isRemoveStylistOpen} onClose={onRemoveStylistClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ukloni STYLIST rolu</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {!removalPreview ? (
              <Box py={6} textAlign="center">
                <Spinner />
              </Box>
            ) : (
              <VStack align="stretch" spacing={4}>
                <Text color="gray.600">
                  Stilist: <Text as="span" fontWeight="bold">{removeStylistUser?.username}</Text>
                </Text>

                {([
                  { key: 'dailyLogs', label: 'Daily logovi', count: removalPreview.counts.dailyLogEntriesCount },
                  { key: 'confirmedReservations', label: 'Potvrđene rezervacije', count: removalPreview.counts.confirmedReservationsCount },
                  { key: 'reservationResponses', label: 'Odgovori/lockovi rezervacija', count: removalPreview.counts.reservationResponsesCount },
                  { key: 'reviews', label: 'Reviews', count: removalPreview.counts.reviewsCount },
                ] as const).map((row) => {
                  if (row.count <= 0) return null;
                  const opts = getTargetOptions();
                  const mode = removalModes[row.key];
                  return (
                    <Box key={row.key} borderWidth="1px" borderColor="gray.200" rounded="md" p={3}>
                      <Flex justify="space-between" align="center" mb={2}>
                        <Text fontWeight="bold">{row.label}</Text>
                        <Badge>{row.count}</Badge>
                      </Flex>
                      <RadioGroup
                        value={mode}
                        onChange={(v) => setRemovalModes((prev) => ({ ...prev, [row.key]: v as RemovalMode }))}
                      >
                        <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
                          <Radio value="TRANSFER">Prebaci</Radio>
                          <Radio value="DELETE">Obriši</Radio>
                        </Stack>
                      </RadioGroup>
                      {mode === 'TRANSFER' && (
                        <FormControl mt={3} isRequired>
                          <FormLabel fontSize="sm">Target stilist</FormLabel>
                          <Select
                            placeholder="Odaberite stilistu"
                            value={(removalTargets as any)[row.key] ?? ''}
                            onChange={(e) => setRemovalTargets((prev) => ({ ...prev, [row.key]: e.target.value }))}
                          >
                            {opts.map((o) => (
                              <option key={o.id} value={o.id} disabled={o.isPending}>
                                {o.label}{o.isPending ? ' (PENDING - profil nije završen)' : ''}
                              </option>
                            ))}
                          </Select>
                          {opts.some((o) => o.isPending) && (
                            <Text fontSize="xs" color="orange.600" mt={1}>
                              Nije moguće prebacivanje na stilistu sa PENDING statusom. Prvo završite profil na stranici Stylists.
                            </Text>
                          )}
                        </FormControl>
                      )}
                      {mode === 'DELETE' && (
                        <Text fontSize="xs" color="orange.600" mt={2}>
                          Ova akcija će trajno obrisati podatke iz ove kategorije.
                        </Text>
                      )}
                    </Box>
                  );
                })}

                {removalSummary.length > 0 && (
                  <Box borderWidth="1px" borderColor="gray.200" rounded="md" p={3}>
                    <Text fontWeight="bold" mb={2}>Sažetak</Text>
                    <VStack align="stretch" spacing={1}>
                      {removalSummary.map((r) => (
                        <Flex key={r.label} justify="space-between" gap={3}>
                          <Text fontSize="sm" color="gray.700">
                            {r.label} ({r.count})
                          </Text>
                          <Text fontSize="sm" fontWeight="medium" color={r.mode === 'DELETE' ? 'red.600' : 'blue.600'}>
                            {r.mode === 'DELETE' ? 'BRISANJE' : 'PREBACIVANJE'}
                          </Text>
                        </Flex>
                      ))}
                    </VStack>
                  </Box>
                )}

                <Alert status="info">
                  <AlertIcon />
                  <Text fontSize="sm">
                    Nakon izvršenja, profil stiliste i njegove postavke (servisi, radno vrijeme) se brišu.
                  </Text>
                </Alert>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRemoveStylistClose}>Otkaži</Button>
            <Button colorScheme="red" onClick={handleConfirmRemoveStylist} isLoading={removalSubmitting} isDisabled={!removalPreview || !isRemovalReady}>
              Ukloni STYLIST
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit User Modal - ALL fields editable */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Uredi Korisnika: {editUser?.username}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
              <FormControl flex={1}>
                <FormLabel>Korisničko ime</FormLabel>
                <Input
                  value={formData.username}
                  onChange={(e) => {
                    setEditIsUsernameManuallyEdited(true);
                    setFormData({ ...formData, username: e.target.value });
                  }}
                />
                {editUsernameStatus.loading && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Provjera dostupnosti...
                  </Text>
                )}
                {!editUsernameStatus.loading && editUsernameStatus.available === true && formData.username.trim() === initialUsername.trim() && (
                  <Text fontSize="xs" color="blue.600" mt={1}>
                    Trenutno korisničko ime
                  </Text>
                )}
                {!editUsernameStatus.loading && editUsernameStatus.available === true && formData.username.trim() !== initialUsername.trim() && (
                  <Text fontSize="xs" color="green.600" mt={1}>
                    Korisničko ime je dostupno.
                  </Text>
                )}
                {!editUsernameStatus.loading && editUsernameStatus.available === false && (
                  <Text fontSize="xs" color="red.600" mt={1}>
                    Korisničko ime nije dostupno.
                  </Text>
                )}
                {editUsernameStatus.suggestions.length > 0 && editUsernameStatus.available === false && (
                  <Alert status="info" mt={3}>
                    <AlertIcon />
                    <HStack spacing={2} flexWrap="wrap">
                      <Text fontSize="sm">Prijedlozi:</Text>
                      {editUsernameStatus.suggestions.map((item) => (
                        <Button
                          key={item}
                          size="xs"
                          onClick={() => {
                            setEditIsUsernameManuallyEdited(true);
                            setFormData({ ...formData, username: item });
                          }}
                        >
                          {item}
                        </Button>
                      ))}
                    </HStack>
                  </Alert>
                )}
              </FormControl>
              <FormControl flex={1}>
                <Flex align="center" gap={3}>
                  <FormLabel mb="0">Email</FormLabel>
                  {formData.email.trim().length > 0 && (
                    <Badge colorScheme={formData.email.trim() === initialEmail.trim() && !!editUser?.isEmailVerified ? 'green' : 'orange'}>
                      {formData.email.trim() === initialEmail.trim() && !!editUser?.isEmailVerified
                        ? 'Verifikovan'
                        : 'Nije verifikovan'}
                    </Badge>
                  )}
                </Flex>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </FormControl>
            </SimpleGrid>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
              <FormControl flex={1} isRequired>
                <FormLabel>Ime</FormLabel>
                <Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
              </FormControl>
              <FormControl flex={1} isRequired>
                <FormLabel>Prezime</FormLabel>
                <Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
              </FormControl>
            </SimpleGrid>
            <FormControl mb={4}>
              <FormLabel>Telefon</FormLabel>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </FormControl>
            <FormControl
              mb={4}
              isRequired={!!editUser && getUserRoles(editUser).includes('CLIENT')}
            >
              <FormLabel>Spol</FormLabel>
              <Select
                value={formData.gender}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gender: e.target.value as '' | 'MALE' | 'FEMALE',
                  })
                }
              >
                <option value="">Odaberite spol</option>
                <option value="FEMALE">Žensko</option>
                <option value="MALE">Muško</option>
              </Select>
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Avatar</FormLabel>
              <Flex align="center" gap={3}>
                <Avatar size="lg" src={getUploadUrl(formData.avatar ?? undefined)} name={[formData.firstName, formData.lastName].filter(Boolean).join(' ')} bg="brand.100" />
                <Box>
                  <input type="file" accept="image/*" ref={avatarEditRef} style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleUploadAvatarEdit(e.target.files[0])} />
                  <Button size="sm" onClick={() => avatarEditRef.current?.click()} isLoading={uploadingAvatar}>{(formData.avatar ? 'Promijeni' : 'Dodaj') + ' avatar'}</Button>
                </Box>
              </Flex>
            </FormControl>
            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Aktivan</FormLabel>
              <Switch isChecked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} colorScheme="brand" />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" size={{ base: 'sm', md: 'md' }} mr={3} onClick={onClose}>{t('common.cancel')}</Button>
            <Button colorScheme="brand" size={{ base: 'sm', md: 'md' }} onClick={handleSave} isLoading={saving}>{t('common.save')}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create User Modal - with role selection */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Novi Korisnik</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
              <FormControl flex={1} isRequired>
                <FormLabel>Ime</FormLabel>
                <Input value={createData.firstName} onChange={(e) => setCreateData({ ...createData, firstName: e.target.value })} />
              </FormControl>
              <FormControl flex={1} isRequired>
                <FormLabel>Prezime</FormLabel>
                <Input value={createData.lastName} onChange={(e) => setCreateData({ ...createData, lastName: e.target.value })} />
              </FormControl>
            </SimpleGrid>
            <FormControl mb={4} isRequired>
              <FormLabel>Korisničko ime</FormLabel>
              <Input
                value={createData.username}
                onChange={(e) => {
                  const value = e.target.value;
                  setIsUsernameManuallyEdited(value.trim().length > 0);
                  setCreateData({ ...createData, username: value });
                }}
              />
              {usernameStatus.loading && (
                <Text fontSize="xs" color="gray.500" mt={1}>Provjera dostupnosti...</Text>
              )}
              {!usernameStatus.loading && usernameStatus.available === true && (
                <Text fontSize="xs" color="green.600" mt={1}>Korisničko ime je dostupno.</Text>
              )}
              {!usernameStatus.loading && usernameStatus.available === false && (
                <Text fontSize="xs" color="red.600" mt={1}>Korisničko ime nije dostupno.</Text>
              )}
            </FormControl>
            {usernameStatus.suggestions.length > 0 && usernameStatus.available === false && (
              <Alert status="info" mb={4}>
                <AlertIcon />
                <HStack spacing={2}>
                  <Text fontSize="sm">Prijedlozi:</Text>
                  {usernameStatus.suggestions.map((item) => (
                    <Button
                      key={item}
                      size="xs"
                      onClick={() => {
                        setIsUsernameManuallyEdited(true);
                        setCreateData((prev) => ({ ...prev, username: item }));
                      }}
                    >
                      {item}
                    </Button>
                  ))}
                </HStack>
              </Alert>
            )}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
              <FormControl flex={1}>
                <FormLabel>Uloga</FormLabel>
                <Input value="CLIENT" isReadOnly />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Svi korisnici su klijenti. Dodatne role dodajte naknadno kroz listu korisnika.
                </Text>
              </FormControl>
            </SimpleGrid>
            <FormControl mb={4} isRequired>
              <FormLabel>Spol</FormLabel>
              <Select
                value={createData.gender}
                onChange={(e) =>
                  setCreateData({
                    ...createData,
                    gender: e.target.value as '' | 'MALE' | 'FEMALE',
                  })
                }
              >
                <option value="">Odaberite spol</option>
                <option value="FEMALE">Žensko</option>
                <option value="MALE">Muško</option>
              </Select>
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Avatar (opciono)</FormLabel>
              <Flex align="center" gap={3}>
                <Avatar size="lg" src={createData.avatar ? getUploadUrl(createData.avatar) : undefined} name={[createData.firstName, createData.lastName].filter(Boolean).join(' ')} bg="brand.100" />
                <Box>
                  <input type="file" accept="image/*" ref={avatarCreateRef} style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleUploadAvatarCreate(e.target.files[0])} />
                  <Button size="sm" onClick={() => avatarCreateRef.current?.click()} isLoading={uploadingAvatar}>{createData.avatar ? 'Promijeni avatar' : 'Dodaj avatar'}</Button>
                </Box>
              </Flex>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" size={{ base: 'sm', md: 'md' }} mr={3} onClick={onCreateClose}>{t('common.cancel')}</Button>
            <Button colorScheme="brand" size={{ base: 'sm', md: 'md' }} onClick={handleCreate} isLoading={saving}>{t('common.save')}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isCredentialsOpen} onClose={onCredentialsClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Kredencijali korisnika (prikaz jednom)</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Box>
                <Text fontSize="sm" color="gray.500">Korisničko ime</Text>
                <Text fontWeight="bold">{createdCredentials?.username}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500">Inicijalna lozinka</Text>
                <Text fontWeight="bold">{createdCredentials?.initialPassword}</Text>
              </Box>
              <Text fontSize="sm" color="orange.600">
                Sačuvajte ove podatke i proslijedite korisniku. Nakon prve prijave korisnik mora promijeniti lozinku.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onCredentialsClose} colorScheme="brand" size={{ base: 'sm', md: 'md' }}>U redu</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
