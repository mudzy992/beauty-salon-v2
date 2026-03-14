import { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Spinner, Text,
  Badge, IconButton, Flex, useToast, Select, HStack, Button,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalCloseButton, ModalFooter, VStack, Divider,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, DeleteIcon, StarIcon } from '@chakra-ui/icons';
import api from '../api/client';

interface Review {
  id: string;
  serviceRating: number;
  stylistRating: number | null;
  comment: string | null;
  isApproved: boolean | null;
  createdAt: string;
  service?: { name: string };
  stylistProfile?: { user?: { username: string; firstName: string | null; lastName: string | null } };
  user?: { username: string; firstName: string | null; lastName: string | null };
}

function Stars({ count }: { count: number }) {
  return (
    <HStack spacing={0}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} color={i < count ? 'yellow.400' : 'gray.300'} boxSize={3} />
      ))}
    </HStack>
  );
}

export default function Reviews() {
  const { t } = useTranslation();
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [detail, setDetail] = useState<Review | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filter === 'approved') params.approved = 'true';
    else if (filter === 'pending') params.approved = 'false';
    api.get<Review[]>('/api/reviews', { params })
      .then((r) => setReviews(Array.isArray(r.data) ? r.data : []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/api/reviews/${id}/approve`);
      toast({ title: 'Recenzija odobrena', status: 'success', isClosable: true });
      loadData();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Obrisati recenziju?')) return;
    try {
      await api.delete(`/api/reviews/${id}`);
      toast({ title: 'Recenzija obrisana', status: 'success', isClosable: true });
      loadData();
      if (detail?.id === id) onClose();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    }
  };

  const openDetail = (r: Review) => {
    setDetail(r);
    onOpen();
  };

  const getApprovalBadge = (isApproved: boolean | null) => {
    if (isApproved === true) return <Badge colorScheme="green">Odobreno</Badge>;
    if (isApproved === false) return <Badge colorScheme="red">Odbijeno</Badge>;
    return <Badge colorScheme="yellow">Na čekanju</Badge>;
  };

  const getUserName = (user?: { username: string; firstName: string | null; lastName: string | null }) => {
    if (!user) return '-';
    const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return full || user.username;
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg">{t('nav.reviews')}</Heading>
        <Select size="sm" maxW="200px" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Sve recenzije</option>
          <option value="pending">Na čekanju</option>
          <option value="approved">Odobrene</option>
        </Select>
      </Flex>

      <Box bg="white" rounded="lg" shadow="sm" overflow="auto">
        {loading ? (
          <Box p={6} textAlign="center"><Spinner size="lg" /></Box>
        ) : (
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Klijent</Th>
                <Th>Servis</Th>
                <Th>Stilista</Th>
                <Th>Ocjena servisa</Th>
                <Th>Ocjena stiliste</Th>
                <Th>Komentar</Th>
                <Th>Status</Th>
                <Th>Datum</Th>
                <Th textAlign="right">Akcije</Th>
              </Tr>
            </Thead>
            <Tbody>
              {reviews.length === 0 ? (
                <Tr><Td colSpan={9}><Text color="gray.500">{t('common.noData')}</Text></Td></Tr>
              ) : (
                reviews.map((r) => (
                  <Tr key={r.id} cursor="pointer" _hover={{ bg: 'gray.50' }} onClick={() => openDetail(r)}>
                    <Td>{getUserName(r.user)}</Td>
                    <Td>{r.service?.name ?? '-'}</Td>
                    <Td>{getUserName(r.stylistProfile?.user)}</Td>
                    <Td><Stars count={r.serviceRating} /></Td>
                    <Td>{r.stylistRating ? <Stars count={r.stylistRating} /> : '-'}</Td>
                    <Td maxW="150px" isTruncated>{r.comment ?? '-'}</Td>
                    <Td>{getApprovalBadge(r.isApproved)}</Td>
                    <Td>{new Date(r.createdAt).toLocaleDateString('bs-BA')}</Td>
                    <Td textAlign="right" onClick={(e) => e.stopPropagation()}>
                      <HStack spacing={1} justify="flex-end">
                        {r.isApproved !== true && (
                          <IconButton aria-label="Odobri" icon={<CheckIcon />} size="xs" variant="ghost" colorScheme="green" onClick={() => handleApprove(r.id)} />
                        )}
                        <IconButton aria-label="Obriši" icon={<DeleteIcon />} size="xs" variant="ghost" colorScheme="red" onClick={() => handleDelete(r.id)} />
                      </HStack>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        )}
      </Box>

      {/* Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Detalji Recenzije</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {detail && (
              <VStack align="stretch" spacing={3}>
                <Flex justify="space-between" align="center">
                  <Text fontWeight="bold">Status</Text>
                  {getApprovalBadge(detail.isApproved)}
                </Flex>
                <Divider />
                <Box>
                  <Text fontSize="xs" color="gray.500">Klijent</Text>
                  <Text fontWeight="medium">{getUserName(detail.user)}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500">Servis</Text>
                  <Text fontWeight="medium">{detail.service?.name ?? '-'}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500">Stilista</Text>
                  <Text fontWeight="medium">{getUserName(detail.stylistProfile?.user)}</Text>
                </Box>
                <Divider />
                <Flex gap={8}>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Ocjena servisa</Text>
                    <Stars count={detail.serviceRating} />
                    <Text fontSize="sm" fontWeight="bold">{detail.serviceRating}/5</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Ocjena stiliste</Text>
                    {detail.stylistRating ? (
                      <>
                        <Stars count={detail.stylistRating} />
                        <Text fontSize="sm" fontWeight="bold">{detail.stylistRating}/5</Text>
                      </>
                    ) : <Text color="gray.400">Nije ocijenjen</Text>}
                  </Box>
                </Flex>
                {detail.comment && (
                  <>
                    <Divider />
                    <Box>
                      <Text fontSize="xs" color="gray.500">Komentar</Text>
                      <Text>{detail.comment}</Text>
                    </Box>
                  </>
                )}
                <Divider />
                <Text fontSize="xs" color="gray.500">
                  Datum: {new Date(detail.createdAt).toLocaleString('bs-BA')}
                </Text>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            {detail && detail.isApproved !== true && (
              <Button colorScheme="green" mr={3} size="sm" onClick={() => { handleApprove(detail.id); onClose(); }}>
                Odobri
              </Button>
            )}
            {detail && (
              <Button colorScheme="red" variant="outline" mr={3} size="sm" onClick={() => handleDelete(detail.id)}>
                Obriši
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>Zatvori</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
