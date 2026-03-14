import { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Spinner, Text,
  Badge, IconButton, Flex, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Input, Button, useToast, Switch, Select,
  Menu, MenuButton, MenuList, MenuItem, InputGroup, InputLeftElement,
  HStack, Tag, TagLabel, TagCloseButton,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { EditIcon, DeleteIcon, AddIcon, SearchIcon, ViewIcon } from '@chakra-ui/icons';
import api from '../api/client';

interface UserRole { role: { name: string } }

interface UserRow {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  userRoles?: UserRole[];
}

const AVAILABLE_ROLES = ['SYSTEM_ADMIN', 'OWNER', 'STYLIST', 'CLIENT'] as const;
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
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  const [formData, setFormData] = useState({
    username: '', email: '', firstName: '', lastName: '', phone: '', isActive: true,
  });

  const [createData, setCreateData] = useState({
    username: '', email: '', password: '', firstName: '', lastName: '', phone: '', role: 'CLIENT' as string,
  });

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
    });
    onOpen();
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await api.patch(`/api/users/${editUser.id}`, formData);
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
    if (!createData.username || !createData.email || !createData.password || !createData.firstName || !createData.lastName || !createData.role) {
      toast({ title: 'Popunite sva obavezna polja', status: 'warning', isClosable: true });
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/users', createData);
      toast({ title: 'Korisnik kreiran', status: 'success', isClosable: true });
      loadData();
      onCreateClose();
      setCreateData({ username: '', email: '', password: '', firstName: '', lastName: '', phone: '', role: 'CLIENT' });
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast({ title: msg || 'Greška pri kreiranju', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

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
                <Tr><Td colSpan={7}><Text color="gray.500">{t('common.noData')}</Text></Td></Tr>
              ) : filteredUsers.map((u) => (
                <Tr key={u.id}>
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
                <FormLabel>Korisničko ime</FormLabel>
                <Input value={createData.username} onChange={(e) => setCreateData({ ...createData, username: e.target.value })} />
              </FormControl>
              <FormControl flex={1} isRequired>
                <FormLabel>Email</FormLabel>
                <Input type="email" value={createData.email} onChange={(e) => setCreateData({ ...createData, email: e.target.value })} />
              </FormControl>
            </Flex>
            <FormControl mb={4} isRequired>
              <FormLabel>Lozinka</FormLabel>
              <Input type="password" value={createData.password} onChange={(e) => setCreateData({ ...createData, password: e.target.value })} />
            </FormControl>
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
            <Flex gap={4} mb={4}>
              <FormControl flex={1}>
                <FormLabel>Telefon</FormLabel>
                <Input value={createData.phone} onChange={(e) => setCreateData({ ...createData, phone: e.target.value })} />
              </FormControl>
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
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>{t('common.cancel')}</Button>
            <Button colorScheme="brand" onClick={handleCreate} isLoading={saving}>{t('common.save')}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
