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
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<AnalyticsDashboard>('/api/analytics/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <Box>
      <Heading size="lg" mb={2}>
        Analitika
      </Heading>
      <Text color="gray.600" mb={6}>
        Prihod, rashodi, performanse stilista i top usluge
      </Text>

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
              <StatLabel>Završene rezervacije (ova godina)</StatLabel>
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
            Prihod i rashodi po mjesecima (zadnjih 12)
          </Heading>
          <Box h="320px">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${v} KM`} />
                <Tooltip formatter={(value: number) => [`${Number(value).toFixed(2)} KM`, '']} />
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
              Performanse stilista (ova godina)
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
                        <Td>{s.stylistName}</Td>
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
              Top usluge (ova godina)
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
