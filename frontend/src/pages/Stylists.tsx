import { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Spinner, Text,
  Badge, IconButton, Flex, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  FormControl, FormLabel, Input, Button, useToast, Switch, Select,
  Tabs, TabList, Tab, TabPanels, TabPanel, Textarea,
  Checkbox, VStack, Link, HStack, Wrap, WrapItem, Tag, TagLabel,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { AddIcon, EditIcon, ViewIcon } from '@chakra-ui/icons';
import api from '../api/client';

interface StylistProfile {
  id: string;
  userId: string;
  bio: string | null;
  specialization: string | null;
  status?: 'PENDING' | 'ACTIVE' | string | null;
  isActive: boolean;
  hireDate: string | null;
  user?: { username: string; email: string | null; firstName: string | null; lastName: string | null };
}

interface WorkingHours {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorkingDay: boolean;
}

interface ServiceOption {
  id: string;
  name: string;
  subcategory?: { name: string; category?: { name: string } };
}

interface UserOption {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const DAYS = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'];

export default function Stylists() {
  const { t } = useTranslation();
  const toast = useToast();
  const [stylists, setStylists] = useState<StylistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDetailOpen, onOpen: onDetailOpen, onClose: onDetailClose } = useDisclosure();
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedStylist, setSelectedStylist] = useState<StylistProfile | null>(null);

  const [users, setUsers] = useState<UserOption[]>([]);
  const [allServices, setAllServices] = useState<ServiceOption[]>([]);

  const [form, setForm] = useState({
    userId: '', bio: '', specialization: '', isActive: true, hireDate: '', serviceIds: [] as string[],
  });

  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [stylistServiceIds, setStylistServiceIds] = useState<string[]>([]);

  const loadData = useCallback(() => {
    setLoading(true);
    api
      .get<StylistProfile[] | PaginatedResponse<StylistProfile>>('/api/stylists', {
        params: { page, pageSize },
      })
      .then((r) => {
        if (Array.isArray(r.data)) {
          setStylists(r.data);
          setTotal(r.data.length);
          return;
        }
        setStylists(Array.isArray(r.data.items) ? r.data.items : []);
        setTotal(r.data.total ?? 0);
      })
      .catch(() => {
        setStylists([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize]);

  const loadUsers = useCallback(() => {
    api
      .get<UserOption[] | PaginatedResponse<UserOption>>('/api/users', {
        params: { page: 0, pageSize: 200 },
      })
      .then((r) => {
        if (Array.isArray(r.data)) {
          setUsers(r.data);
          return;
        }
        setUsers(Array.isArray(r.data.items) ? r.data.items : []);
      })
      .catch(() => {});
  }, []);

  const loadAllServices = useCallback(() => {
    api
      .get<ServiceOption[] | PaginatedResponse<ServiceOption>>('/api/services', {
        params: { page: 0, pageSize: 300 },
      })
      .then((r) => {
        if (Array.isArray(r.data)) {
          setAllServices(r.data);
          return;
        }
        setAllServices(Array.isArray(r.data.items) ? r.data.items : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { loadData(); loadUsers(); loadAllServices(); }, [loadData, loadUsers, loadAllServices]);

  const openCreateForm = () => {
    setEditId(null);
    setForm({ userId: '', bio: '', specialization: '', isActive: true, hireDate: '', serviceIds: [] });
    onOpen();
  };

  const openEditForm = (s: StylistProfile) => {
    setEditId(s.id);
    setForm({
      userId: s.userId,
      bio: s.bio ?? '',
      specialization: s.specialization ?? '',
      isActive: s.isActive,
      hireDate: s.hireDate?.slice(0, 10) ?? '',
      serviceIds: [],
    });
    api
      .get<{ serviceId: string }[]>(`/api/stylists/${s.id}/services`)
      .then((r) => {
        const ids = Array.isArray(r.data) ? r.data.map((x: any) => x.serviceId ?? x.id).filter(Boolean) : [];
        setForm((prev) => ({ ...prev, serviceIds: ids }));
      })
      .catch(() => {});
    onOpen();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        bio: form.bio || undefined,
        specialization: form.specialization || undefined,
        isActive: form.isActive,
      };
      if (form.hireDate) payload.hireDate = form.hireDate;

      if (editId) {
        await api.patch(`/api/stylists/${editId}`, payload);
      } else {
        if (!form.userId) { toast({ title: 'Odaberite korisnika', status: 'warning', isClosable: true }); setSaving(false); return; }
        const createPayload: Record<string, unknown> = { ...payload, userId: form.userId };
        if (form.serviceIds.length > 0) createPayload.serviceIds = form.serviceIds;
        await api.post('/api/stylists', createPayload);
      }
      toast({ title: 'Sačuvano', status: 'success', isClosable: true });
      loadData();
      onClose();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (s: StylistProfile) => {
    setSelectedStylist(s);
    try {
      const [whRes, svcRes] = await Promise.all([
        api.get<WorkingHours[]>(`/api/stylists/${s.id}/working-hours`),
        api.get<{ serviceId: string }[]>(`/api/stylists/${s.id}/services`),
      ]);
      const existing = Array.isArray(whRes.data) ? whRes.data : [];
      const full: WorkingHours[] = Array.from({ length: 7 }, (_, i) => {
        const found = existing.find((w) => w.dayOfWeek === i);
        return found ?? { dayOfWeek: i, startTime: '09:00', endTime: '17:00', isWorkingDay: i >= 1 && i <= 5 };
      });
      setWorkingHours(full);
      const ids = Array.isArray(svcRes.data) ? svcRes.data.map((x: any) => x.serviceId ?? x.id) : [];
      setStylistServiceIds(ids);
    } catch {
      setWorkingHours(Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i, startTime: '09:00', endTime: '17:00', isWorkingDay: i >= 1 && i <= 5,
      })));
      setStylistServiceIds([]);
    }
    onDetailOpen();
  };

  const updateWH = (day: number, field: keyof WorkingHours, value: string | boolean) => {
    setWorkingHours((prev) => prev.map((w) => (w.dayOfWeek === day ? { ...w, [field]: value } : w)));
  };

  const handleSaveWorkingHours = async () => {
    if (!selectedStylist) return;
    setSaving(true);
    try {
      await api.post(`/api/stylists/${selectedStylist.id}/working-hours`, { workingHours });
      toast({ title: 'Radno vrijeme sačuvano', status: 'success', isClosable: true });
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveServices = async () => {
    if (!selectedStylist) return;
    setSaving(true);
    try {
      await api.post(`/api/stylists/${selectedStylist.id}/services`, { serviceIds: stylistServiceIds });
      toast({ title: 'Kompetencije sačuvane', status: 'success', isClosable: true });
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const toggleService = (svcId: string) => {
    setStylistServiceIds((prev) =>
      prev.includes(svcId) ? prev.filter((id) => id !== svcId) : [...prev, svcId]
    );
  };

  const existingStylistUserIds = stylists.map((s) => s.userId);
  const availableUsers = users.filter((u) => !existingStylistUserIds.includes(u.id) || u.id === form.userId);
  const selectedServices = allServices.filter((s) => form.serviceIds.includes(s.id));
  const unselectedServices = allServices.filter((s) => !form.serviceIds.includes(s.id));

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">{t('nav.stylists')}</Heading>
        <Button leftIcon={<AddIcon />} colorScheme="brand" onClick={openCreateForm}>
          Novi Stilista
        </Button>
      </Flex>

      <Box bg="white" rounded="lg" shadow="sm" overflow="auto">
        {loading ? (
          <Box p={6} textAlign="center"><Spinner size="lg" /></Box>
        ) : (
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Korisnik</Th>
                <Th>Email</Th>
                <Th>Specijalizacija</Th>
                <Th>Datum zaposlenja</Th>
                <Th>Status</Th>
                <Th textAlign="right">Akcije</Th>
              </Tr>
            </Thead>
            <Tbody>
              {stylists.length === 0 ? (
                <Tr><Td colSpan={6}><Text color="gray.500">{t('common.noData')}</Text></Td></Tr>
              ) : (
                stylists.map((s) => (
                  <Tr key={s.id} cursor="pointer" _hover={{ bg: 'gray.50' }} onClick={() => openDetail(s)}>
                    <Td fontWeight="medium">
                      {s.user ? `${s.user.firstName ?? ''} ${s.user.lastName ?? ''} (${s.user.username})`.trim() : s.userId}
                    </Td>
                    <Td>{s.user?.email ?? '-'}</Td>
                    <Td>
                      <HStack spacing={2}>
                        <Text>{s.specialization ?? '-'}</Text>
                        {String(s.status ?? '').toUpperCase() === 'PENDING' && (
                          <Badge colorScheme="yellow">Pending</Badge>
                        )}
                      </HStack>
                    </Td>
                    <Td>{s.hireDate?.slice(0, 10) ?? '-'}</Td>
                    <Td>
                      <Badge colorScheme={s.isActive ? 'green' : 'red'}>
                        {s.isActive ? 'Aktivan' : 'Neaktivan'}
                      </Badge>
                    </Td>
                    <Td textAlign="right" onClick={(e) => e.stopPropagation()}>
                      <HStack spacing={1} justify="flex-end">
                        <Link as={RouterLink} to={`/admin/stylist-analytics?stylistId=${s.id}`}>
                          <IconButton aria-label="Analitika" icon={<ViewIcon />} size="sm" variant="ghost" colorScheme="teal" />
                        </Link>
                        <IconButton aria-label="Uredi" icon={<EditIcon />} size="sm" variant="ghost" colorScheme="blue" onClick={() => openEditForm(s)} />
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        )}
      </Box>
      <Flex justify="space-between" align="center" mt={4}>
        <Text fontSize="sm" color="gray.500">Ukupno: {total}</Text>
        <HStack>
          <Button size="sm" variant="outline" isDisabled={page <= 0} onClick={() => setPage((prev) => Math.max(0, prev - 1))}>
            Prethodna
          </Button>
          <Text fontSize="sm">{page + 1} / {Math.max(1, Math.ceil(total / pageSize))}</Text>
          <Button size="sm" variant="outline" isDisabled={page >= Math.ceil(total / pageSize) - 1} onClick={() => setPage((prev) => prev + 1)}>
            Sljedeća
          </Button>
        </HStack>
      </Flex>

      {/* Create / Edit Stylist Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editId ? 'Uredi Stilistu' : 'Novi Stilista'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {!editId && (
              <FormControl mb={4} isRequired>
                <FormLabel>Korisnik</FormLabel>
                <Select placeholder="Odaberite korisnika" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.email ?? 'bez emaila'})
                    </option>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControl mb={4}>
              <FormLabel>Specijalizacija (odaberite servise)</FormLabel>
              {selectedServices.length > 0 && (
                <Box mb={2}>
                  <Text fontSize="xs" color="gray.600" mb={1}>Odabrano</Text>
                  <Wrap>
                    {selectedServices.map((svc) => (
                      <WrapItem key={svc.id}>
                        <Tag size="sm" colorScheme="brand" variant="subtle">
                          <TagLabel>{svc.name}</TagLabel>
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                </Box>
              )}
              <VStack align="stretch" maxH="200px" overflowY="auto" border="1px" borderColor="gray.200" rounded="md" p={2}>
                {allServices.length === 0 ? (
                  <Text fontSize="sm" color="gray.500">Nema dostupnih servisa.</Text>
                ) : unselectedServices.map((svc) => (
                  <Checkbox
                    key={svc.id}
                    isChecked={form.serviceIds.includes(svc.id)}
                    onChange={(e) => {
                      const newIds = e.target.checked
                        ? [...form.serviceIds, svc.id]
                        : form.serviceIds.filter((id) => id !== svc.id);
                      const specNames = allServices.filter((s) => newIds.includes(s.id)).map((s) => s.name);
                      setForm({ ...form, serviceIds: newIds, specialization: specNames.join(', ') });
                    }}
                    colorScheme="brand"
                    size="sm"
                  >
                    {svc.name}
                  </Checkbox>
                ))}
              </VStack>
              {form.specialization && (
                <Text fontSize="xs" color="gray.500" mt={1}>Specijalizacija: {form.specialization}</Text>
              )}
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Bio</FormLabel>
              <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
            </FormControl>
            <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
              <FormControl flex={1}>
                <FormLabel>Datum zaposlenja</FormLabel>
                <Input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
              </FormControl>
              <FormControl flex={1} display="flex" alignItems="flex-end" pb={1}>
                <FormLabel mb="0" mr={3}>Aktivan</FormLabel>
                <Switch isChecked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} colorScheme="brand" />
              </FormControl>
            </Flex>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>{t('common.cancel')}</Button>
            <Button colorScheme="brand" onClick={handleSave} isLoading={saving}>{t('common.save')}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Detail Modal (Working hours + Services) */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedStylist?.user
              ? `${selectedStylist.user.firstName ?? ''} ${selectedStylist.user.lastName ?? ''} (${selectedStylist.user.username})`
              : 'Detalji Stiliste'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs>
              <TabList>
                <Tab>Radno Vrijeme</Tab>
                <Tab>Kompetencije (Servisi)</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  <Box overflowX="auto">
                    <Table size="sm" mb={4}>
                    <Thead>
                      <Tr>
                        <Th>Dan</Th>
                        <Th>Radni dan</Th>
                        <Th>Početak</Th>
                        <Th>Kraj</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {workingHours.map((wh) => (
                        <Tr key={wh.dayOfWeek} opacity={wh.isWorkingDay ? 1 : 0.5}>
                          <Td fontWeight="medium">{DAYS[wh.dayOfWeek]}</Td>
                          <Td>
                            <Switch isChecked={wh.isWorkingDay} onChange={(e) => updateWH(wh.dayOfWeek, 'isWorkingDay', e.target.checked)} colorScheme="brand" />
                          </Td>
                          <Td>
                            <Input type="time" size="sm" w={{ base: 'full', md: '130px' }} value={wh.startTime} onChange={(e) => updateWH(wh.dayOfWeek, 'startTime', e.target.value)} isDisabled={!wh.isWorkingDay} />
                          </Td>
                          <Td>
                            <Input type="time" size="sm" w={{ base: 'full', md: '130px' }} value={wh.endTime} onChange={(e) => updateWH(wh.dayOfWeek, 'endTime', e.target.value)} isDisabled={!wh.isWorkingDay} />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                    </Table>
                  </Box>
                  <Button colorScheme="brand" onClick={handleSaveWorkingHours} isLoading={saving}>
                    Sačuvaj Radno Vrijeme
                  </Button>
                </TabPanel>
                <TabPanel>
                  <Text fontSize="sm" color="gray.600" mb={3}>
                    Označite servise koje ovaj stilista može obavljati:
                  </Text>
                  <VStack align="stretch" spacing={2} maxH="400px" overflowY="auto">
                    {allServices.map((svc) => (
                      <Checkbox
                        key={svc.id}
                        isChecked={stylistServiceIds.includes(svc.id)}
                        onChange={() => toggleService(svc.id)}
                        colorScheme="brand"
                      >
                        <Text fontSize="sm">
                          <Text as="span" fontWeight="medium">{svc.name}</Text>
                          {svc.subcategory && (
                            <Text as="span" color="gray.500" ml={1}>
                              ({svc.subcategory.category?.name} &gt; {svc.subcategory.name})
                            </Text>
                          )}
                        </Text>
                      </Checkbox>
                    ))}
                    {allServices.length === 0 && <Text color="gray.500" fontSize="sm">Nema dostupnih servisa.</Text>}
                  </VStack>
                  <Button colorScheme="brand" mt={4} onClick={handleSaveServices} isLoading={saving}>
                    Sačuvaj Kompetencije
                  </Button>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onDetailClose}>Zatvori</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
