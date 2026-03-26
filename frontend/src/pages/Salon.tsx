import { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, Spinner, Text, Button, FormControl, FormLabel, Input,
  VStack, useToast, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Tabs, TabList, Tab,
  TabPanels, TabPanel, Table, Thead, Tbody, Tr, Th, Td, Switch, Flex,
  Textarea, IconButton, useDisclosure, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Badge, HStack,
  Alert, AlertIcon, AlertDescription,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { AddIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';
import api from '../api/client';
import { useSocketEvent } from '../context/SocketContext';

interface SalonSettings {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  logo: string | null;
  pauseBetweenServices: number;
  cancellationDeadlineHours: number;
  maxCancellationsBeforePenalty: number;
  penaltyDurationDays: number;
  workingHours?: WorkingHours[];
  holidays?: Holiday[];
}

interface WorkingHours {
  id?: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isWorkingDay: boolean;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
  message: string | null;
  sendPush: boolean;
  pushSentAt: string | null;
}

const DAYS = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'];

export default function Salon() {
  const { t } = useTranslation();
  const toast = useToast();
  const [salon, setSalon] = useState<SalonSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noSalonExists, setNoSalonExists] = useState(false);

  const [formData, setFormData] = useState({
    name: '', address: '', phone: '', email: '', description: '',
    pauseBetweenServices: 10, cancellationDeadlineHours: 24,
    maxCancellationsBeforePenalty: 3, penaltyDurationDays: 30,
  });

  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const { isOpen: isHolOpen, onOpen: onHolOpen, onClose: onHolClose } = useDisclosure();
  const [editHol, setEditHol] = useState<Holiday | null>(null);
  const [holForm, setHolForm] = useState({ date: '', name: '', message: '', sendPush: false });

  const loadSalon = useCallback(async () => {
    setLoading(true);
    setNoSalonExists(false);
    try {
      let s: SalonSettings | null = null;

      // Try admin list endpoint first
      try {
        const listRes = await api.get<SalonSettings[]>('/api/salon/list');
        if (Array.isArray(listRes.data) && listRes.data.length > 0) {
          s = listRes.data[0];
        }
      } catch {
        // Fallback: try public endpoint
        try {
          const pubRes = await api.get<SalonSettings | null>('/api/salon');
          if (pubRes.data && pubRes.data.id) {
            // Get full details with relations
            const detailRes = await api.get<SalonSettings>(`/api/salon/${pubRes.data.id}`);
            s = detailRes.data;
          }
        } catch { /* no salon */ }
      }

      if (!s) {
        setNoSalonExists(true);
        setSalon(null);
        setLoading(false);
        return;
      }

      setSalon(s);
      setFormData({
        name: s.name ?? '',
        address: s.address ?? '',
        phone: s.phone ?? '',
        email: s.email ?? '',
        description: s.description ?? '',
        pauseBetweenServices: s.pauseBetweenServices ?? 10,
        cancellationDeadlineHours: s.cancellationDeadlineHours ?? 24,
        maxCancellationsBeforePenalty: s.maxCancellationsBeforePenalty ?? 3,
        penaltyDurationDays: s.penaltyDurationDays ?? 30,
      });

      if (s.workingHours && s.workingHours.length > 0) {
        const full: WorkingHours[] = Array.from({ length: 7 }, (_, i) => {
          const found = s!.workingHours!.find((w) => w.dayOfWeek === i);
          return found ?? { dayOfWeek: i, openTime: '09:00', closeTime: '17:00', isWorkingDay: i >= 1 && i <= 5 };
        });
        setWorkingHours(full);
      } else {
        const defaults: WorkingHours[] = Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i, openTime: '09:00', closeTime: '17:00', isWorkingDay: i >= 1 && i <= 5,
        }));
        setWorkingHours(defaults);
        try {
          await api.post(`/api/salon/${s.id}/working-hours/ensure`);
        } catch { /* ignore - will retry on next load */ }
      }

      setHolidays(s.holidays ?? []);
    } catch {
      setNoSalonExists(true);
      setSalon(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSalon(); }, [loadSalon]);

  useSocketEvent('salon:updated', useCallback(() => loadSalon(), [loadSalon]));

  const handleCreateSalon = async () => {
    if (!formData.name) {
      toast({ title: 'Unesite naziv salona', status: 'warning', isClosable: true });
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/salon', formData);
      toast({ title: 'Salon kreiran!', status: 'success', isClosable: true });
      loadSalon();
    } catch {
      toast({ title: 'Greška pri kreiranju salona', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!salon) return;
    setSaving(true);
    try {
      await api.patch(`/api/salon/${salon.id}`, formData);
      toast({ title: 'Postavke salona sačuvane', status: 'success', isClosable: true });
      loadSalon();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWorkingHours = async () => {
    if (!salon) return;
    setSaving(true);
    try {
      await api.post(`/api/salon/${salon.id}/working-hours`, { workingHours });
      toast({ title: 'Radno vrijeme sačuvano', status: 'success', isClosable: true });
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const updateWH = (dayOfWeek: number, field: keyof WorkingHours, value: string | boolean) => {
    setWorkingHours((prev) =>
      prev.map((w) => (w.dayOfWeek === dayOfWeek ? { ...w, [field]: value } : w))
    );
  };

  const reloadHolidays = async () => {
    if (!salon) return;
    try {
      const { data } = await api.get<SalonSettings>(`/api/salon/${salon.id}`);
      setHolidays(data.holidays ?? []);
    } catch { /* ignore */ }
  };

  const openHolForm = (h?: Holiday) => {
    if (h) {
      setEditHol(h);
      setHolForm({ date: h.date.slice(0, 10), name: h.name, message: h.message ?? '', sendPush: h.sendPush });
    } else {
      setEditHol(null);
      setHolForm({ date: '', name: '', message: '', sendPush: false });
    }
    onHolOpen();
  };

  const handleSaveHoliday = async () => {
    if (!salon || !holForm.date || !holForm.name) return;
    setSaving(true);
    try {
      if (editHol) {
        await api.patch(`/api/salon/holidays/${editHol.id}`, holForm);
      } else {
        await api.post(`/api/salon/${salon.id}/holidays`, holForm);
      }
      toast({ title: 'Praznik sačuvan', status: 'success', isClosable: true });
      reloadHolidays();
      onHolClose();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!window.confirm('Obrisati praznik?')) return;
    try {
      await api.delete(`/api/salon/holidays/${id}`);
      toast({ title: 'Praznik obrisan', status: 'success', isClosable: true });
      reloadHolidays();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    }
  };

  const handleSendNotification = async (holId: string) => {
    try {
      await api.post(`/api/salon/holidays/${holId}/send-notification`);
      toast({ title: 'Notifikacija poslana', status: 'success', isClosable: true });
      reloadHolidays();
    } catch {
      toast({ title: 'Greška pri slanju', status: 'error', isClosable: true });
    }
  };

  if (loading) return <Box p={6} textAlign="center"><Spinner size="lg" /></Box>;

  // No salon exists - show creation form
  if (noSalonExists || !salon) {
    return (
      <Box>
        <Heading size="lg" mb={6}>{t('nav.salon')}</Heading>
        <Alert status="info" mb={6} rounded="lg">
          <AlertIcon />
          <AlertDescription>Nema konfiguriranog salona. Kreirajte prvi salon da biste nastavili.</AlertDescription>
        </Alert>
        <Box bg="white" p={6} rounded="xl" shadow="sm" maxW="2xl">
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Naziv salona</FormLabel>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Beauty Salon Nejra" />
            </FormControl>
            <FormControl>
              <FormLabel>Adresa</FormLabel>
              <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </FormControl>
            <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
              <FormControl flex={1}>
                <FormLabel>Telefon</FormLabel>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </FormControl>
              <FormControl flex={1}>
                <FormLabel>Email</FormLabel>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </FormControl>
            </Flex>
            <FormControl>
              <FormLabel>Opis</FormLabel>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
            </FormControl>
            <Button colorScheme="brand" onClick={handleCreateSalon} isLoading={saving} size="lg">Kreiraj Salon</Button>
          </VStack>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Heading size="lg" mb={6}>{t('nav.salon')}</Heading>
      <Tabs width="100%">
        <TabList>
          <Tab>Osnovne Postavke</Tab>
          <Tab>Radno Vrijeme</Tab>
          <Tab>Praznici</Tab>
        </TabList>
        <TabPanels width="100%" px={0}>
          <TabPanel px={0} maxW="100%">
            <Box bg="white" p={6} rounded="xl" shadow="sm" maxW="full" w="100%">
              <VStack spacing={4} align="stretch">
                <FormControl isRequired>
                  <FormLabel>Naziv salona</FormLabel>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </FormControl>
                <FormControl>
                  <FormLabel>Adresa</FormLabel>
                  <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </FormControl>
                <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
                  <FormControl flex={1}>
                    <FormLabel>Telefon</FormLabel>
                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </FormControl>
                  <FormControl flex={1}>
                    <FormLabel>Email</FormLabel>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </FormControl>
                </Flex>
                <FormControl>
                  <FormLabel>Opis</FormLabel>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                </FormControl>
                <Flex gap={4} direction={{ base: 'column', md: 'row' }}>
                  <FormControl flex={1}>
                    <FormLabel>Pauza između servisa (min)</FormLabel>
                    <NumberInput value={formData.pauseBetweenServices} onChange={(_, v) => setFormData({ ...formData, pauseBetweenServices: v || 0 })} min={0} max={120}>
                      <NumberInputField /><NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  <FormControl flex={1}>
                    <FormLabel>Rok za otkazivanje (sati)</FormLabel>
                    <NumberInput value={formData.cancellationDeadlineHours} onChange={(_, v) => setFormData({ ...formData, cancellationDeadlineHours: v || 0 })} min={0}>
                      <NumberInputField /><NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                </Flex>
                <Flex gap={4}>
                  <FormControl flex={1}>
                    <FormLabel>Max otkazivanja prije penala</FormLabel>
                    <NumberInput value={formData.maxCancellationsBeforePenalty} onChange={(_, v) => setFormData({ ...formData, maxCancellationsBeforePenalty: v || 0 })} min={0}>
                      <NumberInputField /><NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  <FormControl flex={1}>
                    <FormLabel>Trajanje penala (dana)</FormLabel>
                    <NumberInput value={formData.penaltyDurationDays} onChange={(_, v) => setFormData({ ...formData, penaltyDurationDays: v || 0 })} min={0}>
                      <NumberInputField /><NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                </Flex>
                <Button colorScheme="brand" onClick={handleSaveSettings} isLoading={saving} mt={2}>{t('common.save')}</Button>
              </VStack>
            </Box>
          </TabPanel>

          <TabPanel px={0} maxW="100%">
            <Box bg="white" p={6} rounded="xl" shadow="sm" maxW="full" w="100%">
              <Box overflowX="auto">
                <Table size="sm" mb={4}>
                <Thead><Tr><Th>Dan</Th><Th>Radni dan</Th><Th>Otvaranje</Th><Th>Zatvaranje</Th></Tr></Thead>
                <Tbody>
                  {workingHours.map((wh) => (
                    <Tr key={wh.dayOfWeek} opacity={wh.isWorkingDay ? 1 : 0.5}>
                      <Td fontWeight="medium">{DAYS[wh.dayOfWeek]}</Td>
                      <Td><Switch isChecked={wh.isWorkingDay} onChange={(e) => updateWH(wh.dayOfWeek, 'isWorkingDay', e.target.checked)} colorScheme="brand" /></Td>
                      <Td><Input type="time" size="sm" w={{ base: 'full', md: '130px' }} value={wh.openTime} onChange={(e) => updateWH(wh.dayOfWeek, 'openTime', e.target.value)} isDisabled={!wh.isWorkingDay} /></Td>
                      <Td><Input type="time" size="sm" w={{ base: 'full', md: '130px' }} value={wh.closeTime} onChange={(e) => updateWH(wh.dayOfWeek, 'closeTime', e.target.value)} isDisabled={!wh.isWorkingDay} /></Td>
                    </Tr>
                  ))}
                </Tbody>
                </Table>
              </Box>
              <Button colorScheme="brand" onClick={handleSaveWorkingHours} isLoading={saving}>{t('common.save')}</Button>
            </Box>
          </TabPanel>

          <TabPanel px={0} maxW="100%">
            <Flex justify="flex-end" mb={4}>
              <Button leftIcon={<AddIcon />} colorScheme="brand" onClick={() => openHolForm()}>Novi Praznik</Button>
            </Flex>
            <Box bg="white" rounded="lg" shadow="sm" overflow="auto">
              <Table size="sm">
                <Thead><Tr><Th>Datum</Th><Th>Naziv</Th><Th>Poruka</Th><Th>Push</Th><Th>Poslano</Th><Th textAlign="right">Akcije</Th></Tr></Thead>
                <Tbody>
                  {holidays.length === 0 ? (
                    <Tr><Td colSpan={6}><Text color="gray.500">{t('common.noData')}</Text></Td></Tr>
                  ) : holidays.map((h) => (
                    <Tr key={h.id}>
                      <Td>{h.date?.slice(0, 10)}</Td>
                      <Td fontWeight="medium">{h.name}</Td>
                      <Td maxW="200px" isTruncated>{h.message ?? '-'}</Td>
                      <Td><Badge colorScheme={h.sendPush ? 'green' : 'gray'}>{h.sendPush ? 'Da' : 'Ne'}</Badge></Td>
                      <Td>
                        {h.pushSentAt ? <Badge colorScheme="blue">Poslano</Badge>
                          : h.sendPush ? <Button size="xs" colorScheme="orange" onClick={() => handleSendNotification(h.id)}>Pošalji</Button>
                          : '-'}
                      </Td>
                      <Td textAlign="right">
                        <HStack spacing={1} justify="flex-end">
                          <IconButton aria-label="Uredi" icon={<EditIcon />} size="xs" variant="ghost" colorScheme="blue" onClick={() => openHolForm(h)} />
                          <IconButton aria-label="Obriši" icon={<DeleteIcon />} size="xs" variant="ghost" colorScheme="red" onClick={() => handleDeleteHoliday(h.id)} />
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Modal isOpen={isHolOpen} onClose={onHolClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editHol ? 'Uredi Praznik' : 'Novi Praznik'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4} isRequired>
              <FormLabel>Datum</FormLabel>
              <Input type="date" value={holForm.date} onChange={(e) => setHolForm({ ...holForm, date: e.target.value })} />
            </FormControl>
            <FormControl mb={4} isRequired>
              <FormLabel>Naziv</FormLabel>
              <Input value={holForm.name} onChange={(e) => setHolForm({ ...holForm, name: e.target.value })} />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Poruka</FormLabel>
              <Textarea value={holForm.message} onChange={(e) => setHolForm({ ...holForm, message: e.target.value })} />
            </FormControl>
            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Pošalji push notifikaciju</FormLabel>
              <Switch isChecked={holForm.sendPush} onChange={(e) => setHolForm({ ...holForm, sendPush: e.target.checked })} colorScheme="brand" />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onHolClose}>{t('common.cancel')}</Button>
            <Button colorScheme="brand" onClick={handleSaveHoliday} isLoading={saving}>{t('common.save')}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
