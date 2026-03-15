import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Spinner, Text,
  Badge, Flex, Select, Input, Button, useToast, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalCloseButton, ModalFooter, FormControl, FormLabel,
  NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Textarea, HStack,
  IconButton, Stat, StatLabel, StatNumber, SimpleGrid, Card, CardBody,
  InputGroup, InputLeftElement, List, ListItem, Link,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { AddIcon, CheckIcon, EditIcon, SearchIcon } from '@chakra-ui/icons';
import api from '../api/client';

interface DailyLogEntry {
  id: string;
  date: string;
  actualPrice: number | string;
  tipAmount: number | string;
  isManual: boolean;
  notes: string | null;
  status: string;
  completedAt: string | null;
  stylistProfile?: { id: string; user?: { username: string; firstName: string | null; lastName: string | null } };
  service?: { id: string; name: string };
  client?: { id: string; firstName: string | null; lastName: string | null; user?: { username: string } };
}

interface StylistOption {
  id: string;
  user?: { username: string; firstName: string | null; lastName: string | null };
}

interface ServiceOption {
  id: string;
  name: string;
  price: number | string;
}

interface ClientOption {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
}

export default function DailyLog() {
  const { t } = useTranslation();
  const toast = useToast();
  const [entries, setEntries] = useState<DailyLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [stylistFilter, setStylistFilter] = useState('');

  const [stylists, setStylists] = useState<StylistOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    stylistProfileId: '', serviceId: '', clientId: '', date: new Date().toISOString().slice(0, 10),
    actualPrice: 0, tipAmount: 0, notes: '', isManual: true,
  });

  // Autocomplete state
  const [serviceSearch, setServiceSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (stylistFilter) params.stylistProfileId = stylistFilter;
    api.get<DailyLogEntry[]>('/api/daily-log', { params })
      .then((r) => setEntries(Array.isArray(r.data) ? r.data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [fromDate, toDate, stylistFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    api.get<StylistOption[]>('/api/stylists').then((r) => setStylists(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get<ServiceOption[]>('/api/services?activeOnly=true').then((r) => setServices(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get<ClientOption[]>('/api/users').then((r) => setClients(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const totalRevenue = entries.reduce((sum, e) => sum + Number(e.actualPrice || 0), 0);
  const totalTips = entries.reduce((sum, e) => sum + Number(e.tipAmount || 0), 0);
  const completedCount = entries.filter((e) => e.status === 'COMPLETED').length;

  const filteredServices = useMemo(() => {
    if (!serviceSearch) return services;
    const q = serviceSearch.toLowerCase();
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, serviceSearch]);

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.slice(0, 20);
    const q = clientSearch.toLowerCase();
    return clients.filter((c) =>
      c.username.toLowerCase().includes(q) ||
      (c.firstName?.toLowerCase().includes(q)) ||
      (c.lastName?.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [clients, clientSearch]);

  const selectService = (svc: ServiceOption) => {
    setForm((prev) => ({ ...prev, serviceId: svc.id, actualPrice: Number(svc.price) || 0 }));
    setServiceSearch(svc.name);
    setShowServiceDropdown(false);
  };

  const selectClient = (client: ClientOption) => {
    setForm((prev) => ({ ...prev, clientId: client.id }));
    const name = [client.firstName, client.lastName].filter(Boolean).join(' ') || client.username;
    setClientSearch(name);
    setShowClientDropdown(false);
  };

  const openCreateForm = () => {
    setEditId(null);
    setForm({
      stylistProfileId: '', serviceId: '', clientId: '', date: new Date().toISOString().slice(0, 10),
      actualPrice: 0, tipAmount: 0, notes: '', isManual: true,
    });
    setServiceSearch('');
    setClientSearch('');
    onOpen();
  };

  const openEditForm = (entry: DailyLogEntry) => {
    setEditId(entry.id);
    setForm({
      stylistProfileId: entry.stylistProfile?.id ?? '',
      serviceId: entry.service?.id ?? '',
      clientId: entry.client?.id ?? '',
      date: entry.date?.slice(0, 10) ?? '',
      actualPrice: Number(entry.actualPrice),
      tipAmount: Number(entry.tipAmount),
      notes: entry.notes ?? '',
      isManual: entry.isManual,
    });
    setServiceSearch(entry.service?.name ?? '');
    const clientName = entry.client ? [entry.client.firstName, entry.client.lastName].filter(Boolean).join(' ') || entry.client.user?.username || '' : '';
    setClientSearch(clientName);
    onOpen();
  };

  const handleSave = async () => {
    if (!form.stylistProfileId || !form.serviceId) {
      toast({ title: 'Odaberite stilistu i servis', status: 'warning', isClosable: true });
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/api/daily-log/${editId}`, {
          actualPrice: form.actualPrice,
          tipAmount: form.tipAmount,
          notes: form.notes || undefined,
        });
      } else {
        await api.post('/api/daily-log', {
          stylistProfileId: form.stylistProfileId,
          serviceId: form.serviceId,
          clientId: form.clientId || undefined,
          date: form.date,
          actualPrice: form.actualPrice,
          tipAmount: form.tipAmount,
          notes: form.notes || undefined,
          isManual: true,
        });
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

  const handleComplete = async (id: string) => {
    try {
      await api.post(`/api/daily-log/${id}/complete`);
      toast({ title: 'Unos kompletiran i prihod dodan u knjigu', status: 'success', isClosable: true });
      loadData();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    }
  };

  const getStylistName = (s?: StylistOption | DailyLogEntry['stylistProfile']) => {
    if (!s?.user) return '-';
    return `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim() || s.user.username;
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg">{t('nav.dailyLog')}</Heading>
        <Button leftIcon={<AddIcon />} colorScheme="brand" onClick={openCreateForm}>Novi Unos</Button>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={4}>
        <Card><CardBody><Stat><StatLabel>Ukupno prihoda</StatLabel><StatNumber>{totalRevenue.toFixed(2)} KM</StatNumber></Stat></CardBody></Card>
        <Card><CardBody><Stat><StatLabel>Ukupno napojnica</StatLabel><StatNumber>{totalTips.toFixed(2)} KM</StatNumber></Stat></CardBody></Card>
        <Card><CardBody><Stat><StatLabel>Kompletirano</StatLabel><StatNumber>{completedCount} / {entries.length}</StatNumber></Stat></CardBody></Card>
      </SimpleGrid>

      <Flex gap={3} mb={4} wrap="wrap" bg="white" p={4} rounded="lg" shadow="sm">
        <Box><Text fontSize="xs" color="gray.500" mb={1}>Od datuma</Text><Input type="date" size="sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></Box>
        <Box><Text fontSize="xs" color="gray.500" mb={1}>Do datuma</Text><Input type="date" size="sm" value={toDate} onChange={(e) => setToDate(e.target.value)} /></Box>
        <Box><Text fontSize="xs" color="gray.500" mb={1}>Stilista</Text>
          <Select size="sm" value={stylistFilter} onChange={(e) => setStylistFilter(e.target.value)}>
            <option value="">Svi stilisti</option>
            {stylists.map((s) => <option key={s.id} value={s.id}>{getStylistName(s)}</option>)}
          </Select>
        </Box>
        <Flex align="flex-end">
          <Button size="sm" variant="outline" onClick={() => { setFromDate(''); setToDate(''); setStylistFilter(''); }}>Resetuj</Button>
        </Flex>
      </Flex>

      <Box bg="white" rounded="lg" shadow="sm" overflow="auto">
        {loading ? <Box p={6} textAlign="center"><Spinner size="lg" /></Box> : (
          <Table size="sm">
            <Thead>
              <Tr><Th>Datum</Th><Th>Stilista</Th><Th>Servis</Th><Th>Klijent</Th><Th isNumeric>Cijena</Th><Th isNumeric>Napojnica</Th><Th>Izvor</Th><Th>Status</Th><Th textAlign="right">Akcije</Th></Tr>
            </Thead>
            <Tbody>
              {entries.length === 0 ? (
                <Tr><Td colSpan={9}><Text color="gray.500">{t('common.noData')}</Text></Td></Tr>
              ) : entries.map((e) => (
                <Tr key={e.id}>
                  <Td>{e.date?.slice(0, 10)}</Td>
                  <Td>
                    {e.stylistProfile?.id ? (
                      <Link as={RouterLink} to={`/admin/stylist-analytics?stylistId=${e.stylistProfile.id}`} color="brand.600" _hover={{ textDecoration: 'underline' }}>
                        {getStylistName(e.stylistProfile)}
                      </Link>
                    ) : (
                      getStylistName(e.stylistProfile)
                    )}
                  </Td>
                  <Td>{e.service?.name ?? '-'}</Td>
                  <Td>
                    {e.client ? (
                      <Link as={RouterLink} to={`/admin/client-analytics?userId=${e.client.id}`} color="brand.600" _hover={{ textDecoration: 'underline' }}>
                        {[e.client.firstName, e.client.lastName].filter(Boolean).join(' ') || e.client.user?.username || '-'}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </Td>
                  <Td isNumeric fontWeight="medium">{Number(e.actualPrice).toFixed(2)}</Td>
                  <Td isNumeric>{Number(e.tipAmount).toFixed(2)}</Td>
                  <Td><Badge colorScheme={e.isManual ? 'orange' : 'blue'} variant="subtle">{e.isManual ? 'Ručno' : 'Rezervacija'}</Badge></Td>
                  <Td><Badge colorScheme={e.status === 'COMPLETED' ? 'green' : 'yellow'}>{e.status === 'COMPLETED' ? 'Kompletiran' : 'Na čekanju'}</Badge></Td>
                  <Td textAlign="right">
                    <HStack spacing={1} justify="flex-end">
                      <IconButton aria-label="Uredi" icon={<EditIcon />} size="xs" variant="ghost" colorScheme="blue" onClick={() => openEditForm(e)} />
                      {e.status !== 'COMPLETED' && (
                        <IconButton aria-label="Kompletiraj" icon={<CheckIcon />} size="xs" variant="ghost" colorScheme="green" onClick={() => handleComplete(e.id)} />
                      )}
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editId ? 'Uredi Unos' : 'Novi Unos u Dnevnu Knjigu'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {!editId && (
              <>
                <FormControl mb={4} isRequired>
                  <FormLabel>Stilista</FormLabel>
                  <Select placeholder="Odaberite stilistu" value={form.stylistProfileId} onChange={(e) => setForm({ ...form, stylistProfileId: e.target.value })}>
                    {stylists.map((s) => <option key={s.id} value={s.id}>{getStylistName(s)}</option>)}
                  </Select>
                </FormControl>

                <FormControl mb={4} isRequired>
                  <FormLabel>Servis</FormLabel>
                  <Box position="relative">
                    <InputGroup>
                      <InputLeftElement pointerEvents="none"><SearchIcon color="gray.400" /></InputLeftElement>
                      <Input
                        value={serviceSearch}
                        onChange={(e) => { setServiceSearch(e.target.value); setShowServiceDropdown(true); setForm((prev) => ({ ...prev, serviceId: '' })); }}
                        onFocus={() => setShowServiceDropdown(true)}
                        placeholder="Pretražite servis..."
                      />
                    </InputGroup>
                    {showServiceDropdown && filteredServices.length > 0 && (
                      <List position="absolute" zIndex={10} bg="white" border="1px" borderColor="gray.200" rounded="md" shadow="lg" maxH="200px" overflowY="auto" w="100%" mt={1}>
                        {filteredServices.map((svc) => (
                          <ListItem key={svc.id} px={3} py={2} cursor="pointer" _hover={{ bg: 'brand.50' }}
                            onClick={() => selectService(svc)}>
                            <Flex justify="space-between">
                              <Text fontSize="sm">{svc.name}</Text>
                              <Text fontSize="sm" color="gray.500">{Number(svc.price).toFixed(2)} KM</Text>
                            </Flex>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                  {form.serviceId && <Text fontSize="xs" color="green.600" mt={1}>Odabrano: {serviceSearch}</Text>}
                </FormControl>

                <FormControl mb={4}>
                  <FormLabel>Klijent</FormLabel>
                  <Box position="relative">
                    <InputGroup>
                      <InputLeftElement pointerEvents="none"><SearchIcon color="gray.400" /></InputLeftElement>
                      <Input
                        value={clientSearch}
                        onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); setForm((prev) => ({ ...prev, clientId: '' })); }}
                        onFocus={() => setShowClientDropdown(true)}
                        placeholder="Pretražite klijenta..."
                      />
                    </InputGroup>
                    {showClientDropdown && filteredClients.length > 0 && (
                      <List position="absolute" zIndex={10} bg="white" border="1px" borderColor="gray.200" rounded="md" shadow="lg" maxH="200px" overflowY="auto" w="100%" mt={1}>
                        {filteredClients.map((c) => (
                          <ListItem key={c.id} px={3} py={2} cursor="pointer" _hover={{ bg: 'brand.50' }}
                            onClick={() => selectClient(c)}>
                            <Text fontSize="sm">{[c.firstName, c.lastName].filter(Boolean).join(' ') || c.username}</Text>
                            <Text fontSize="xs" color="gray.500">{c.username}</Text>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                  {form.clientId && <Text fontSize="xs" color="green.600" mt={1}>Odabrano: {clientSearch}</Text>}
                </FormControl>

                <FormControl mb={4} isRequired>
                  <FormLabel>Datum</FormLabel>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </FormControl>
              </>
            )}
            <Flex gap={4} mb={4}>
              <FormControl flex={1} isRequired>
                <FormLabel>Cijena (KM)</FormLabel>
                <NumberInput value={form.actualPrice} onChange={(_, v) => setForm({ ...form, actualPrice: v || 0 })} min={0} precision={2}>
                  <NumberInputField /><NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                </NumberInput>
              </FormControl>
              <FormControl flex={1}>
                <FormLabel>Napojnica (KM)</FormLabel>
                <NumberInput value={form.tipAmount} onChange={(_, v) => setForm({ ...form, tipAmount: v || 0 })} min={0} precision={2}>
                  <NumberInputField /><NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                </NumberInput>
              </FormControl>
            </Flex>
            <FormControl>
              <FormLabel>Bilješke</FormLabel>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>{t('common.cancel')}</Button>
            <Button colorScheme="brand" onClick={handleSave} isLoading={saving}>{t('common.save')}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
