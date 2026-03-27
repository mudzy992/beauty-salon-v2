import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRef } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Spinner, Text,
  Badge, IconButton, Flex, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Input, Button, useToast, Switch, Select,
  Menu, MenuButton, MenuList, MenuItem, InputGroup, InputLeftElement,
  HStack, Tag, TagLabel, TagCloseButton, Avatar, Alert, AlertIcon, VStack,
  useBreakpointValue, SimpleGrid,
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

/** Uloge koje admin može ručno dodavati/uklanjati. STYLIST se dodjeljuje automatski u Stylists modulu. */
const ROLES_MANAGED_IN_UI = ['SYSTEM_ADMIN', 'OWNER', 'CLIENT'] as const;
const roleColorMap: Record<string, string> = {
  SYSTEM_ADMIN: 'red', OWNER: 'purple', STYLIST: 'blue', CLIENT: 'green',
};
const rolePriority: Record<string, number> = {
  SYSTEM_ADMIN: 0,
  OWNER: 0,
  STYLIST: 1,
  CLIENT: 2,
};

export default function Users() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
    api
      .get<UserRow[] | PaginatedResponse<UserRow>>('/api/users', {
        params: { page, pageSize },
      })
      .then((r) => {
        if (Array.isArray(r.data)) {
          setUsers(r.data);
          setTotal(r.data.length);
          return;
        }
        setUsers(Array.isArray(r.data.items) ? r.data.items : []);
        setTotal(r.data.total ?? 0);
      })
      .catch(() => {
        setUsers([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getUserRoles = useCallback((u: UserRow): string[] => u.userRoles?.map((r) => r.role.name) ?? [], []);
  const sortedAndFilteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = users.filter((u) => {
      if (!q) return true;
      return u.username.toLowerCase().includes(q) ||
        (u.email?.toLowerCase().includes(q)) ||
        (u.firstName?.toLowerCase().includes(q)) ||
        (u.lastName?.toLowerCase().includes(q));
    });
    return filtered.sort((a, b) => {
      const aRoles = getUserRoles(a);
      const bRoles = getUserRoles(b);
      const aRoleRank = Math.min(...(aRoles.map((role) => rolePriority[role] ?? 99)), 99);
      const bRoleRank = Math.min(...(bRoles.map((role) => rolePriority[role] ?? 99)), 99);
      if (aRoleRank !== bRoleRank) return aRoleRank - bRoleRank;
      const aFirst = (a.firstName ?? '').toLowerCase();
      const bFirst = (b.firstName ?? '').toLowerCase();
      if (aFirst !== bFirst) return aFirst.localeCompare(bFirst, 'bs');
      const aLast = (a.lastName ?? '').toLowerCase();
      const bLast = (b.lastName ?? '').toLowerCase();
      if (aLast !== bLast) return aLast.localeCompare(bLast, 'bs');
      return a.username.localeCompare(b.username, 'bs');
    });
  }, [users, search, getUserRoles]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    setPage(0);
  }, [search]);

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    const baseUsername = normalizeUsernameFromNames(u.firstName ?? '', u.lastName ?? '');
    setFormData({
      username: u.username,
      email: u.email ?? '',
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      phone: u.phone ?? '',
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
    const timeout = setTimeout(async () => {
      setEditUsernameStatus((prev) => ({ ...prev, loading: true }));
      try {
        const { data } = await api.get('/api/users/username-availability', {
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
    setSaving(true);
    try {
      const response = await api.post('/api/users', {
        ...createData,
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
      setCreateData({ username: '', firstName: '', lastName: '', role: 'CLIENT', avatar: '' });
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
      toast({ title: `Uloga ${roleName} dodijeljena`, status: 'success', isClosable: true });
      loadData();
    } catch {
      toast({ title: 'Greška pri dodjeli uloge', status: 'error', isClosable: true });
    }
  };

  const handleRemoveRole = async (userId: string, roleName: string) => {
    if (!window.confirm(`Ukloniti ulogu ${roleName}?`)) return;
    try {
      await api.delete(`/api/users/${userId}/roles/${roleName}`);
      toast({ title: `Uloga ${roleName} uklonjena`, status: 'success', isClosable: true });
      loadData();
    } catch {
      toast({ title: 'Greška pri uklanjanju uloge', status: 'error', isClosable: true });
    }
  };

  /** Uloge koje admin može dodati (isključeno STYLIST – dodaje se u Stylists). */
  const getAvailableRolesToAssign = (u: UserRow) => {
    const current = getUserRoles(u);
    return ROLES_MANAGED_IN_UI.filter((r) => !current.includes(r));
  };
  const canRemoveRole = (roleName: string) => ROLES_MANAGED_IN_UI.includes(roleName as any);

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Heading size="lg">{t('nav.users')}</Heading>
        <Flex w={{ base: 'full', md: 'auto' }} gap={2} direction={{ base: 'column', sm: 'row' }}>
          <InputGroup maxW={{ base: 'full', md: '250px' }}>
            <InputLeftElement><SearchIcon color="gray.400" /></InputLeftElement>
            <Input placeholder="Pretraži..." value={search} onChange={(e) => setSearch(e.target.value)} bg="white" />
          </InputGroup>
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

      <Box bg="white" rounded="lg" shadow="sm" overflow="auto">
        {loading ? (
          <Box p={6} textAlign="center"><Spinner size="lg" /></Box>
        ) : isMobile ? (
          <VStack align="stretch" spacing={3} p={3}>
            {sortedAndFilteredUsers.length === 0 ? (
              <Text color="gray.500">{t('common.noData')}</Text>
            ) : sortedAndFilteredUsers.map((u) => (
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
                      ) : (
                        <TagLabel
                          as="span"
                          color="gray.500"
                          ml={1}
                          title="Dodaje se/uklanja u Stylists"
                        >
                          *
                        </TagLabel>
                      )}
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
            ))}
          </VStack>
        ) : (
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
              {sortedAndFilteredUsers.length === 0 ? (
                <Tr><Td colSpan={8}><Text color="gray.500">{t('common.noData')}</Text></Td></Tr>
              ) : sortedAndFilteredUsers.map((u) => (
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
                          ) : (
                            <TagLabel as="span" fontSize="xs" color="gray.500" ml={1} title="Dodaje se/uklanja u Stylists">*</TagLabel>
                          )}
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
              ))}
            </Tbody>
          </Table>
        )}
      </Box>
      <Flex justify="space-between" align="center" mt={4}>
        <Text fontSize="sm" color="gray.500">
          Ukupno: {total}
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
              <FormControl flex={1} isRequired>
                <FormLabel>Uloga</FormLabel>
                <Select value={createData.role} onChange={(e) => setCreateData({ ...createData, role: e.target.value })}>
                  {ROLES_MANAGED_IN_UI.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
                <Text fontSize="xs" color="gray.500" mt={1}>Uloga Stylist se dodjeljuje u Stylists (dodaj korisnika kao stilista).</Text>
              </FormControl>
            </SimpleGrid>
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
