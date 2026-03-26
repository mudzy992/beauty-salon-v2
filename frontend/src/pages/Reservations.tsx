import { useEffect, useState, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Spinner, Text,
  Badge, Flex, Select, Input, Button, useToast, useDisclosure,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalCloseButton, ModalFooter, VStack, HStack, Divider,
  IconButton, Textarea, Link, useBreakpointValue, SimpleGrid,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { ViewIcon } from '@chakra-ui/icons';
import api from '../api/client';
import { useSocketEvent } from '../context/SocketContext';

/** Klijent u rezervaciji – backend vraća User direktno (client: { id, firstName, lastName, ... }) */
interface ReservationClient {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string;
  email?: string;
  phone?: string | null;
}

interface Reservation {
  id: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  status: string;
  clientNotes: string | null;
  cancelReason: string | null;
  createdAt: string;
  client?: ReservationClient;
  service?: { id: string; name: string; durationMinutes: number; price: number | string };
  confirmedStylist?: { id: string; user?: { username: string; firstName: string | null; lastName: string | null } };
  stylistResponses?: {
    id: string;
    status: string;
    rejectionReason: string | null;
    stylistProfile?: { user?: { username: string } };
  }[];
  loyaltyDiscountPercent?: number;
  loyaltyDiscountAmount?: number | string;
  loyaltyPointsUsed?: number;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Svi statusi' },
  { value: 'PENDING', label: 'Na čekanju' },
  { value: 'STYLIST_REVIEW', label: 'Pregled stiliste' },
  { value: 'CONFIRMED', label: 'Potvrđena' },
  { value: 'ATTENDANCE_CONFIRMED', label: 'Dolazak potvrđen' },
  { value: 'IN_PROGRESS', label: 'U toku' },
  { value: 'COMPLETED', label: 'Završena' },
  { value: 'CANCELLED_BY_CLIENT', label: 'Otkazao klijent' },
  { value: 'CANCELLED_BY_STYLISTS', label: 'Otkazali stilisti' },
  { value: 'NO_SHOW', label: 'Nije došao' },
];

const statusColorMap: Record<string, string> = {
  PENDING: 'yellow',
  STYLIST_REVIEW: 'orange',
  CONFIRMED: 'blue',
  ATTENDANCE_CONFIRMED: 'cyan',
  IN_PROGRESS: 'purple',
  COMPLETED: 'green',
  CANCELLED_BY_CLIENT: 'red',
  CANCELLED_BY_STYLISTS: 'red',
  NO_SHOW: 'gray',
};

const getStatusLabel = (status: string) =>
  STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;

export default function Reservations() {
  const { t } = useTranslation();
  const toast = useToast();
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const isMobile = useBreakpointValue({ base: true, lg: false }) ?? false;

  const loadData = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    if (statusFilter) params.status = statusFilter;
    api.get<Reservation[]>('/api/reservations', { params })
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [fromDate, toDate, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  useSocketEvent('reservation:created', useCallback(() => loadData(), [loadData]));
  useSocketEvent('reservation:updated', useCallback(() => loadData(), [loadData]));
  useSocketEvent('reservation:cancelled', useCallback(() => loadData(), [loadData]));
  useSocketEvent('reservation:confirmed', useCallback(() => loadData(), [loadData]));
  useSocketEvent('reservation:stylist_response', useCallback(() => loadData(), [loadData]));

  const openDetail = async (r: Reservation) => {
    try {
      const { data } = await api.get<Reservation>(`/api/reservations/${r.id}`);
      setDetail(data);
    } catch {
      setDetail(r);
    }
    setCancelReason('');
    onOpen();
  };

  const handleCancel = async () => {
    if (!detail) return;
    try {
      await api.post(`/api/reservations/${detail.id}/cancel`, { reason: cancelReason || undefined });
      toast({ title: 'Rezervacija otkazana', status: 'success', isClosable: true });
      loadData();
      onClose();
    } catch {
      toast({ title: 'Greška pri otkazivanju', status: 'error', isClosable: true });
    }
  };

  const canCancel = (status: string) =>
    ['PENDING', 'STYLIST_REVIEW', 'CONFIRMED', 'ATTENDANCE_CONFIRMED'].includes(status);

  return (
    <Box>
      <Heading size="lg" mb={4}>{t('nav.reservations')}</Heading>

      {/* Filters */}
      <Flex gap={3} mb={4} wrap="wrap" bg="white" p={4} rounded="lg" shadow="sm">
        <Box>
          <Text fontSize="xs" color="gray.500" mb={1}>Od datuma</Text>
          <Input type="date" size="sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.500" mb={1}>Do datuma</Text>
          <Input type="date" size="sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.500" mb={1}>Status</Text>
          <Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </Box>
        <Flex align="flex-end">
          <Button size="sm" variant="outline" onClick={() => { setFromDate(''); setToDate(''); setStatusFilter(''); }}>
            Resetuj
          </Button>
        </Flex>
      </Flex>

      <Box bg="white" rounded="lg" shadow="sm" overflow="auto">
        {loading ? (
          <Box p={6} textAlign="center"><Spinner size="lg" /></Box>
        ) : isMobile ? (
          <VStack align="stretch" spacing={3} p={3}>
            {items.length === 0 ? (
              <Text color="gray.500">{t('common.noData')}</Text>
            ) : items.map((r) => (
              <Box key={r.id} borderWidth="1px" borderColor="gray.200" rounded="md" p={3} onClick={() => openDetail(r)} cursor="pointer">
                <HStack justify="space-between">
                  <Text fontWeight="medium">{String(r.reservationDate).slice(0, 10)}</Text>
                  <Badge colorScheme={statusColorMap[r.status] ?? 'gray'}>{getStatusLabel(r.status)}</Badge>
                </HStack>
                <Text fontSize="sm" color="gray.600">{r.startTime} - {r.endTime}</Text>
                <Text fontSize="sm" mt={1}>{r.service?.name ?? '-'}</Text>
                <Text fontSize="sm" color="gray.600">
                  {r.client ? ((`${r.client.firstName ?? ''} ${r.client.lastName ?? ''}`.trim() || r.client.username) || '-') : '-'}
                </Text>
              </Box>
            ))}
          </VStack>
        ) : (
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Datum</Th>
                <Th>Vrijeme</Th>
                <Th>Klijent</Th>
                <Th>Servis</Th>
                <Th isNumeric>Cijena / Loyalty</Th>
                <Th>Stilista</Th>
                <Th>Status</Th>
                <Th textAlign="right">Akcije</Th>
              </Tr>
            </Thead>
            <Tbody>
              {items.length === 0 ? (
                <Tr><Td colSpan={7}><Text color="gray.500">{t('common.noData')}</Text></Td></Tr>
              ) : (
                items.map((r) => (
                  <Tr key={r.id} cursor="pointer" _hover={{ bg: 'gray.50' }} onClick={() => openDetail(r)}>
                    <Td>{String(r.reservationDate).slice(0, 10)}</Td>
                    <Td>{r.startTime} – {r.endTime}</Td>
                    <Td>
                      {r.client ? (
                        <Link
                          as={RouterLink}
                          to={`/admin/client-analytics?userId=${r.client.id}`}
                          color="brand.600"
                          fontWeight="medium"
                          _hover={{ textDecoration: 'underline' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(`${r.client.firstName ?? ''} ${r.client.lastName ?? ''}`.trim() || r.client.username) || '-'}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </Td>
                    <Td>{r.service?.name ?? '-'}</Td>
                    <Td isNumeric>
                      {r.service && (
                        <VStack align="flex-end" spacing={0}>
                          <Text fontSize="sm" fontWeight="medium">
                            {Number(r.service.price).toFixed(2)} KM
                          </Text>
                          {(r.loyaltyDiscountPercent ?? 0) > 0 && (
                            <Text fontSize="xs" color="green.600">
                              -{r.loyaltyDiscountPercent}% ({Number(r.loyaltyDiscountAmount ?? 0).toFixed(2)} KM) →{' '}
                              <strong>
                                {(Number(r.service.price) - Number(r.loyaltyDiscountAmount ?? 0)).toFixed(2)} KM
                              </strong>
                            </Text>
                          )}
                        </VStack>
                      )}
                    </Td>
                    <Td>
                      {r.confirmedStylist ? (
                        <Link
                          as={RouterLink}
                          to={`/admin/stylist-analytics?stylistId=${r.confirmedStylist.id}`}
                          color="brand.600"
                          _hover={{ textDecoration: 'underline' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {r.confirmedStylist.user
                            ? `${r.confirmedStylist.user.firstName ?? ''} ${r.confirmedStylist.user.lastName ?? ''}`.trim() || r.confirmedStylist.user.username
                            : 'Stilista'}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </Td>
                    <Td>
                      <Badge colorScheme={statusColorMap[r.status] ?? 'gray'}>
                        {getStatusLabel(r.status)}
                      </Badge>
                    </Td>
                    <Td textAlign="right" onClick={(e) => e.stopPropagation()}>
                      <IconButton aria-label="Detalji" icon={<ViewIcon />} size="sm" variant="ghost" colorScheme="blue" onClick={() => openDetail(r)} />
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        )}
      </Box>

      {/* Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Detalji Rezervacije</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {detail && (
              <VStack align="stretch" spacing={3}>
                <Flex justify="space-between">
                  <Text fontWeight="bold">Status</Text>
                  <Badge colorScheme={statusColorMap[detail.status] ?? 'gray'} fontSize="md" px={3} py={1}>
                    {getStatusLabel(detail.status)}
                  </Badge>
                </Flex>
                <Divider />
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Datum</Text>
                    <Text fontWeight="medium">{String(detail.reservationDate).slice(0, 10)}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Vrijeme</Text>
                    <Text fontWeight="medium">{detail.startTime} – {detail.endTime}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Kreirano</Text>
                    <Text fontWeight="medium">{new Date(detail.createdAt).toLocaleString('bs-BA')}</Text>
                  </Box>
                </SimpleGrid>
                <Divider />
                <Box>
                  <Text fontSize="xs" color="gray.500">Klijent</Text>
                  <Text fontWeight="medium">
                    {detail.client
                      ? (`${detail.client.firstName ?? ''} ${detail.client.lastName ?? ''}`.trim() || detail.client.username || '-')
                      : '-'}
                  </Text>
                  {detail.client?.phone && (
                    <Text fontSize="sm" color="gray.600" mt={1}>Tel: {detail.client.phone}</Text>
                  )}
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500">Servis</Text>
                  <Text fontWeight="medium">{detail.service?.name ?? '-'}</Text>
                  {detail.service && (
                    <Text fontSize="sm" color="gray.600">
                      {detail.service.durationMinutes} min | {Number(detail.service.price).toFixed(2)} KM
                    </Text>
                  )}
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500">Potvrđeni stilista</Text>
                  <Text fontWeight="medium">
                    {detail.confirmedStylist?.user
                      ? `${detail.confirmedStylist.user.firstName ?? ''} ${detail.confirmedStylist.user.lastName ?? ''}`.trim() || detail.confirmedStylist.user.username
                      : 'Nije potvrđen'}
                  </Text>
                </Box>
                {detail.clientNotes && (
                  <Box>
                    <Text fontSize="xs" color="gray.500">Napomena klijenta</Text>
                    <Text>{detail.clientNotes}</Text>
                  </Box>
                )}
                {detail.cancelReason && (
                  <Box>
                    <Text fontSize="xs" color="gray.500">Razlog otkazivanja</Text>
                    <Text color="red.600">{detail.cancelReason}</Text>
                  </Box>
                )}

                {detail.stylistResponses && detail.stylistResponses.length > 0 && (
                  <>
                    <Divider />
                    <Text fontWeight="bold" fontSize="sm">Odgovori stilista</Text>
                    {detail.stylistResponses.map((sr) => (
                      <Flex key={sr.id} justify="space-between" align="center" bg="gray.50" p={2} rounded="md">
                        <Text fontSize="sm">{sr.stylistProfile?.user?.username ?? '-'}</Text>
                        <Badge colorScheme={
                          sr.status === 'ACCEPTED' ? 'green' :
                          sr.status === 'REJECTED' ? 'red' :
                          sr.status === 'LOCKED' ? 'orange' : 'gray'
                        }>
                          {sr.status}
                        </Badge>
                        {sr.rejectionReason && <Text fontSize="xs" color="gray.500">{sr.rejectionReason}</Text>}
                      </Flex>
                    ))}
                  </>
                )}

                {canCancel(detail.status) && (
                  <>
                    <Divider />
                    <Box>
                      <Text fontWeight="bold" fontSize="sm" mb={2}>Otkaži rezervaciju</Text>
                      <Textarea
                        placeholder="Razlog otkazivanja (opciono)"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        size="sm"
                        mb={2}
                      />
                      <Button colorScheme="red" size="sm" onClick={handleCancel}>
                        Otkaži Rezervaciju
                      </Button>
                    </Box>
                  </>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>Zatvori</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
