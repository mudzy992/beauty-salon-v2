import { useEffect, useState, useMemo } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Spinner, Text,
  Badge, Flex, Input, useToast, SimpleGrid, Card,
  CardBody, Stat, StatLabel, StatNumber, StatHelpText, HStack,
  InputGroup, InputLeftElement, Button,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalCloseButton, useDisclosure, VStack, Progress, IconButton,
  Tabs, TabList, TabPanels, TabPanel, Tab,
  FormControl, FormLabel,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { SearchIcon, StarIcon, ViewIcon, WarningIcon, ArrowBackIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';

interface UserOption {
  id: string; username: string; firstName: string | null;
  lastName: string | null; email: string | null; phone: string | null;
  isActive: boolean; createdAt: string;
  userRoles?: { role: { name: string } }[];
}

interface ManualEntry {
  id: string; date: string; actualPrice: string | number; tipAmount: string | number;
  isManual: boolean; notes: string | null; status: string;
  service?: { id: string; name: string; price: number | string };
  stylistProfile?: { user?: { firstName: string | null; lastName: string | null; username: string } };
}

interface ClientAnalyticsData {
  fromDate: string | null;
  toDate: string | null;
  user: {
    id: string; username: string; email: string | null; firstName: string | null;
    lastName: string | null; phone: string | null; isActive: boolean; createdAt: string;
    userRoles?: { role: { name: string } }[];
  };
  stats: {
    totalReservations: number; completedReservations: number; cancelledReservations: number;
    noShowCount: number; totalSpent: number; manualEntryCount: number; manualSpent: number;
    avgServiceRating: number | null; reviewCount: number;
  };
  penalty: { cancellationCount: number; penaltyUntil: string | null; isPenalized: boolean; };
  topServices: { name: string; count: number; totalSpent: number }[];
  reservations: {
    id: string; reservationDate: string; startTime: string; endTime: string; status: string;
    clientNotes: string | null; cancelReason: string | null; cancelledAt: string | null;
    service?: { id: string; name: string; price: number | string };
    confirmedStylist?: { user?: { firstName: string | null; lastName: string | null; username: string } };
  }[];
  reviews: {
    id: string; serviceRating: number; stylistRating: number | null; comment: string | null;
    isApproved: boolean; createdAt: string;
    service?: { name: string };
    stylist?: { user?: { firstName: string | null; lastName: string | null; username: string } };
  }[];
  manualEntries: ManualEntry[];
}

const statusColors: Record<string, string> = {
  PENDING: 'yellow', STYLIST_REVIEW: 'orange', CONFIRMED: 'blue', ATTENDANCE_CONFIRMED: 'cyan',
  IN_PROGRESS: 'purple', COMPLETED: 'green', CANCELLED_BY_CLIENT: 'red', CANCELLED_BY_STYLISTS: 'red', NO_SHOW: 'gray',
};
const statusLabels: Record<string, string> = {
  PENDING: 'Na čekanju', STYLIST_REVIEW: 'Pregled stiliste', CONFIRMED: 'Potvrđeno',
  ATTENDANCE_CONFIRMED: 'Dolazak potvrđen', IN_PROGRESS: 'U toku', COMPLETED: 'Završeno',
  CANCELLED_BY_CLIENT: 'Otkazano (klijent)', CANCELLED_BY_STYLISTS: 'Otkazano (stilist)', NO_SHOW: 'Nije došao/la',
};

const PAGE_SIZE = 15;

export default function ClientAnalytics() {
  const { t } = useTranslation();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(searchParams.get('userId'));
  const [analytics, setAnalytics] = useState<ClientAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(searchParams.get('fromDate') ?? '');
  const [dateTo, setDateTo] = useState(searchParams.get('toDate') ?? '');

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [detailReservation, setDetailReservation] = useState<ClientAnalyticsData['reservations'][0] | null>(null);
  const [detailReview, setDetailReview] = useState<ClientAnalyticsData['reviews'][0] | null>(null);

  useEffect(() => {
    setListLoading(true);
    api.get<UserOption[]>('/api/users')
      .then((r) => setUsers(Array.isArray(r.data) ? r.data : []))
      .catch(() => setUsers([]))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    const uid = searchParams.get('userId');
    const from = searchParams.get('fromDate') ?? undefined;
    const to = searchParams.get('toDate') ?? undefined;
    if (uid && !analytics) selectUser(uid, from, to);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter((u) =>
      u.username.toLowerCase().includes(q) ||
      (u.firstName?.toLowerCase().includes(q)) ||
      (u.lastName?.toLowerCase().includes(q)) ||
      (u.email?.toLowerCase().includes(q)) ||
      (u.phone?.includes(q))
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search]);

  const selectUser = async (userId: string, from?: string, to?: string) => {
    setSelectedUserId(userId);
    if (from) setDateFrom(from);
    if (to) setDateTo(to);
    const params: Record<string, string> = { userId };
    if (from) params.fromDate = from;
    if (to) params.toDate = to;
    setSearchParams(params);
    setLoading(true);
    try {
      const queryParams = (from && to) ? { fromDate: from, toDate: to } : {};
      const { data } = await api.get<ClientAnalyticsData>(`/api/users/${userId}/analytics`, { params: queryParams });
      setAnalytics(data);
    } catch {
      toast({ title: 'Greška pri učitavanju analitike', status: 'error', isClosable: true });
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilter = () => {
    if (selectedUserId && dateFrom && dateTo) selectUser(selectedUserId, dateFrom, dateTo);
  };

  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
    if (selectedUserId) selectUser(selectedUserId);
  };

  const goBack = () => { setSelectedUserId(null); setAnalytics(null); setSearchParams({}); };

  const openReservationDetail = (r: ClientAnalyticsData['reservations'][0]) => {
    setDetailReservation(r); setDetailReview(null); onOpen();
  };
  const openReviewDetail = (r: ClientAnalyticsData['reviews'][0]) => {
    setDetailReview(r); setDetailReservation(null); onOpen();
  };

  const getStylistName = (s?: { user?: { firstName: string | null; lastName: string | null; username: string } }) => {
    if (!s?.user) return '-';
    return `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim() || s.user.username;
  };

  const renderStars = (rating: number, max = 5) =>
    Array.from({ length: max }, (_, i) => (
      <StarIcon key={i} color={i < rating ? 'yellow.400' : 'gray.200'} boxSize={3} />
    ));

  const getUserName = (u: { firstName: string | null; lastName: string | null; username: string }) =>
    [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username;

  // ────────── CLIENT LIST VIEW ──────────
  if (!selectedUserId) {
    return (
      <Box>
        <Heading size="lg" mb={6}>Analitika Klijenata</Heading>

        <InputGroup maxW="400px" mb={4}>
          <InputLeftElement><SearchIcon color="gray.400" /></InputLeftElement>
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Pretražite po imenu, emailu, telefonu..." bg="white"
          />
        </InputGroup>

        <Box bg="white" rounded="lg" shadow="sm" overflow="auto">
          {listLoading ? (
            <Box p={6} textAlign="center"><Spinner size="lg" /></Box>
          ) : (
            <Table size="sm">
              <Thead>
                <Tr><Th>Ime i Prezime</Th><Th>Email</Th><Th>Telefon</Th><Th>Uloge</Th><Th>Status</Th><Th>Registrovan</Th><Th textAlign="right">Akcije</Th></Tr>
              </Thead>
              <Tbody>
                {pagedUsers.length === 0 ? (
                  <Tr><Td colSpan={7}><Text color="gray.500">{t('common.noData')}</Text></Td></Tr>
                ) : pagedUsers.map((u) => (
                  <Tr key={u.id} _hover={{ bg: 'gray.50' }}>
                    <Td fontWeight="medium">{getUserName(u)}</Td>
                    <Td>{u.email ?? '-'}</Td>
                    <Td>{u.phone ?? '-'}</Td>
                    <Td>
                      <Flex gap={1} flexWrap="wrap">
                        {u.userRoles?.map((r) => (
                          <Badge key={r.role.name} colorScheme={r.role.name === 'SYSTEM_ADMIN' ? 'red' : r.role.name === 'OWNER' ? 'purple' : r.role.name === 'STYLIST' ? 'blue' : 'green'} fontSize="xs">{r.role.name}</Badge>
                        ))}
                      </Flex>
                    </Td>
                    <Td><Badge colorScheme={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Aktivan' : 'Neaktivan'}</Badge></Td>
                    <Td fontSize="xs">{new Date(u.createdAt).toLocaleDateString('bs-BA')}</Td>
                    <Td textAlign="right">
                      <Button size="xs" colorScheme="brand" variant="outline" leftIcon={<ViewIcon />} onClick={() => selectUser(u.id)}>Analitika</Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>

        {totalPages > 1 && (
          <Flex justify="space-between" align="center" mt={4}>
            <Text fontSize="sm" color="gray.500">{filteredUsers.length} korisnika ukupno</Text>
            <HStack>
              <IconButton aria-label="Prethodna" icon={<ChevronLeftIcon />} size="sm" isDisabled={page === 0} onClick={() => setPage(page - 1)} />
              <Text fontSize="sm">{page + 1} / {totalPages}</Text>
              <IconButton aria-label="Sljedeća" icon={<ChevronRightIcon />} size="sm" isDisabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} />
            </HStack>
          </Flex>
        )}
      </Box>
    );
  }

  // ────────── ANALYTICS DETAIL VIEW ──────────
  return (
    <Box>
      <Button leftIcon={<ArrowBackIcon />} variant="ghost" mb={4} onClick={goBack}>Nazad na listu</Button>

      {loading && <Box textAlign="center" py={10}><Spinner size="xl" /></Box>}

      {analytics && !loading && (
        <>
          <Flex mb={4} gap={3} wrap="wrap" align="flex-end">
            <FormControl w="auto" maxW="160px">
              <FormLabel fontSize="sm">Od datuma</FormLabel>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} size="sm" />
            </FormControl>
            <FormControl w="auto" maxW="160px">
              <FormLabel fontSize="sm">Do datuma</FormLabel>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} size="sm" />
            </FormControl>
            <Button size="sm" colorScheme="brand" onClick={applyDateFilter} isDisabled={!dateFrom || !dateTo}>
              Primijeni period
            </Button>
            <Button size="sm" variant="outline" onClick={clearDateFilter}>
              Cijeli period
            </Button>
            {(analytics.fromDate || analytics.toDate) && (
              <Text fontSize="sm" color="gray.500" alignSelf="center">
                Prikaz: {analytics.fromDate} – {analytics.toDate}
              </Text>
            )}
          </Flex>

          {/* Client header */}
          <Card mb={6} bg="white">
            <CardBody>
              <Flex justify="space-between" align="start" wrap="wrap" gap={4}>
                <Box>
                  <Heading size="md">{getUserName(analytics.user)}</Heading>
                  <Text color="gray.500">{analytics.user.email}</Text>
                  <HStack mt={1}>
                    <Text fontSize="sm" color="gray.500">Telefon: {analytics.user.phone ?? '-'}</Text>
                    <Badge colorScheme={analytics.user.isActive ? 'green' : 'red'}>{analytics.user.isActive ? 'Aktivan' : 'Neaktivan'}</Badge>
                    {analytics.user.userRoles?.map((r) => (
                      <Badge key={r.role.name} colorScheme="blue" variant="subtle">{r.role.name}</Badge>
                    ))}
                  </HStack>
                  <Text fontSize="xs" color="gray.400" mt={1}>Registrovan: {new Date(analytics.user.createdAt).toLocaleDateString('bs-BA')}</Text>
                </Box>
                {analytics.penalty.isPenalized && (
                  <Card bg="red.50" borderColor="red.200" borderWidth={1}>
                    <CardBody py={2} px={4}>
                      <HStack><WarningIcon color="red.500" /><Text fontWeight="bold" color="red.600">PENALIZIRAN</Text></HStack>
                      <Text fontSize="sm" color="red.500">Do: {analytics.penalty.penaltyUntil ? new Date(analytics.penalty.penaltyUntil).toLocaleDateString('bs-BA') : '-'}</Text>
                    </CardBody>
                  </Card>
                )}
              </Flex>
            </CardBody>
          </Card>

          {/* Stats cards */}
          <SimpleGrid columns={{ base: 2, md: 4, lg: 5 }} spacing={3} mb={6}>
            <Card size="sm"><CardBody><Stat size="sm"><StatLabel>Rezervacije</StatLabel><StatNumber>{analytics.stats.totalReservations}</StatNumber><StatHelpText>{analytics.stats.completedReservations} završenih</StatHelpText></Stat></CardBody></Card>
            <Card size="sm"><CardBody><Stat size="sm"><StatLabel>Otkazane / No-show</StatLabel><StatNumber color="red.500">{analytics.stats.cancelledReservations} / {analytics.stats.noShowCount}</StatNumber></Stat></CardBody></Card>
            <Card size="sm"><CardBody><Stat size="sm"><StatLabel>Manuelni unosi</StatLabel><StatNumber>{analytics.stats.manualEntryCount}</StatNumber><StatHelpText>{Number(analytics.stats.manualSpent).toFixed(2)} KM</StatHelpText></Stat></CardBody></Card>
            <Card size="sm"><CardBody><Stat size="sm"><StatLabel>Ukupno potrošeno</StatLabel><StatNumber color="green.600">{Number(analytics.stats.totalSpent).toFixed(2)}</StatNumber><StatHelpText>KM (rezervacije + manuelno)</StatHelpText></Stat></CardBody></Card>
            <Card size="sm" bg={analytics.penalty.isPenalized ? 'red.50' : undefined}><CardBody><Stat size="sm"><StatLabel>Penali</StatLabel><StatNumber color={analytics.penalty.cancellationCount > 0 ? 'orange.500' : undefined}>{analytics.penalty.cancellationCount} otkazivanja</StatNumber><StatHelpText>{analytics.penalty.isPenalized ? 'Penaliziran' : 'OK'}</StatHelpText></Stat></CardBody></Card>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mb={6}>
            <Card size="sm"><CardBody><Stat size="sm"><StatLabel>Prosječna ocjena</StatLabel><StatNumber>{analytics.stats.avgServiceRating ?? '-'}</StatNumber><StatHelpText>od {analytics.stats.reviewCount} recenzija</StatHelpText></Stat></CardBody></Card>
            {analytics.stats.totalReservations > 0 && (
              <Card size="sm"><CardBody>
                <Flex justify="space-between" mb={1}>
                  <Text fontSize="sm" fontWeight="bold">Stopa završavanja</Text>
                  <Text fontSize="sm" fontWeight="bold">{Math.round((analytics.stats.completedReservations / analytics.stats.totalReservations) * 100)}%</Text>
                </Flex>
                <Progress value={(analytics.stats.completedReservations / analytics.stats.totalReservations) * 100} colorScheme="green" rounded="md" size="sm" />
              </CardBody></Card>
            )}
          </SimpleGrid>

          {/* Top services */}
          {analytics.topServices.length > 0 && (
            <Card mb={6}><CardBody>
              <Text fontWeight="bold" mb={3}>Najčešći servisi</Text>
              <Table size="sm">
                <Thead><Tr><Th>Servis</Th><Th isNumeric>Broj posjeta</Th><Th isNumeric>Ukupno (KM)</Th></Tr></Thead>
                <Tbody>
                  {analytics.topServices.map((s, i) => (
                    <Tr key={i}><Td fontWeight="medium">{s.name}</Td><Td isNumeric>{s.count}</Td><Td isNumeric>{s.totalSpent.toFixed(2)}</Td></Tr>
                  ))}
                </Tbody>
              </Table>
            </CardBody></Card>
          )}

          {/* Tabs for reservations, manual entries, reviews */}
          <Tabs colorScheme="brand" variant="enclosed">
            <TabList>
              <Tab>Rezervacije ({analytics.reservations.length})</Tab>
              <Tab>Manuelni prihodi ({analytics.manualEntries.length})</Tab>
              <Tab>Recenzije ({analytics.reviews.length})</Tab>
            </TabList>
            <TabPanels>
              {/* Reservations */}
              <TabPanel px={0}>
                <Box overflow="auto" bg="white" rounded="lg" shadow="sm">
                  <Table size="sm">
                    <Thead><Tr><Th>Datum</Th><Th>Vrijeme</Th><Th>Servis</Th><Th>Stilista</Th><Th isNumeric>Cijena</Th><Th>Status</Th><Th textAlign="right">Detalji</Th></Tr></Thead>
                    <Tbody>
                      {analytics.reservations.length === 0 ? (
                        <Tr><Td colSpan={7}><Text color="gray.500">{t('common.noData')}</Text></Td></Tr>
                      ) : analytics.reservations.map((r) => (
                        <Tr key={r.id} cursor="pointer" _hover={{ bg: 'gray.50' }} onClick={() => openReservationDetail(r)}>
                          <Td>{r.reservationDate?.slice(0, 10)}</Td>
                          <Td>{r.startTime} - {r.endTime}</Td>
                          <Td>{r.service?.name ?? '-'}</Td>
                          <Td>{getStylistName(r.confirmedStylist)}</Td>
                          <Td isNumeric>{Number(r.service?.price ?? 0).toFixed(2)}</Td>
                          <Td><Badge colorScheme={statusColors[r.status] ?? 'gray'} fontSize="xs">{statusLabels[r.status] ?? r.status}</Badge></Td>
                          <Td textAlign="right"><IconButton aria-label="Detalji" icon={<ViewIcon />} size="xs" variant="ghost" /></Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </TabPanel>

              {/* Manual entries */}
              <TabPanel px={0}>
                <Box overflow="auto" bg="white" rounded="lg" shadow="sm">
                  <Table size="sm">
                    <Thead><Tr><Th>Datum</Th><Th>Servis</Th><Th>Stilista</Th><Th isNumeric>Cijena (KM)</Th><Th isNumeric>Napojnica (KM)</Th><Th>Izvor</Th><Th>Bilješka</Th></Tr></Thead>
                    <Tbody>
                      {analytics.manualEntries.length === 0 ? (
                        <Tr><Td colSpan={7}><Text color="gray.500">{t('common.noData')}</Text></Td></Tr>
                      ) : analytics.manualEntries.map((e) => (
                        <Tr key={e.id}>
                          <Td>{typeof e.date === 'string' ? e.date.slice(0, 10) : '-'}</Td>
                          <Td>{e.service?.name ?? '-'}</Td>
                          <Td>{getStylistName(e.stylistProfile)}</Td>
                          <Td isNumeric fontWeight="medium">{Number(e.actualPrice).toFixed(2)}</Td>
                          <Td isNumeric>{Number(e.tipAmount).toFixed(2)}</Td>
                          <Td><Badge colorScheme={e.isManual ? 'purple' : 'blue'} fontSize="xs">{e.isManual ? 'Manuelno' : 'Rezervacija'}</Badge></Td>
                          <Td maxW="200px"><Text noOfLines={1} fontSize="xs">{e.notes ?? '-'}</Text></Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </TabPanel>

              {/* Reviews */}
              <TabPanel px={0}>
                {analytics.reviews.length === 0 ? (
                  <Text color="gray.500">{t('common.noData')}</Text>
                ) : (
                  <VStack align="stretch" spacing={3}>
                    {analytics.reviews.map((r) => (
                      <Card key={r.id} variant="outline" size="sm" cursor="pointer" _hover={{ shadow: 'md' }} onClick={() => openReviewDetail(r)}>
                        <CardBody py={3}>
                          <Flex justify="space-between" align="start">
                            <Box>
                              <HStack mb={1}>
                                <Text fontWeight="medium">{r.service?.name ?? '-'}</Text>
                                <Badge colorScheme={r.isApproved ? 'green' : 'yellow'}>{r.isApproved ? 'Odobreno' : 'Na čekanju'}</Badge>
                              </HStack>
                              <HStack spacing={1}>
                                <Text fontSize="xs" color="gray.500">Servis:</Text>
                                {renderStars(r.serviceRating)}
                                {r.stylistRating != null && (<>
                                  <Text fontSize="xs" color="gray.500" ml={2}>Stilista:</Text>
                                  {renderStars(r.stylistRating)}
                                </>)}
                              </HStack>
                              {r.comment && <Text fontSize="sm" mt={1} color="gray.600" noOfLines={2}>{r.comment}</Text>}
                            </Box>
                            <Text fontSize="xs" color="gray.400">{new Date(r.createdAt).toLocaleDateString('bs-BA')}</Text>
                          </Flex>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </>
      )}

      {/* Detail modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          {detailReservation && (
            <>
              <ModalHeader>Detalji Rezervacije</ModalHeader>
              <ModalCloseButton />
              <ModalBody pb={6}>
                <SimpleGrid columns={2} spacing={4}>
                  <Box><Text fontSize="xs" color="gray.500">Datum</Text><Text fontWeight="bold">{detailReservation.reservationDate?.slice(0, 10)}</Text></Box>
                  <Box><Text fontSize="xs" color="gray.500">Vrijeme</Text><Text fontWeight="bold">{detailReservation.startTime} - {detailReservation.endTime}</Text></Box>
                  <Box><Text fontSize="xs" color="gray.500">Servis</Text><Text>{detailReservation.service?.name ?? '-'}</Text></Box>
                  <Box><Text fontSize="xs" color="gray.500">Cijena</Text><Text>{Number(detailReservation.service?.price ?? 0).toFixed(2)} KM</Text></Box>
                  <Box><Text fontSize="xs" color="gray.500">Stilista</Text><Text>{getStylistName(detailReservation.confirmedStylist)}</Text></Box>
                  <Box><Text fontSize="xs" color="gray.500">Status</Text><Badge colorScheme={statusColors[detailReservation.status]}>{statusLabels[detailReservation.status] ?? detailReservation.status}</Badge></Box>
                  {detailReservation.clientNotes && <Box gridColumn="span 2"><Text fontSize="xs" color="gray.500">Bilješke klijenta</Text><Text>{detailReservation.clientNotes}</Text></Box>}
                  {detailReservation.cancelReason && <Box gridColumn="span 2"><Text fontSize="xs" color="gray.500">Razlog otkazivanja</Text><Text color="red.500">{detailReservation.cancelReason}</Text></Box>}
                  {detailReservation.cancelledAt && <Box><Text fontSize="xs" color="gray.500">Otkazano</Text><Text>{new Date(detailReservation.cancelledAt).toLocaleDateString('bs-BA')}</Text></Box>}
                </SimpleGrid>
              </ModalBody>
            </>
          )}
          {detailReview && (
            <>
              <ModalHeader>Detalji Recenzije</ModalHeader>
              <ModalCloseButton />
              <ModalBody pb={6}>
                <SimpleGrid columns={2} spacing={4}>
                  <Box><Text fontSize="xs" color="gray.500">Servis</Text><Text fontWeight="bold">{detailReview.service?.name ?? '-'}</Text></Box>
                  <Box><Text fontSize="xs" color="gray.500">Stilista</Text><Text>{getStylistName(detailReview.stylist)}</Text></Box>
                  <Box><Text fontSize="xs" color="gray.500">Ocjena servisa</Text><HStack>{renderStars(detailReview.serviceRating)}<Text fontSize="sm">{detailReview.serviceRating}/5</Text></HStack></Box>
                  <Box><Text fontSize="xs" color="gray.500">Ocjena stiliste</Text>{detailReview.stylistRating != null ? <HStack>{renderStars(detailReview.stylistRating)}<Text fontSize="sm">{detailReview.stylistRating}/5</Text></HStack> : <Text>-</Text>}</Box>
                  <Box><Text fontSize="xs" color="gray.500">Status</Text><Badge colorScheme={detailReview.isApproved ? 'green' : 'yellow'}>{detailReview.isApproved ? 'Odobreno' : 'Na čekanju'}</Badge></Box>
                  <Box><Text fontSize="xs" color="gray.500">Datum</Text><Text>{new Date(detailReview.createdAt).toLocaleDateString('bs-BA')}</Text></Box>
                  {detailReview.comment && <Box gridColumn="span 2"><Text fontSize="xs" color="gray.500">Komentar</Text><Text bg="gray.50" p={3} rounded="md">{detailReview.comment}</Text></Box>}
                </SimpleGrid>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </Box>
  );
}
