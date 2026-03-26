import { useEffect, useState, useCallback } from 'react';
import { useRef } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Spinner, Text,
  Badge, IconButton, Flex, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Input, Button, useToast, Switch, Select,
  Menu, MenuButton, MenuList, MenuItem, InputGroup, InputLeftElement,
  HStack, Tag, TagLabel, TagCloseButton, Avatar, Alert, AlertIcon, VStack,
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

/** Uloge koje admin može ručno dodavati/uklanjati. STYLIST se dodjeljuje automatski u Stylists modulu. */
const ROLES_MANAGED_IN_UI = ['SYSTEM_ADMIN', 'OWNER', 'CLIENT'] as const;
const roleColorMap: Record<string, string> = {
  SYSTEM_ADMIN: 'red', OWNER: 'purple', STYLIST: 'blue', CLIENT: 'green',
};

export default function Users() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const {
    isOpen: isCredentialsOpen,
    onOpen: onCredentialsOpen,
    onClose: onCredentialsClose,
  } = useDisclosure();
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  const [formData, setFormData] = useState({
    username: '', email: '', firstName: '', lastName: '', phone: '', isActive: true, avatar: '' as string | null,
  });

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
  const avatarEditRef = useRef<HTMLInputElement>(null);
  const avatarCreateRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    api.get<UserRow[]>('/api/users')
      .then((r) => setUsers(Array.isArray(r.data) ? r.data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.username.toLowerCase().includes(q) ||
      (u.email?.toLowerCase().includes(q)) ||
      (u.firstName?.toLowerCase().includes(q)) ||
      (u.lastName?.toLowerCase().includes(q));
  });

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setFormData({
      username: u.username,
      email: u.email ?? '',
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      phone: u.phone ?? '',
      isActive: u.isActive,
      avatar: u.avatar ?? null,
    });
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
    setSaving(true);
    try {
      await api.patch(`/api/users/${editUser.id}`, {
        ...formData,
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

  const getUserRoles = (u: UserRow): string[] => u.userRoles?.map((r) => r.role.name) ?? [];
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
        <HStack>
          <InputGroup maxW="250px">
            <InputLeftElement><SearchIcon color="gray.400" /></InputLeftElement>
            <Input placeholder="Pretraži..." value={search} onChange={(e) => setSearch(e.target.value)} bg="white" />
          </InputGroup>
          <Button leftIcon={<AddIcon />} colorScheme="brand" onClick={onCreateOpen}>Novi Korisnik</Button>
        </HStack>
      </Flex>

      <Box bg="white" rounded="lg" shadow="sm" overflow="auto">
        {loading ? (
          <Box p={6} textAlign="center"><Spinner size="lg" /></Box>
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
              {filteredUsers.length === 0 ? (
                <Tr><Td colSpan={8}><Text color="gray.500">{t('common.noData')}</Text></Td></Tr>
              ) : filteredUsers.map((u) => (
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

      {/* Edit User Modal - ALL fields editable */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Uredi Korisnika: {editUser?.username}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex gap={4} mb={4}>
              <FormControl flex={1}>
                <FormLabel>Korisničko ime</FormLabel>
                <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
              </FormControl>
              <FormControl flex={1}>
                <FormLabel>Email</FormLabel>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </FormControl>
            </Flex>
            <Flex gap={4} mb={4}>
              <FormControl flex={1}>
                <FormLabel>Ime</FormLabel>
                <Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
              </FormControl>
              <FormControl flex={1}>
                <FormLabel>Prezime</FormLabel>
                <Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
              </FormControl>
            </Flex>
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
            <Button variant="ghost" mr={3} onClick={onClose}>{t('common.cancel')}</Button>
            <Button colorScheme="brand" onClick={handleSave} isLoading={saving}>{t('common.save')}</Button>
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
            <Flex gap={4} mb={4}>
              <FormControl flex={1} isRequired>
                <FormLabel>Ime</FormLabel>
                <Input value={createData.firstName} onChange={(e) => setCreateData({ ...createData, firstName: e.target.value })} />
              </FormControl>
              <FormControl flex={1} isRequired>
                <FormLabel>Prezime</FormLabel>
                <Input value={createData.lastName} onChange={(e) => setCreateData({ ...createData, lastName: e.target.value })} />
              </FormControl>
            </Flex>
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
            <Flex gap={4} mb={4}>
              <FormControl flex={1} isRequired>
                <FormLabel>Uloga</FormLabel>
                <Select value={createData.role} onChange={(e) => setCreateData({ ...createData, role: e.target.value })}>
                  {ROLES_MANAGED_IN_UI.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </Select>
                <Text fontSize="xs" color="gray.500" mt={1}>Uloga Stylist se dodjeljuje u Stylists (dodaj korisnika kao stilista).</Text>
              </FormControl>
            </Flex>
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
            <Button variant="ghost" mr={3} onClick={onCreateClose}>{t('common.cancel')}</Button>
            <Button colorScheme="brand" onClick={handleCreate} isLoading={saving}>{t('common.save')}</Button>
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
            <Button onClick={onCredentialsClose} colorScheme="brand">U redu</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
