import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  Card,
  CardBody,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import api from '../api/client';

interface StylistAnalyticsData {
  stylist: { id: string; name: string; user?: { id: string; username: string; email: string | null; firstName: string | null; lastName: string | null } };
  fromDate: string | null;
  toDate: string | null;
  completedCount: number;
  revenue: number;
  tips: number;
  topServices: { serviceId: string; serviceName: string; count: number; revenue: number }[];
  recentEntries: { id: string; date: string; serviceName: string | null; clientName: string | null; actualPrice: unknown; tipAmount: unknown }[];
}

export default function StylistAnalytics() {
  const [searchParams] = useSearchParams();
  const stylistId = searchParams.get('stylistId');
  const [data, setData] = useState<StylistAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(searchParams.get('fromDate') ?? '');
  const [dateTo, setDateTo] = useState(searchParams.get('toDate') ?? '');

  const load = useCallback(() => {
    if (!stylistId) return;
    setLoading(true);
    const params: Record<string, string> = {};
    if (dateFrom) params.fromDate = dateFrom;
    if (dateTo) params.toDate = dateTo;
    api
      .get<StylistAnalyticsData>(`/api/stylists/${stylistId}/analytics`, { params })
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [stylistId, dateFrom, dateTo]);

  useEffect(() => {
    if (stylistId) load();
    else setData(null);
  }, [stylistId, load]);

  if (!stylistId) {
    return (
      <Box>
        <Button as={RouterLink} to="/admin/stylists" leftIcon={<ArrowBackIcon />} variant="ghost" mb={4}>
          Nazad na Stiliste
        </Button>
        <Text color="gray.500">Odaberite stilistu (npr. s liste Stilisti) da vidite analitiku.</Text>
      </Box>
    );
  }

  if (loading && !data) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box>
        <Button as={RouterLink} to="/admin/stylists" leftIcon={<ArrowBackIcon />} variant="ghost" mb={4}>
          Nazad na Stiliste
        </Button>
        <Text color="red.500">Nije moguće učitati analitiku stiliste.</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Button as={RouterLink} to="/admin/stylists" leftIcon={<ArrowBackIcon />} variant="ghost" mb={4}>
        Nazad na Stiliste
      </Button>

      <Flex mb={4} gap={3} wrap="wrap" align="flex-end">
        <FormControl w="auto" maxW="160px">
          <FormLabel fontSize="sm">Od datuma</FormLabel>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} size="sm" />
        </FormControl>
        <FormControl w="auto" maxW="160px">
          <FormLabel fontSize="sm">Do datuma</FormLabel>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} size="sm" />
        </FormControl>
        <Button size="sm" colorScheme="brand" onClick={load}>
          Primijeni period
        </Button>
        {(data.fromDate || data.toDate) && (
          <Text fontSize="sm" color="gray.500" alignSelf="center">
            Period: {data.fromDate} – {data.toDate}
          </Text>
        )}
      </Flex>

      <Heading size="md" mb={2}>
        {data.stylist.name}
      </Heading>
      {data.stylist.user?.email && (
        <Text color="gray.500" mb={6}>
          {data.stylist.user.email}
        </Text>
      )}

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Završeno (u periodu)</StatLabel>
              <StatNumber>{data.completedCount}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Prihod (KM)</StatLabel>
              <StatNumber color="green.600">{data.revenue.toFixed(2)}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Napojnice (KM)</StatLabel>
              <StatNumber color="orange.600">{data.tips.toFixed(2)}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card>
          <CardBody>
            <Heading size="sm" mb={3}>
              Top usluge
            </Heading>
            <Box overflowX="auto">
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Usluga</Th>
                    <Th isNumeric>Broj</Th>
                    <Th isNumeric>Prihod (KM)</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.topServices.length === 0 ? (
                    <Tr>
                      <Td colSpan={3}><Text color="gray.500">Nema podataka.</Text></Td>
                    </Tr>
                  ) : (
                    data.topServices.map((s) => (
                      <Tr key={s.serviceId}>
                        <Td>{s.serviceName}</Td>
                        <Td isNumeric>{s.count}</Td>
                        <Td isNumeric>{s.revenue.toFixed(2)}</Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Box>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Heading size="sm" mb={3}>
              Posljednji unosi
            </Heading>
            <Box overflowX="auto">
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Datum</Th>
                    <Th>Servis</Th>
                    <Th>Klijent</Th>
                    <Th isNumeric>Iznos</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.recentEntries.length === 0 ? (
                    <Tr>
                      <Td colSpan={4}><Text color="gray.500">Nema podataka.</Text></Td>
                    </Tr>
                  ) : (
                    data.recentEntries.map((e) => (
                      <Tr key={e.id}>
                        <Td>{e.date?.slice(0, 10)}</Td>
                        <Td>{e.serviceName ?? '-'}</Td>
                        <Td>{e.clientName ?? '-'}</Td>
                        <Td isNumeric>{Number(e.actualPrice).toFixed(2)}</Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Box>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
}
