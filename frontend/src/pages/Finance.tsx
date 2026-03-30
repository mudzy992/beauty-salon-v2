import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Heading, Tabs, TabList, TabPanels, Tab, TabPanel, Table,
  Thead, Tbody, Tr, Th, Td, Spinner, Text, Badge, Button, Flex,
  useToast, useDisclosure, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalFooter, ModalBody, ModalCloseButton, FormControl,
  FormLabel, Input, Select, Textarea,
  HStack, IconButton, Card, CardBody, SimpleGrid, Stat,
  StatLabel, StatNumber, Switch, Divider, Accordion, AccordionItem,
  AccordionButton, AccordionPanel, AccordionIcon, VStack, Image,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { AddIcon, EditIcon, DeleteIcon, LockIcon, ViewIcon, ArrowBackIcon } from '@chakra-ui/icons';
import api from '../api/client';
import { getUploadUrl } from '../utils/uploadUrl';

/* ── Types ── */
interface IncomeBook {
  id: string; year: number; month: number;
  totalRevenue: number | string; totalTips: number | string;
  openedAt: string; closedAt: string | null;
  entries?: IncomeEntry[];
  manualEntries?: IncomeBookManualEntry[];
  lockEvents?: IncomeBookLockEvent[];
  manualAudits?: IncomeBookManualEntryAudit[];
}
interface IncomeEntry {
  id: string; amount: number | string; tipAmount: number | string; date: string;
  dailyLogEntryId: string;
  dailyLogEntry?: {
    id: string; date: string; actualPrice: number | string; tipAmount: number | string;
    notes: string | null; status: string; isManual: boolean;
    service?: { name: string };
    stylistProfile?: { user?: { username: string; firstName: string | null; lastName: string | null } };
    client?: { user?: { username: string } };
  };
}
interface IncomeBookManualEntry {
  id: string;
  date: string;
  serviceId: string;
  stylistProfileId: string | null;
  amount: number | string;
  tipAmount: number | string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  service?: { id: string; name: string };
  stylistProfile?: { id: string; user?: { username: string; firstName: string | null; lastName: string | null } };
  createdBy?: { id: string; username: string };
}
interface IncomeBookLockEvent {
  id: string;
  action: string;
  reason: string | null;
  createdAt: string;
  createdBy?: { id: string; username: string };
}
interface IncomeBookManualEntryAudit {
  id: string;
  manualEntryId: string | null;
  action: string;
  beforeJson: any | null;
  afterJson: any | null;
  createdAt: string;
  createdBy?: { id: string; username: string };
}
interface ServiceOption {
  id: string;
  name: string;
  price?: number | string;
}
interface ExpenseBook { id: string; year: number; month: number; isClosed: boolean; openedAt: string; closedAt: string | null; }
interface ExpenseTemplate {
  id: string; name: string; description: string | null; requiresAttachmentPerItem: boolean;
  fields?: TemplateField[];
}
interface TemplateField { id: string; fieldName: string; fieldType: string; isRequired: boolean; sortOrder: number; defaultValue: string | null; }
interface ExpenseCategory {
  id: string; name: string; description: string | null;
  isActive: boolean; isFixed: boolean; templateId: string;
  template?: ExpenseTemplate;
}
interface ExpenseAttachment { id: string; description: string | null; upload?: { id: string; pathOriginal: string; pathThumb: string; originalName: string }; }
interface Expense {
  id: string; title: string; totalAmount: number | string; notes: string | null; createdAt: string;
  category?: ExpenseCategory;
  fieldValues?: { id: string; fieldId: string; value: string; field?: { fieldName: string; fieldType: string; defaultValue?: string | null } }[];
  attachments?: ExpenseAttachment[];
}

const MONTHS = ['', 'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni', 'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];

function getEndOfMonthDate(year: number, month: number): Date {
  return new Date(year, month, 0);
}

function formatDateBs(date: Date): string {
  return date.toLocaleDateString('bs-BA');
}

export default function Finance() {
  const { t } = useTranslation();
  return (
    <Box>
      <Heading size="lg" mb={4}>{t('nav.finance')}</Heading>
      <Tabs>
        <TabList>
          <Tab>Knjiga Prihoda</Tab>
          <Tab>Knjiga Rashoda</Tab>
          <Tab>Kategorije Rashoda</Tab>
        </TabList>
        <TabPanels>
          <TabPanel><IncomeBooksTab /></TabPanel>
          <TabPanel><ExpenseBooksTab /></TabPanel>
          <TabPanel><ExpenseCategoriesTab /></TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}

/* ═══════════ Income Books Tab ═══════════ */
function IncomeBooksTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const [books, setBooks] = useState<IncomeBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<IncomeBook | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<IncomeEntry | null>(null);
  const [view, setView] = useState<'list' | 'book' | 'entry'>('list');
  const nowForPicker = useRef<Date>(new Date());
  const [targetYear, setTargetYear] = useState<number>(nowForPicker.current.getFullYear());
  const [targetMonth, setTargetMonth] = useState<number>(nowForPicker.current.getMonth() + 1);
  const { isOpen: isUnlockOpen, onOpen: onUnlockOpen, onClose: onUnlockClose } = useDisclosure();
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [locking, setLocking] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const { isOpen: isManualOpen, onOpen: onManualOpen, onClose: onManualClose } = useDisclosure();
  const [editingManual, setEditingManual] = useState<IncomeBookManualEntry | null>(null);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualForm, setManualForm] = useState({
    date: '',
    serviceId: '',
    amount: 0,
    tipAmount: 0,
    notes: '',
  });

  const loadData = useCallback(() => {
    setLoading(true);
    api.get<IncomeBook[]>('/api/income-books')
      .then((r) => setBooks(Array.isArray(r.data) ? r.data : []))
      .catch(() => setBooks([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const openMonth = async (year: number, month: number) => {
    try {
      const { data } = await api.get<IncomeBook>(`/api/income-books/month/${year}/${month}`);
      setSelectedBook(data);
      setView('book');
      loadData();
    } catch { toast({ title: 'Greška', status: 'error', isClosable: true }); }
  }

  const openBook = async (b: IncomeBook) => {
    try {
      const { data } = await api.get<IncomeBook>(`/api/income-books/${b.id}`);
      setSelectedBook(data);
      setView('book');
    } catch { toast({ title: 'Greška', status: 'error', isClosable: true }); }
  };

  const reloadSelectedBook = async () => {
    if (!selectedBook) return;
    try {
      const { data } = await api.get<IncomeBook>(`/api/income-books/${selectedBook.id}`);
      setSelectedBook(data);
      loadData();
    } catch { /* keep old */ }
  }

  const loadServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const { data } = await api.get('/api/services', {
        params: { activeOnly: 'true', pageSize: 500, page: 1 },
      });
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      setServices(items.map((s: any) => ({ id: s.id, name: s.name, price: s.price })));
    } catch {
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    if (view !== 'book' || !selectedBook) return;
    if (services.length > 0 || loadingServices) return;
    loadServices();
  }, [loadServices, loadingServices, selectedBook, services.length, view]);

  useEffect(() => {
    if (view !== 'book' || !selectedBook) return;
    const isUnlocked = !selectedBook.closedAt;
    if (!isUnlocked) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [selectedBook, view]);

  const openManualCreate = () => {
    if (!selectedBook) return;
    setEditingManual(null);
    const y = selectedBook.year;
    const m = String(selectedBook.month).padStart(2, '0');
    setManualForm({
      date: `${y}-${m}-01`,
      serviceId: services[0]?.id ?? '',
      amount: 0,
      tipAmount: 0,
      notes: '',
    });
    onManualOpen();
  }

  const openManualEdit = (entry: IncomeBookManualEntry) => {
    setEditingManual(entry);
    setManualForm({
      date: String(entry.date).slice(0, 10),
      serviceId: entry.serviceId,
      amount: Number(entry.amount || 0),
      tipAmount: Number(entry.tipAmount || 0),
      notes: entry.notes ?? '',
    });
    onManualOpen();
  }

  const handleSaveManual = async () => {
    if (!selectedBook) return;
    if (!manualForm.date || !manualForm.serviceId) {
      toast({ title: 'Popunite sva polja', status: 'warning', isClosable: true })
      return
    }
    setManualSaving(true);
    try {
      if (editingManual) {
        await api.patch(`/api/income-books/${selectedBook.id}/manual-entries/${editingManual.id}`, {
          date: manualForm.date,
          serviceId: manualForm.serviceId,
          amount: manualForm.amount,
          tipAmount: manualForm.tipAmount,
          notes: manualForm.notes || null,
        });
      } else {
        await api.post(`/api/income-books/${selectedBook.id}/manual-entries`, {
          date: manualForm.date,
          serviceId: manualForm.serviceId,
          amount: manualForm.amount,
          tipAmount: manualForm.tipAmount,
          notes: manualForm.notes || undefined,
        });
      }
      toast({ title: 'Sačuvano', status: 'success', isClosable: true });
      onManualClose();
      await reloadSelectedBook();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    } finally {
      setManualSaving(false);
    }
  }

  const handleDeleteManual = async (entry: IncomeBookManualEntry) => {
    if (!selectedBook) return;
    if (!window.confirm('Obrisati ručni prihod?')) return;
    try {
      await api.delete(`/api/income-books/${selectedBook.id}/manual-entries/${entry.id}`);
      toast({ title: 'Obrisano', status: 'success', isClosable: true });
      await reloadSelectedBook();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    }
  }

  const handleUnlockBook = async () => {
    if (!selectedBook) return;
    const reason = unlockReason.trim();
    if (!reason) {
      toast({ title: 'Unesite razlog otključavanja', status: 'warning', isClosable: true })
      return
    }
    setUnlocking(true);
    try {
      await api.post(`/api/income-books/${selectedBook.id}/unlock`, { reason });
      toast({ title: 'Knjiga otključana', status: 'success', isClosable: true });
      setUnlockReason('');
      onUnlockClose();
      await reloadSelectedBook();
    } catch { toast({ title: 'Greška', status: 'error', isClosable: true }); }
    finally { setUnlocking(false); }
  }

  const handleLockBook = async () => {
    if (!selectedBook) return;
    setLocking(true);
    try {
      await api.post(`/api/income-books/${selectedBook.id}/lock`);
      toast({ title: 'Knjiga zaključana', status: 'success', isClosable: true });
      await reloadSelectedBook();
    } catch { toast({ title: 'Greška', status: 'error', isClosable: true }); }
    finally { setLocking(false); }
  }

  const openCurrentMonth = async () => {
    const now = new Date();
    await openMonth(now.getFullYear(), now.getMonth() + 1)
  };

  if (loading) return <Spinner />;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentBook = books.find((b) => b.year === currentYear && b.month === currentMonth) ?? null;
  const isCurrentBookOpen = Boolean(currentBook && !currentBook.closedAt);
  const currentMonthEnd = getEndOfMonthDate(currentYear, currentMonth);

  if (view === 'entry' && selectedEntry) {
    const dl = selectedEntry.dailyLogEntry;
    return (
      <Box>
        <Button leftIcon={<ArrowBackIcon />} variant="ghost" mb={4} onClick={() => setView('book')}>Nazad na knjigu</Button>
        <Heading size="md" mb={4}>Detalji dnevnog prihoda</Heading>
        <Card><CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box><Text fontSize="xs" color="gray.500">Datum</Text><Text fontWeight="bold">{selectedEntry.date?.slice(0, 10)}</Text></Box>
            <Box><Text fontSize="xs" color="gray.500">Iznos</Text><Text fontWeight="bold" color="green.600">{Number(selectedEntry.amount).toFixed(2)} KM</Text></Box>
            <Box><Text fontSize="xs" color="gray.500">Napojnica</Text><Text fontWeight="bold">{Number(selectedEntry.tipAmount).toFixed(2)} KM</Text></Box>
            <Box><Text fontSize="xs" color="gray.500">Izvor</Text><Badge colorScheme={dl?.isManual ? 'orange' : 'blue'}>{dl?.isManual ? 'Ručno' : 'Iz rezervacije'}</Badge></Box>
          </SimpleGrid>
          {dl && (<><Divider my={4} /><SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box><Text fontSize="xs" color="gray.500">Servis</Text><Text>{dl.service?.name ?? '-'}</Text></Box>
            <Box><Text fontSize="xs" color="gray.500">Stilista</Text><Text>{dl.stylistProfile?.user ? `${dl.stylistProfile.user.firstName ?? ''} ${dl.stylistProfile.user.lastName ?? ''}`.trim() || dl.stylistProfile.user.username : '-'}</Text></Box>
            <Box><Text fontSize="xs" color="gray.500">Klijent</Text><Text>{dl.client?.user?.username ?? '-'}</Text></Box>
            <Box><Text fontSize="xs" color="gray.500">Status</Text><Badge colorScheme={dl.status === 'COMPLETED' ? 'green' : 'yellow'}>{dl.status}</Badge></Box>
            {dl.notes && <Box gridColumn="span 2"><Text fontSize="xs" color="gray.500">Bilješke</Text><Text>{dl.notes}</Text></Box>}
          </SimpleGrid></>)}
        </CardBody></Card>
      </Box>
    );
  }

  if (view === 'book' && selectedBook) {
    const isLocked = Boolean(selectedBook.closedAt);
    const manualEntries = selectedBook.manualEntries ?? [];
    const canEditManual = !isLocked;
    const manualTotal = manualEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const manualTipsTotal = manualEntries.reduce((sum, e) => sum + Number(e.tipAmount || 0), 0);
    return (
      <Box>
        <Button
          leftIcon={<ArrowBackIcon />}
          variant="ghost"
          mb={4}
          onClick={() => {
            if (!isLocked) {
              toast({
                title: 'Knjiga je otključana',
                description: 'Prije izlaska morate zaključati knjigu.',
                status: 'warning',
                isClosable: true,
              });
              return;
            }
            setView('list');
          }}
        >
          Nazad na listu
        </Button>
        <Flex justify="space-between" align="center" mb={2} gap={3} wrap="wrap">
          <Heading size="md">Knjiga prihoda: {MONTHS[selectedBook.month]} {selectedBook.year}</Heading>
          <HStack>
            <Badge colorScheme={isLocked ? 'red' : 'green'}>{isLocked ? 'Zaključana' : 'Otključana'}</Badge>
            {isLocked ? (
              <Button size="sm" colorScheme="orange" onClick={onUnlockOpen}>Otključaj</Button>
            ) : (
              <Button size="sm" colorScheme="red" leftIcon={<LockIcon />} onClick={handleLockBook} isLoading={locking}>Zaključi</Button>
            )}
          </HStack>
        </Flex>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mb={4}>
          <Card size="sm"><CardBody><Stat><StatLabel>Ukupni prihod</StatLabel><StatNumber color="green.600">{Number(selectedBook.totalRevenue).toFixed(2)} KM</StatNumber></Stat></CardBody></Card>
          <Card size="sm"><CardBody><Stat><StatLabel>Ukupne napojnice</StatLabel><StatNumber>{Number(selectedBook.totalTips).toFixed(2)} KM</StatNumber></Stat></CardBody></Card>
        </SimpleGrid>
        <Box bg="white" rounded="lg" shadow="sm" overflow="auto">
          <Table size="sm">
            <Thead><Tr><Th>Datum</Th><Th>Servis</Th><Th>Stilista</Th><Th isNumeric>Iznos</Th><Th isNumeric>Napojnica</Th><Th textAlign="right">Detalji</Th></Tr></Thead>
            <Tbody>
              {(selectedBook.entries ?? []).length === 0 ? (
                <Tr><Td colSpan={6}><Text color="gray.500">Nema zapisa.</Text></Td></Tr>
              ) : (selectedBook.entries ?? []).map((e) => (
                <Tr key={e.id} cursor="pointer" _hover={{ bg: 'gray.50' }} onClick={() => { setSelectedEntry(e); setView('entry'); }}>
                  <Td>{e.date?.slice(0, 10)}</Td>
                  <Td>{e.dailyLogEntry?.service?.name ?? '-'}</Td>
                  <Td>{e.dailyLogEntry?.stylistProfile?.user?.username ?? '-'}</Td>
                  <Td isNumeric fontWeight="medium">{Number(e.amount).toFixed(2)}</Td>
                  <Td isNumeric>{Number(e.tipAmount).toFixed(2)}</Td>
                  <Td textAlign="right"><IconButton aria-label="Detalji" icon={<ViewIcon />} size="xs" variant="ghost" /></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        <Divider my={5} />

        <Flex justify="space-between" align="center" mb={2} gap={3} wrap="wrap">
          <Heading size="sm">Ručni prihodi</Heading>
          <HStack>
            <Badge colorScheme="purple">Prihod: {manualTotal.toFixed(2)} KM</Badge>
            <Badge colorScheme="purple">Napojnice: {manualTipsTotal.toFixed(2)} KM</Badge>
            {canEditManual && (
              <Button size="sm" leftIcon={<AddIcon />} colorScheme="brand" onClick={openManualCreate} isLoading={loadingServices}>
                Dodaj ručni prihod
              </Button>
            )}
          </HStack>
        </Flex>

        <Box bg="white" rounded="lg" shadow="sm" overflow="auto" mb={6}>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Datum</Th>
                <Th>Servis</Th>
                <Th isNumeric>Iznos</Th>
                <Th isNumeric>Napojnica</Th>
                <Th>Bilješke</Th>
                <Th textAlign="right">Akcije</Th>
              </Tr>
            </Thead>
            <Tbody>
              {manualEntries.length === 0 ? (
                <Tr><Td colSpan={6}><Text color="gray.500">Nema ručnih prihoda.</Text></Td></Tr>
              ) : manualEntries.map((e) => (
                <Tr key={e.id}>
                  <Td>{String(e.date).slice(0, 10)}</Td>
                  <Td>{e.service?.name ?? '-'}</Td>
                  <Td isNumeric fontWeight="medium">{Number(e.amount).toFixed(2)}</Td>
                  <Td isNumeric>{Number(e.tipAmount).toFixed(2)}</Td>
                  <Td>{e.notes ?? '-'}</Td>
                  <Td textAlign="right">
                    <HStack justify="flex-end" spacing={1}>
                      <IconButton aria-label="Uredi" icon={<EditIcon />} size="xs" variant="ghost" colorScheme="blue" onClick={() => openManualEdit(e)} isDisabled={!canEditManual} />
                      <IconButton aria-label="Obriši" icon={<DeleteIcon />} size="xs" variant="ghost" colorScheme="red" onClick={() => handleDeleteManual(e)} isDisabled={!canEditManual} />
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        <Heading size="sm" mb={2}>Evidencija izmjena</Heading>
        <Box bg="white" rounded="lg" shadow="sm" p={4} mb={6}>
          <VStack align="stretch" spacing={3}>
            {((selectedBook.lockEvents ?? []).length === 0 && (selectedBook.manualAudits ?? []).length === 0) ? (
              <Text color="gray.500">Nema evidencije.</Text>
            ) : (
              <>
                {(selectedBook.lockEvents ?? []).map((e) => (
                  <Flex key={e.id} justify="space-between" align="start" gap={3} wrap="wrap">
                    <Box>
                      <Badge colorScheme={e.action === 'UNLOCK' ? 'orange' : 'red'} mr={2}>{e.action}</Badge>
                      <Text as="span" fontSize="sm" fontWeight="medium">
                        {e.createdBy?.username ?? 'admin'}
                      </Text>
                      {e.reason && (
                        <Text fontSize="sm" color="gray.600" mt={1}>
                          Razlog: {e.reason}
                        </Text>
                      )}
                    </Box>
                    <Text fontSize="sm" color="gray.500">{new Date(e.createdAt).toLocaleString('bs-BA')}</Text>
                  </Flex>
                ))}
                {(selectedBook.manualAudits ?? []).map((a) => (
                  <Flex key={a.id} justify="space-between" align="start" gap={3} wrap="wrap">
                    <Box>
                      <Badge colorScheme="purple" mr={2}>{a.action}</Badge>
                      <Text as="span" fontSize="sm" fontWeight="medium">
                        {a.createdBy?.username ?? 'admin'}
                      </Text>
                      <Text fontSize="sm" color="gray.600" mt={1}>
                        {a.action === 'CREATE' && 'Kreiran ručni prihod'}
                        {a.action === 'UPDATE' && 'Ažuriran ručni prihod'}
                        {a.action === 'DELETE' && 'Obrisan ručni prihod'}
                        {a.manualEntryId ? ` (ID: ${a.manualEntryId.slice(0, 8)})` : ''}
                      </Text>
                    </Box>
                    <Text fontSize="sm" color="gray.500">{new Date(a.createdAt).toLocaleString('bs-BA')}</Text>
                  </Flex>
                ))}
              </>
            )}
          </VStack>
        </Box>

        <Modal isOpen={isUnlockOpen} onClose={onUnlockClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Otključaj knjigu</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Text fontSize="sm" color="gray.600" mb={3}>
                Molimo unesite razlog otključavanja. Ova akcija će biti evidentirana.
              </Text>
              <FormControl isRequired>
                <FormLabel>Razlog</FormLabel>
                <Textarea value={unlockReason} onChange={(e) => setUnlockReason(e.target.value)} rows={3} />
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onUnlockClose}>Odustani</Button>
              <Button colorScheme="orange" onClick={handleUnlockBook} isLoading={unlocking}>Otključaj</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <Modal isOpen={isManualOpen} onClose={onManualClose} size="lg" scrollBehavior="inside">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>{editingManual ? 'Uredi ručni prihod' : 'Novi ručni prihod'}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <FormControl mb={4} isRequired>
                <FormLabel>Datum</FormLabel>
                <Input type="date" value={manualForm.date} onChange={(e) => setManualForm((p) => ({ ...p, date: e.target.value }))} />
              </FormControl>
              <FormControl mb={4} isRequired>
                <FormLabel>Servis</FormLabel>
                <Select value={manualForm.serviceId} onChange={(e) => setManualForm((p) => ({ ...p, serviceId: e.target.value }))}>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </FormControl>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                <FormControl isRequired>
                  <FormLabel>Iznos (KM)</FormLabel>
                  <Input type="number" value={manualForm.amount} onChange={(e) => setManualForm((p) => ({ ...p, amount: Number(e.target.value) || 0 }))} />
                </FormControl>
                <FormControl>
                  <FormLabel>Napojnica (KM)</FormLabel>
                  <Input type="number" value={manualForm.tipAmount} onChange={(e) => setManualForm((p) => ({ ...p, tipAmount: Number(e.target.value) || 0 }))} />
                </FormControl>
              </SimpleGrid>
              <FormControl>
                <FormLabel>Bilješke</FormLabel>
                <Textarea value={manualForm.notes} onChange={(e) => setManualForm((p) => ({ ...p, notes: e.target.value }))} rows={3} />
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onManualClose}>Odustani</Button>
              <Button colorScheme="brand" onClick={handleSaveManual} isLoading={manualSaving} isDisabled={!canEditManual}>
                Sačuvaj
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    );
  }

  return (
    <>
      <Flex justify="space-between" align="center" mb={3} gap={3} wrap="wrap">
        <HStack spacing={2}>
          <Text fontSize="sm" color="gray.600">Otvori mjesec:</Text>
          <Input
            size="sm"
            w="100px"
            type="number"
            value={targetYear}
            min={2000}
            max={2100}
            onChange={(e) => setTargetYear(Number(e.target.value) || currentYear)}
          />
          <Select
            size="sm"
            w={{ base: '170px', md: '200px' }}
            value={targetMonth}
            onChange={(e) => setTargetMonth(Number(e.target.value) || currentMonth)}
          >
            {MONTHS.slice(1).map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>{m}</option>
            ))}
          </Select>
          <Button size="sm" colorScheme="brand" onClick={() => openMonth(targetYear, targetMonth)}>
            Otvori knjigu
          </Button>
        </HStack>

        {isCurrentBookOpen ? (
          <HStack spacing={2}>
            <Badge colorScheme="green">Otvoreno</Badge>
            <Text fontSize="sm" color="gray.600">
              Knjiga za tekući mjesec {MONTHS[currentMonth]} {currentYear} je otvorena do {formatDateBs(currentMonthEnd)}.
            </Text>
          </HStack>
        ) : (
          <Button size="sm" colorScheme="brand" variant="outline" onClick={openCurrentMonth}>
            Otvori tekući mjesec
          </Button>
        )}
      </Flex>
      <Box bg="white" rounded="lg" shadow="sm" overflow="auto">
        <Table size="sm">
          <Thead><Tr><Th>Godina</Th><Th>Mjesec</Th><Th isNumeric>Prihod</Th><Th isNumeric>Napojnice</Th><Th>Status</Th><Th textAlign="right">Akcije</Th></Tr></Thead>
          <Tbody>
            {books.length === 0 ? (
              <Tr><Td colSpan={6}><Text color="gray.500">{t('common.noData')}</Text></Td></Tr>
            ) : books.map((b) => (
              <Tr key={b.id} cursor="pointer" _hover={{ bg: 'gray.50' }} onClick={() => openBook(b)}>
                <Td>{b.year}</Td><Td>{MONTHS[b.month]}</Td>
                <Td isNumeric fontWeight="medium">{Number(b.totalRevenue).toFixed(2)} KM</Td>
                <Td isNumeric>{Number(b.totalTips).toFixed(2)} KM</Td>
                <Td><Badge colorScheme={b.closedAt ? 'red' : 'green'}>{b.closedAt ? 'Zatvorena' : 'Otvorena'}</Badge></Td>
                <Td textAlign="right"><IconButton aria-label="Detalji" icon={<ViewIcon />} size="xs" variant="ghost" colorScheme="blue" onClick={(e) => { e.stopPropagation(); openBook(b); }} /></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </>
  );
}

/* ═══════════ Expense Books Tab - with inline expense creation ═══════════ */
interface LineItem { name: string; qty: number; price: number; }

function ExpenseBooksTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const [books, setBooks] = useState<ExpenseBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<ExpenseBook | null>(null);
  const [bookExpenses, setBookExpenses] = useState<Expense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [view, setView] = useState<'list' | 'book' | 'expense'>('list');

  // Expense creation inside book
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [form, setForm] = useState({ categoryId: '', title: '', notes: '' });
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [fixedFields, setFixedFields] = useState<{ fieldId: string; fieldName: string; value: string; attachmentId: string; attachmentName: string }[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [attachmentUploadIds, setAttachmentUploadIds] = useState<string[]>([]);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const fixedFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingAtt, setUploadingAtt] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    api.get<ExpenseBook[]>('/api/expense-books').then((r) => setBooks(Array.isArray(r.data) ? r.data : [])).catch(() => setBooks([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    api.get<ExpenseCategory[]>('/api/expense-categories').then((r) => setCategories(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const openBook = async (b: ExpenseBook) => {
    setSelectedBook(b);
    try {
      const { data } = await api.get<Expense[]>('/api/expenses', { params: { bookId: b.id } });
      setBookExpenses(Array.isArray(data) ? data : []);
    } catch { setBookExpenses([]); }
    setView('book');
  };

  const openExpenseDetail = async (exp: Expense) => {
    try { const { data } = await api.get<Expense>(`/api/expenses/${exp.id}`); setSelectedExpense(data); } catch { setSelectedExpense(exp); }
    setView('expense');
  };

  const openCurrentMonth = async () => {
    const now = new Date();
    try {
      const { data } = await api.get<ExpenseBook>(`/api/expense-books/month/${now.getFullYear()}/${now.getMonth() + 1}`);
      setSelectedBook(data);
      try { const exps = await api.get<Expense[]>('/api/expenses', { params: { bookId: data.id } }); setBookExpenses(Array.isArray(exps.data) ? exps.data : []); } catch { setBookExpenses([]); }
      setView('book');
      loadData();
    } catch { toast({ title: 'Greška', status: 'error', isClosable: true }); }
  };

  const closeBook = async (id: string) => {
    if (!window.confirm('Zatvoriti knjigu?')) return;
    try { await api.post(`/api/expense-books/${id}/close`); toast({ title: 'Knjiga zatvorena', status: 'success', isClosable: true }); loadData(); } catch { toast({ title: 'Greška', status: 'error', isClosable: true }); }
  };

  // Create expense within book
  const onCategoryChange = async (catId: string) => {
    setForm((prev) => ({ ...prev, categoryId: catId }));
    setSelectedCategory(null); setFixedFields([]); setLineItems([]);
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    let fullCat = cat;
    if (cat.templateId && (!cat.template?.fields || cat.template.fields.length === 0)) {
      try { const { data } = await api.get<ExpenseCategory>(`/api/expense-categories/${cat.id}`); fullCat = data; } catch { /* use what we have */ }
    }
    setSelectedCategory(fullCat);
    if (fullCat.isFixed && fullCat.template?.fields) {
      setFixedFields(fullCat.template.fields.map((f) => ({
        fieldId: f.id, fieldName: f.fieldName, value: f.defaultValue ?? '',
        attachmentId: '', attachmentName: '',
      })));
      setForm((prev) => ({ ...prev, title: fullCat.name }));
    } else {
      setLineItems([{ name: '', qty: 1, price: 0 }]);
    }
  };

  const openCreateExpense = () => {
    setForm({ categoryId: '', title: '', notes: '' });
    setSelectedCategory(null); setFixedFields([]); setLineItems([]);
    setAttachmentUploadIds([]); setAttachmentNames([]);
    onOpen();
  };

  const calcTotal = (): number => {
    if (selectedCategory?.isFixed) return fixedFields.reduce((sum, f) => sum + Number(f.value || 0), 0);
    return lineItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
  };

  const handleUploadAtt = async (file: File) => {
    setUploadingAtt(true);
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('entity', 'expenses');
      const { data } = await api.post('/api/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAttachmentUploadIds((p) => [...p, data.id]); setAttachmentNames((p) => [...p, file.name]);
    } catch { toast({ title: 'Greška pri uploadu', status: 'error', isClosable: true }); }
    finally { setUploadingAtt(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleUploadFixedAtt = async (file: File, fieldId: string) => {
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('entity', 'expenses');
      const { data } = await api.post('/api/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFixedFields((prev) => prev.map((f) => f.fieldId === fieldId ? { ...f, attachmentId: data.id, attachmentName: file.name } : f));
    } catch { toast({ title: 'Greška pri uploadu', status: 'error', isClosable: true }); }
  };

  const handleSaveExpense = async () => {
    if (!selectedBook || !form.categoryId || !form.title) {
      toast({ title: 'Popunite sva polja', status: 'warning', isClosable: true }); return;
    }
    setSaving(true);
    try {
      const totalAmount = calcTotal();
      const fieldValues: { fieldId: string; value: string }[] = [];
      const allAttIds: string[] = [...attachmentUploadIds];
      if (selectedCategory?.isFixed) {
        fixedFields.forEach((f) => { fieldValues.push({ fieldId: f.fieldId, value: f.value }); if (f.attachmentId) allAttIds.push(f.attachmentId); });
      }
      await api.post('/api/expenses', {
        bookId: selectedBook.id, categoryId: form.categoryId, title: form.title, totalAmount,
        notes: selectedCategory?.isFixed ? (form.notes || undefined) : JSON.stringify({ lineItems, userNotes: form.notes }),
        fieldValues: fieldValues.length > 0 ? fieldValues : undefined,
        attachmentUploadIds: allAttIds.length > 0 ? allAttIds : undefined,
      });
      toast({ title: 'Rashod sačuvan', status: 'success', isClosable: true });
      onClose();
      openBook(selectedBook);
    } catch { toast({ title: 'Greška', status: 'error', isClosable: true }); }
    finally { setSaving(false); }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Obrisati rashod?')) return;
    try { await api.delete(`/api/expenses/${id}`); toast({ title: 'Obrisano', status: 'success', isClosable: true }); if (selectedBook) openBook(selectedBook); } catch { toast({ title: 'Greška', status: 'error', isClosable: true }); }
  };

  if (loading) return <Spinner />;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentBook = books.find((b) => b.year === currentYear && b.month === currentMonth) ?? null;
  const isCurrentBookOpen = Boolean(currentBook && !currentBook.isClosed);
  const currentMonthEnd = getEndOfMonthDate(currentYear, currentMonth);

  // Expense detail view
  if (view === 'expense' && selectedExpense) {
    const isFixed = selectedExpense.category?.isFixed;
    return (
      <Box>
        <Button leftIcon={<ArrowBackIcon />} variant="ghost" mb={4} onClick={() => setView('book')}>Nazad na knjigu</Button>
        <Heading size="md" mb={4}>Detalji rashoda: {selectedExpense.title}</Heading>
        <Card mb={4}><CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box><Text fontSize="xs" color="gray.500">Naslov</Text><Text fontWeight="bold">{selectedExpense.title}</Text></Box>
            <Box><Text fontSize="xs" color="gray.500">Ukupni iznos</Text><Text fontWeight="bold" color="red.600">{Number(selectedExpense.totalAmount).toFixed(2)} KM</Text></Box>
            <Box><Text fontSize="xs" color="gray.500">Kategorija</Text><Flex align="center" gap={2}><Text>{selectedExpense.category?.name ?? '-'}</Text>{isFixed && <Badge colorScheme="purple">FIKSNO</Badge>}</Flex></Box>
            <Box><Text fontSize="xs" color="gray.500">Datum</Text><Text>{new Date(selectedExpense.createdAt).toLocaleDateString('bs-BA')}</Text></Box>
            {selectedExpense.notes && <Box gridColumn="span 2"><Text fontSize="xs" color="gray.500">Bilješke</Text><Text>{selectedExpense.notes}</Text></Box>}
          </SimpleGrid>
        </CardBody></Card>
        {selectedExpense.fieldValues && selectedExpense.fieldValues.length > 0 && (
          <Card mb={4}><CardBody><Text fontWeight="bold" mb={2}>Stavke</Text>
            <Table size="sm"><Thead><Tr><Th>Naziv</Th><Th isNumeric>Cijena (KM)</Th></Tr></Thead><Tbody>
              {selectedExpense.fieldValues.map((fv) => (<Tr key={fv.id}><Td fontWeight="medium">{fv.field?.fieldName ?? '-'}</Td><Td isNumeric>{Number(fv.value || 0).toFixed(2)}</Td></Tr>))}
            </Tbody></Table>
          </CardBody></Card>
        )}
        {selectedExpense.attachments && selectedExpense.attachments.length > 0 && (
          <Card><CardBody><Text fontWeight="bold" mb={2}>Prilozi ({selectedExpense.attachments.length})</Text>
            <VStack align="stretch" spacing={2}>
              {selectedExpense.attachments.map((att) => (
                <Flex key={att.id} align="center" gap={3} p={2} bg="gray.50" rounded="md">
                  {att.upload?.originalName?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <Image src={getUploadUrl(att.upload.pathThumb || att.upload.pathOriginal)} alt="" boxSize="50px" objectFit="cover" rounded="md" />
                  ) : <Box w="50px" h="50px" bg="gray.200" rounded="md" display="flex" alignItems="center" justifyContent="center"><Text fontSize="xs">FILE</Text></Box>}
                  <Box flex={1}><Text fontSize="sm" fontWeight="medium">{att.upload?.originalName ?? 'Prilog'}</Text></Box>
                  <Button size="xs" as="a" href={getUploadUrl(att.upload?.pathOriginal)} target="_blank">Preuzmi</Button>
                </Flex>
              ))}
            </VStack>
          </CardBody></Card>
        )}
      </Box>
    );
  }

  // Book detail view with expenses + create
  if (view === 'book' && selectedBook) {
    const bookTotal = bookExpenses.reduce((s, e) => s + Number(e.totalAmount || 0), 0);
    return (
      <Box>
        <Button leftIcon={<ArrowBackIcon />} variant="ghost" mb={4} onClick={() => setView('list')}>Nazad na listu</Button>
        <Flex justify="space-between" align="center" mb={4}>
          <Heading size="md">Knjiga rashoda: {MONTHS[selectedBook.month]} {selectedBook.year}</Heading>
          <HStack>
            {!selectedBook.isClosed && <Button size="sm" leftIcon={<AddIcon />} colorScheme="brand" onClick={openCreateExpense}>Novi Rashod</Button>}
            {!selectedBook.isClosed && <Button size="sm" colorScheme="red" leftIcon={<LockIcon />} onClick={() => closeBook(selectedBook.id)}>Zatvori</Button>}
          </HStack>
        </Flex>
        <Card mb={4}><CardBody><Stat><StatLabel>Ukupni rashodi</StatLabel><StatNumber color="red.600">{bookTotal.toFixed(2)} KM</StatNumber></Stat></CardBody></Card>
        <Box bg="white" rounded="lg" shadow="sm" overflow="auto">
          <Table size="sm">
            <Thead><Tr><Th>Naslov</Th><Th>Kategorija</Th><Th>Tip</Th><Th isNumeric>Iznos (KM)</Th><Th>Datum</Th><Th textAlign="right">Akcije</Th></Tr></Thead>
            <Tbody>
              {bookExpenses.length === 0 ? (
                <Tr><Td colSpan={6}><Text color="gray.500">Nema rashoda.</Text></Td></Tr>
              ) : bookExpenses.map((exp) => (
                <Tr key={exp.id} cursor="pointer" _hover={{ bg: 'gray.50' }} onClick={() => openExpenseDetail(exp)}>
                  <Td fontWeight="medium">{exp.title}</Td>
                  <Td>{exp.category?.name ?? '-'}</Td>
                  <Td><Badge colorScheme={exp.category?.isFixed ? 'purple' : 'blue'}>{exp.category?.isFixed ? 'Fiksno' : 'Faktura'}</Badge></Td>
                  <Td isNumeric fontWeight="bold" color="red.600">{Number(exp.totalAmount).toFixed(2)}</Td>
                  <Td>{new Date(exp.createdAt).toLocaleDateString('bs-BA')}</Td>
                  <Td textAlign="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton aria-label="Obriši" icon={<DeleteIcon />} size="xs" variant="ghost" colorScheme="red" onClick={() => handleDeleteExpense(exp.id)} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        {/* ─── Create Expense Modal ─── */}
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
          <ModalOverlay /><ModalContent>
            <ModalHeader>Novi Rashod — {MONTHS[selectedBook.month]} {selectedBook.year}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <FormControl mb={4} isRequired>
                <FormLabel>Kategorija</FormLabel>
                <Select placeholder="Odaberite kategoriju" value={form.categoryId} onChange={(e) => onCategoryChange(e.target.value)}>
                  {categories.filter((c) => c.isActive).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.isFixed ? ' (Fiksno)' : ''}</option>
                  ))}
                </Select>
              </FormControl>
              {selectedCategory && (<>
                <FormControl mb={4} isRequired>
                  <FormLabel>Naslov</FormLabel>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </FormControl>

                {/* FIXED: Doprinosi */}
                {selectedCategory.isFixed && fixedFields.length > 0 && (
                  <Box mb={4}>
                    <Text fontWeight="bold" fontSize="sm" mb={2} color="purple.600">Fiksne stavke</Text>
                    <VStack align="stretch" spacing={2}>
                      {fixedFields.map((f) => (
                        <Card key={f.fieldId} size="sm" variant="outline"><CardBody py={2} px={3}>
                          <Flex justify="space-between" align="center" mb={selectedCategory.template?.requiresAttachmentPerItem ? 2 : 0}>
                            <HStack spacing={3} flex={1}>
                              <Text fontWeight="medium" minW={{ base: 'auto', md: '140px' }}>{f.fieldName}</Text>
                              <HStack><Text fontSize="sm" color="gray.500">Cijena:</Text>
                                <Input size="sm" w={{ base: 'full', md: '100px' }} type="number" textAlign="right" value={f.value}
                                  onChange={(e) => setFixedFields((p) => p.map((ff) => ff.fieldId === f.fieldId ? { ...ff, value: e.target.value } : ff))} />
                                <Text fontSize="sm">KM</Text>
                              </HStack>
                            </HStack>
                          </Flex>
                          {selectedCategory.template?.requiresAttachmentPerItem && (
                            <Flex align="center" gap={2}>
                              <Text fontSize="xs" color="gray.500">Prilog:</Text>
                              {f.attachmentName ? <Badge colorScheme="green">{f.attachmentName}</Badge> : (<>
                                <input type="file" ref={(el) => { fixedFileRefs.current[f.fieldId] = el; }} style={{ display: 'none' }}
                                  onChange={(e) => e.target.files?.[0] && handleUploadFixedAtt(e.target.files[0], f.fieldId)} />
                                <Button size="xs" variant="outline" onClick={() => fixedFileRefs.current[f.fieldId]?.click()}>Dodaj prilog</Button>
                              </>)}
                            </Flex>
                          )}
                        </CardBody></Card>
                      ))}
                    </VStack>
                    <Card mt={3} bg="gray.50"><CardBody py={2}><Flex justify="space-between"><Text fontWeight="bold">UKUPNO:</Text><Text fontWeight="bold" color="red.600">{calcTotal().toFixed(2)} KM</Text></Flex></CardBody></Card>
                  </Box>
                )}

                {/* VARIABLE: Fakture */}
                {!selectedCategory.isFixed && (
                  <Box mb={4}>
                    <Flex justify="space-between" align="center" mb={2}>
                      <Text fontWeight="bold" fontSize="sm" color="blue.600">Stavke</Text>
                      <Button size="xs" leftIcon={<AddIcon />} onClick={() => setLineItems([...lineItems, { name: '', qty: 1, price: 0 }])}>Dodaj stavku</Button>
                    </Flex>
                    <Table size="sm" mb={2}>
                      <Thead><Tr><Th>Naziv</Th><Th isNumeric>Količina</Th><Th isNumeric>Cijena</Th><Th isNumeric>Ukupno</Th><Th></Th></Tr></Thead>
                      <Tbody>
                        {lineItems.map((item, idx) => (
                          <Tr key={idx}>
                            <Td><Input size="sm" value={item.name} placeholder="Naziv" onChange={(e) => { const n = [...lineItems]; n[idx] = { ...n[idx], name: e.target.value }; setLineItems(n); }} /></Td>
                            <Td isNumeric><Input size="sm" w={{ base: 'full', md: '70px' }} type="number" value={item.qty} min={1} textAlign="right" onChange={(e) => { const n = [...lineItems]; n[idx] = { ...n[idx], qty: Number(e.target.value) || 1 }; setLineItems(n); }} /></Td>
                            <Td isNumeric><Input size="sm" w={{ base: 'full', md: '90px' }} type="number" value={item.price} textAlign="right" onChange={(e) => { const n = [...lineItems]; n[idx] = { ...n[idx], price: Number(e.target.value) || 0 }; setLineItems(n); }} /></Td>
                            <Td isNumeric fontWeight="medium">{(item.qty * item.price).toFixed(2)}</Td>
                            <Td>{lineItems.length > 1 && <IconButton aria-label="Ukloni" icon={<DeleteIcon />} size="xs" variant="ghost" colorScheme="red" onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} />}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                    <Card bg="gray.50"><CardBody py={2}><Flex justify="space-between"><Text fontWeight="bold">UKUPNO:</Text><Text fontWeight="bold" color="red.600">{calcTotal().toFixed(2)} KM</Text></Flex></CardBody></Card>
                  </Box>
                )}

                <FormControl mb={4}><FormLabel>Bilješke</FormLabel><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></FormControl>

                {/* Attachment for variable (whole expense) */}
                {!selectedCategory.isFixed && (<>
                  <Divider my={3} />
                  <FormControl><FormLabel>Prilog (skenirana faktura)</FormLabel>
                    {attachmentNames.map((name, i) => (
                      <Flex key={i} align="center" gap={2} bg="green.50" p={1} px={2} rounded="md" mb={1}>
                        <Text fontSize="sm" flex={1}>{name}</Text>
                        <IconButton aria-label="Ukloni" icon={<DeleteIcon />} size="xs" variant="ghost" colorScheme="red"
                          onClick={() => { setAttachmentUploadIds((p) => p.filter((_, idx) => idx !== i)); setAttachmentNames((p) => p.filter((_, idx) => idx !== i)); }} />
                      </Flex>
                    ))}
                    <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleUploadAtt(e.target.files[0])} />
                    <Button size="sm" onClick={() => fileRef.current?.click()} isLoading={uploadingAtt}>Dodaj prilog</Button>
                  </FormControl>
                </>)}
              </>)}
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>Odustani</Button>
              <Button colorScheme="brand" onClick={handleSaveExpense} isLoading={saving} isDisabled={!selectedCategory}>Sačuvaj</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    );
  }

  // Book list view
  return (
    <>
      <Flex justify="flex-end" mb={3}>
        {isCurrentBookOpen ? (
          <HStack spacing={2}>
            <Badge colorScheme="green">Otvoreno</Badge>
            <Text fontSize="sm" color="gray.600">
              Knjiga za tekući mjesec {MONTHS[currentMonth]} {currentYear} je otvorena do {formatDateBs(currentMonthEnd)}.
            </Text>
          </HStack>
        ) : (
          <Button size="sm" colorScheme="brand" onClick={openCurrentMonth}>Otvori tekući mjesec</Button>
        )}
      </Flex>
      <Box bg="white" rounded="lg" shadow="sm" overflow="auto">
        <Table size="sm">
          <Thead><Tr><Th>Godina</Th><Th>Mjesec</Th><Th>Otvorena</Th><Th>Status</Th><Th textAlign="right">Akcije</Th></Tr></Thead>
          <Tbody>
            {books.length === 0 ? (
              <Tr><Td colSpan={5}><Text color="gray.500">{t('common.noData')}</Text></Td></Tr>
            ) : books.map((b) => (
              <Tr key={b.id} cursor="pointer" _hover={{ bg: 'gray.50' }} onClick={() => openBook(b)}>
                <Td>{b.year}</Td><Td>{MONTHS[b.month]}</Td>
                <Td>{new Date(b.openedAt).toLocaleDateString('bs-BA')}</Td>
                <Td><Badge colorScheme={b.isClosed ? 'red' : 'green'}>{b.isClosed ? 'Zatvorena' : 'Otvorena'}</Badge></Td>
                <Td textAlign="right" onClick={(e) => e.stopPropagation()}>
                  {!b.isClosed && <IconButton aria-label="Zatvori" icon={<LockIcon />} size="xs" variant="ghost" colorScheme="red" onClick={() => closeBook(b.id)} />}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </>
  );
}

/* ═══════════ Expense Categories Tab - with inline template management ═══════════ */
function ExpenseCategoriesTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', templateId: '', isActive: true, isFixed: false });

  // Template modal
  const { isOpen: isTplOpen, onOpen: onTplOpen, onClose: onTplClose } = useDisclosure();
  const [tplEditId, setTplEditId] = useState<string | null>(null);
  const [tplForm, setTplForm] = useState({ name: '', description: '', requiresAttachmentPerItem: false });
  const [newField, setNewField] = useState({ fieldName: '', defaultValue: '' });

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<ExpenseCategory[]>('/api/expense-categories'),
      api.get<ExpenseTemplate[]>('/api/expense-templates').then(async (r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        return Promise.all(list.map((tpl) => api.get<ExpenseTemplate>(`/api/expense-templates/${tpl.id}`).then((res) => res.data).catch(() => tpl)));
      }),
    ]).then(([catRes, tpls]) => {
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setTemplates(tpls);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  // Category CRUD
  const openCatForm = (cat?: ExpenseCategory) => {
    if (cat) { setEditId(cat.id); setForm({ name: cat.name, description: cat.description ?? '', templateId: cat.templateId ?? '', isActive: cat.isActive, isFixed: cat.isFixed ?? false }); }
    else { setEditId(null); setForm({ name: '', description: '', templateId: '', isActive: true, isFixed: false }); }
    onOpen();
  };

  const handleSaveCat = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name: form.name, description: form.description || undefined, isActive: form.isActive, isFixed: form.isFixed };
      if (form.templateId) payload.templateId = form.templateId;
      if (editId) await api.patch(`/api/expense-categories/${editId}`, payload);
      else { if (!form.templateId) { toast({ title: 'Odaberite šablon', status: 'warning', isClosable: true }); setSaving(false); return; } await api.post('/api/expense-categories', payload); }
      toast({ title: 'Sačuvano', status: 'success', isClosable: true }); loadData(); onClose();
    } catch { toast({ title: 'Greška', status: 'error', isClosable: true }); }
    finally { setSaving(false); }
  };

  // Template CRUD
  const openTplForm = (tpl?: ExpenseTemplate) => {
    if (tpl) { setTplEditId(tpl.id); setTplForm({ name: tpl.name, description: tpl.description ?? '', requiresAttachmentPerItem: tpl.requiresAttachmentPerItem }); }
    else { setTplEditId(null); setTplForm({ name: '', description: '', requiresAttachmentPerItem: false }); }
    onTplOpen();
  };

  const handleSaveTpl = async () => {
    if (!tplForm.name) return;
    setSaving(true);
    try {
      if (tplEditId) await api.patch(`/api/expense-templates/${tplEditId}`, tplForm);
      else await api.post('/api/expense-templates', tplForm);
      toast({ title: 'Šablon sačuvan', status: 'success', isClosable: true }); loadData(); onTplClose();
    } catch { toast({ title: 'Greška', status: 'error', isClosable: true }); }
    finally { setSaving(false); }
  };

  const handleAddField = async (templateId: string) => {
    if (!newField.fieldName) return;
    try {
      await api.post(`/api/expense-templates/${templateId}/fields`, {
        fieldName: newField.fieldName, fieldType: 'CURRENCY', isRequired: true, sortOrder: 0,
        defaultValue: newField.defaultValue || undefined,
      });
      toast({ title: 'Stavka dodana', status: 'success', isClosable: true });
      setNewField({ fieldName: '', defaultValue: '' }); loadData();
    } catch { toast({ title: 'Greška', status: 'error', isClosable: true }); }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!window.confirm('Obrisati stavku?')) return;
    try { await api.delete(`/api/expense-templates/fields/${fieldId}`); loadData(); } catch { toast({ title: 'Greška', status: 'error', isClosable: true }); }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <Flex justify="space-between" mb={4}>
        <Button size="sm" leftIcon={<AddIcon />} colorScheme="brand" onClick={() => openCatForm()}>Nova Kategorija</Button>
        <Button size="sm" leftIcon={<AddIcon />} variant="outline" onClick={() => openTplForm()}>Novi Šablon</Button>
      </Flex>

      {/* Categories list */}
      <Text fontWeight="bold" mb={2}>Kategorije rashoda</Text>
      <Box bg="white" rounded="lg" shadow="sm" overflow="auto" mb={6}>
        <Table size="sm">
          <Thead><Tr><Th>Naziv</Th><Th>Šablon</Th><Th>Tip</Th><Th>Status</Th><Th textAlign="right">Akcije</Th></Tr></Thead>
          <Tbody>
            {categories.length === 0 ? (
              <Tr><Td colSpan={5}><Text color="gray.500">{t('common.noData')}</Text></Td></Tr>
            ) : categories.map((c) => (
              <Tr key={c.id}>
                <Td fontWeight="medium">{c.name}</Td>
                <Td>{c.template?.name ?? '-'}</Td>
                <Td><Badge colorScheme={c.isFixed ? 'purple' : 'blue'}>{c.isFixed ? 'Fiksno (Doprinosi)' : 'Varijabilno (Fakture)'}</Badge></Td>
                <Td><Badge colorScheme={c.isActive ? 'green' : 'gray'}>{c.isActive ? 'Aktivna' : 'Neaktivna'}</Badge></Td>
                <Td textAlign="right"><IconButton aria-label="Uredi" icon={<EditIcon />} size="xs" variant="ghost" colorScheme="blue" onClick={() => openCatForm(c)} /></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Templates with fields */}
      <Text fontWeight="bold" mb={2}>Šabloni</Text>
      <Accordion allowMultiple>
        {templates.length === 0 ? <Text color="gray.500">{t('common.noData')}</Text> : templates.map((tpl) => (
          <AccordionItem key={tpl.id} bg="white" rounded="lg" shadow="sm" mb={3} border="1px" borderColor="gray.200">
            <AccordionButton py={3}>
              <Flex flex="1" align="center" gap={2} wrap="wrap" minW={0}>
                <Text fontWeight="bold" noOfLines={1} minW={0}>{tpl.name}</Text>
                {tpl.requiresAttachmentPerItem ? (
                  <Badge colorScheme="orange" fontSize={{ base: '2xs', md: 'xs' }}>Prilog po stavci</Badge>
                ) : (
                  <Badge colorScheme="blue" fontSize={{ base: '2xs', md: 'xs' }}>Prilog na rashod</Badge>
                )}
                <Badge colorScheme="gray" fontSize={{ base: '2xs', md: 'xs' }}>{(tpl.fields ?? []).length} stavki</Badge>
              </Flex>
              <HStack spacing={1} mr={2} onClick={(e) => e.stopPropagation()} flexShrink={0}>
                <IconButton aria-label="Uredi" icon={<EditIcon />} size={{ base: 'sm', md: 'xs' }} variant="ghost" colorScheme="blue" onClick={() => openTplForm(tpl)} />
              </HStack>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel>
              {tpl.requiresAttachmentPerItem ? (<>
                {/* Fixed template: show items */}
                {(tpl.fields ?? []).length > 0 ? (
                  <Box overflowX="auto">
                    <Table size="sm" mb={3}>
                    <Thead><Tr><Th>Naziv stavke</Th><Th isNumeric>Default cijena (KM)</Th><Th textAlign="right">Akcije</Th></Tr></Thead>
                    <Tbody>
                      {(tpl.fields ?? []).map((f) => (
                        <Tr key={f.id}>
                          <Td fontWeight="medium">{f.fieldName}</Td>
                          <Td isNumeric>{f.defaultValue ? Number(f.defaultValue).toFixed(2) : '-'}</Td>
                          <Td textAlign="right"><IconButton aria-label="Obriši" icon={<DeleteIcon />} size="xs" variant="ghost" colorScheme="red" onClick={() => handleDeleteField(f.id)} /></Td>
                        </Tr>
                      ))}
                    </Tbody>
                    </Table>
                  </Box>
                ) : <Text fontSize="sm" color="gray.500" mb={3}>Nema stavki.</Text>}
                <Divider mb={3} />
                <Text fontSize="sm" fontWeight="bold" mb={2}>Dodaj stavku:</Text>
                <Flex gap={2} align="flex-end" direction={{ base: 'column', md: 'row' }}>
                  <FormControl maxW={{ base: 'full', md: '200px' }}><FormLabel fontSize="xs">Naziv (npr. PIO)</FormLabel>
                    <Input size="sm" value={newField.fieldName} onChange={(e) => setNewField({ ...newField, fieldName: e.target.value })} placeholder="PIO, Zdravstvo..." /></FormControl>
                  <FormControl maxW={{ base: 'full', md: '130px' }}><FormLabel fontSize="xs">Default cijena</FormLabel>
                    <Input size="sm" type="number" value={newField.defaultValue} onChange={(e) => setNewField({ ...newField, defaultValue: e.target.value })} placeholder="50.00" /></FormControl>
                  <Button size="sm" colorScheme="green" onClick={() => handleAddField(tpl.id)}>Dodaj</Button>
                </Flex>
              </>) : (
                <Text fontSize="sm" color="gray.500">
                  Ovaj šablon je za fakture — stavke se dodaju ručno prilikom kreiranja rashoda (naziv, količina, cijena).
                  Prilog (skenirana faktura) ide na kompletan rashod.
                </Text>
              )}
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Category Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay /><ModalContent>
          <ModalHeader>{editId ? 'Uredi Kategoriju' : 'Nova Kategorija'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4} isRequired><FormLabel>Naziv</FormLabel><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormControl>
            <FormControl mb={4}><FormLabel>Opis</FormLabel><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></FormControl>
            <FormControl mb={4} isRequired={!editId}>
              <FormLabel>Šablon</FormLabel>
              <Select placeholder="Odaberite šablon" value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}>
                {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name} {tpl.requiresAttachmentPerItem ? '(Doprinosi)' : '(Fakture)'}</option>)}
              </Select>
            </FormControl>
            <FormControl mb={4} display="flex" alignItems="center">
              <FormLabel mb="0">Fiksno (doprinosi - unaprijed definirane stavke)</FormLabel>
              <Switch isChecked={form.isFixed} onChange={(e) => setForm({ ...form, isFixed: e.target.checked })} colorScheme="purple" />
            </FormControl>
            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Aktivna</FormLabel>
              <Switch isChecked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} colorScheme="brand" />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Odustani</Button>
            <Button colorScheme="brand" onClick={handleSaveCat} isLoading={saving}>Sačuvaj</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Template Modal */}
      <Modal isOpen={isTplOpen} onClose={onTplClose}>
        <ModalOverlay /><ModalContent>
          <ModalHeader>{tplEditId ? 'Uredi Šablon' : 'Novi Šablon'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4} isRequired><FormLabel>Naziv šablona</FormLabel><Input value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} placeholder="Doprinosi, Faktura materijala..." /></FormControl>
            <FormControl mb={4}><FormLabel>Opis</FormLabel><Textarea value={tplForm.description} onChange={(e) => setTplForm({ ...tplForm, description: e.target.value })} rows={2} /></FormControl>
            <FormControl display="flex" alignItems="center">
              <FormLabel mb="0">Prilog po stavci (uplatnice za doprinose)</FormLabel>
              <Switch isChecked={tplForm.requiresAttachmentPerItem} onChange={(e) => setTplForm({ ...tplForm, requiresAttachmentPerItem: e.target.checked })} colorScheme="brand" />
            </FormControl>
            <Text fontSize="xs" color="gray.500" mt={2}>
              {tplForm.requiresAttachmentPerItem
                ? 'DA — Šablon za doprinose: definirate fiksne stavke sa cijenama, prilog (uplatnica) uz svaku stavku.'
                : 'NE — Šablon za fakture: stavke se dodaju ručno (naziv, količina, cijena). Prilog ide na kompletan rashod.'}
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onTplClose}>Odustani</Button>
            <Button colorScheme="brand" onClick={handleSaveTpl} isLoading={saving}>Sačuvaj</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
