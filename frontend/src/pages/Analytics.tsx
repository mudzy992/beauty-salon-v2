import { useEffect, useState, useCallback } from 'react';
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
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Flex,
  Select,
  Button,
  Input,
  FormControl,
  FormLabel,
  Link,
} from '@chakra-ui/react';
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { Link as RouterLink } from 'react-router-dom';
import api from '../api/client';

interface MonthlyFinance {
  year: number;
  month: number;
  label: string;
  income: number;
  expenses: number;
  tips: number;
}

interface StylistPerformance {
  stylistProfileId: string;
  stylistName: string;
  completedCount: number;
  revenue: number;
  tips: number;
}

interface TopServiceRow {
  serviceId: string;
  serviceName: string;
  count: number;
  revenue: number;
}

interface AnalyticsDashboard {
  monthlyFinance: MonthlyFinance[];
  stylistPerformance: StylistPerformance[];
  topServices: TopServiceRow[];
  conversionRate: number | null;
  totalPending: number;
  totalCompleted: number;
  fromDate: string;
  toDate: string;
}

type PeriodPreset = '12' | 'thisMonth' | 'lastMonth' | 'custom';

function getPresetParams(preset: PeriodPreset, customFrom?: string, customTo?: string): Record<string, string> {
  const now = new Date();
  if (preset === '12') return { monthsBack: '12' };
  if (preset === 'thisMonth') {
    return { year: String(now.getFullYear()), month: String(now.getMonth() + 1) };
  }
  if (preset === 'lastMonth') {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { year: String(last.getFullYear()), month: String(last.getMonth() + 1) };
  }
  if (preset === 'custom' && customFrom && customTo) return { fromDate: customFrom, toDate: customTo };
  return { monthsBack: '12' };
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodPreset>('12');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = getPresetParams(period, customFrom, customTo);
    api
      .get<AnalyticsDashboard>('/api/analytics/dashboard', { params })
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box p={6}>
        <Text color="red.500">Nije moguće učitati analitiku.</Text>
      </Box>
    );
  }

  const chartData = data.monthlyFinance.map((m) => ({
    ...m,
    net: m.income - m.expenses,
  }));

  const periodLabel =
    data?.fromDate && data?.toDate
      ? `Za period ${data.fromDate} – ${data.toDate}`
      : 'Prihod, rashodi, performanse stilista i top usluge';

  return (
    <Box>
      <Heading size="lg" mb={2}>
        Analitika
      </Heading>

      <Flex direction={{ base: 'column', md: 'row' }} gap={4} mb={6} flexWrap="wrap" align="flex-end">
        <FormControl w={{ base: '100%', md: 'auto' }}>
          <FormLabel fontSize="sm">Period</FormLabel>
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodPreset)}
            w="full"
            maxW="220px"
          >
            <option value="12">Zadnjih 12 mjeseci</option>
            <option value="thisMonth">Ovaj mjesec</option>
            <option value="lastMonth">Prošli mjesec</option>
            <option value="custom">Od datuma – Do datuma</option>
          </Select>
        </FormControl>
        {period === 'custom' && (
          <>
            <FormControl w={{ base: '100%', md: 'auto' }}>
              <FormLabel fontSize="sm">Od</FormLabel>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                maxW="180px"
              />
            </FormControl>
            <FormControl w={{ base: '100%', md: 'auto' }}>
              <FormLabel fontSize="sm">Do</FormLabel>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                maxW="180px"
              />
            </FormControl>
            <Button colorScheme="brand" onClick={load} isDisabled={!customFrom || !customTo}>
              Primijeni
            </Button>
          </>
        )}
        {period !== 'custom' && (
          <Text color="gray.600" fontSize="sm" alignSelf="center" pb={1}>
            {periodLabel}
          </Text>
        )}
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Konverzija (završeno / ukupno)</StatLabel>
              <StatNumber>{data.conversionRate != null ? `${data.conversionRate}%` : '–'}</StatNumber>
              <StatHelpText>
                {data.totalCompleted} završenih / {data.totalPending + data.totalCompleted} ukupno
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Završene rezervacije (u periodu)</StatLabel>
              <StatNumber color="green.600">{data.totalCompleted}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Na čekanju</StatLabel>
              <StatNumber color="orange.500">{data.totalPending}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card mb={6}>
        <CardBody>
          <Heading size="sm" mb={4}>
            Prihod i rashodi po mjesecima {data.fromDate && data.toDate ? `(${data.fromDate} – ${data.toDate})` : '(zadnjih 12 mj.)'}
          </Heading>
          <Box h="320px">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${v} KM`} />
                <Tooltip formatter={(value: unknown) => [`${Number(value ?? 0).toFixed(2)} KM`, '']} />
                <Legend />
                <Bar dataKey="income" name="Prihod" fill="#38A169" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Rashodi" fill="#E53E3E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tips" name="Napojnice" fill="#D69E2E" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </CardBody>
      </Card>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card>
          <CardBody>
            <Heading size="sm" mb={3}>
              Performanse stilista
            </Heading>
            <Box overflowX="auto">
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Stilista</Th>
                    <Th isNumeric>Broj</Th>
                    <Th isNumeric>Prihod (KM)</Th>
                    <Th isNumeric>Napojnice (KM)</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.stylistPerformance.length === 0 ? (
                    <Tr>
                      <Td colSpan={4}>
                        <Text color="gray.500">Nema podataka.</Text>
                      </Td>
                    </Tr>
                  ) : (
                    data.stylistPerformance.map((s) => (
                      <Tr key={s.stylistProfileId}>
                        <Td>
                          <Link as={RouterLink} to={`/admin/stylist-analytics?stylistId=${s.stylistProfileId}`} color="brand.600" _hover={{ textDecoration: 'underline' }}>
                            {s.stylistName}
                          </Link>
                        </Td>
                        <Td isNumeric>{s.completedCount}</Td>
                        <Td isNumeric>{s.revenue.toFixed(2)}</Td>
                        <Td isNumeric>{s.tips.toFixed(2)}</Td>
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
                      <Td colSpan={3}>
                        <Text color="gray.500">Nema podataka.</Text>
                      </Td>
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
      </SimpleGrid>
    </Box>
  );
}
