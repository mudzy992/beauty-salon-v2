import { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText,
  Text, Spinner, Card, CardBody, Table, Thead, Tbody, Tr, Th, Td,
  Badge,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { useSocketEvent } from '../context/SocketContext';

interface DashboardStats {
  usersCount: number;
  stylistsCount: number;
  servicesCount: number;
  reservationsThisMonth: number;
  pendingReservations: number;
  completedReservations: number;
  incomeThisMonth: number;
  tipsThisMonth: number;
  expensesThisMonth: number;
  pendingReviews: number;
  blogPostsCount: number;
}

interface RecentReservation {
  id: string;
  reservationDate: string;
  startTime: string;
  status: string;
  client?: { user?: { username: string } };
  service?: { name: string };
}

const statusColorMap: Record<string, string> = {
  PENDING: 'yellow', STYLIST_REVIEW: 'orange', CONFIRMED: 'blue',
  ATTENDANCE_CONFIRMED: 'cyan', IN_PROGRESS: 'purple', COMPLETED: 'green',
  CANCELLED_BY_CLIENT: 'red', CANCELLED_BY_STYLISTS: 'red', NO_SHOW: 'gray',
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentReservations, setRecentReservations] = useState<RecentReservation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    Promise.all([
      api.get('/api/users').catch(() => ({ data: [] })),
      api.get('/api/stylists').catch(() => ({ data: [] })),
      api.get('/api/services').catch(() => ({ data: [] })),
      api.get('/api/reservations', { params: { fromDate: firstDay, toDate: lastDay } }).catch(() => ({ data: [] })),
      api.get('/api/reservations', { params: { status: 'PENDING' } }).catch(() => ({ data: [] })),
      api.get(`/api/income-books/month/${year}/${month}`).catch(() => ({ data: null })),
      api.get('/api/expense-books').catch(() => ({ data: [] })),
      api.get('/api/expenses').catch(() => ({ data: [] })),
      api.get('/api/reviews', { params: { approved: 'false' } }).catch(() => ({ data: [] })),
      api.get('/api/blog').catch(() => ({ data: [] })),
    ]).then(([usersRes, stylistsRes, servicesRes, resThisMonth, pendingRes, incomeRes, _expBooksRes, expensesRes, reviewsRes, blogRes]) => {
      const allReservations: any[] = Array.isArray(resThisMonth.data) ? resThisMonth.data : [];
      const incomeBook = incomeRes.data;
      const allExpenses: any[] = Array.isArray(expensesRes.data) ? expensesRes.data : [];

      const monthExpenses = allExpenses.reduce((sum: number, e: any) => sum + Number(e.totalAmount || 0), 0);

      setStats({
        usersCount: Array.isArray(usersRes.data) ? usersRes.data.length : 0,
        stylistsCount: Array.isArray(stylistsRes.data) ? stylistsRes.data.length : 0,
        servicesCount: Array.isArray(servicesRes.data) ? servicesRes.data.length : 0,
        reservationsThisMonth: allReservations.length,
        pendingReservations: Array.isArray(pendingRes.data) ? pendingRes.data.length : 0,
        completedReservations: allReservations.filter((r: any) => r.status === 'COMPLETED').length,
        incomeThisMonth: Number(incomeBook?.totalRevenue || 0),
        tipsThisMonth: Number(incomeBook?.totalTips || 0),
        expensesThisMonth: monthExpenses,
        pendingReviews: Array.isArray(reviewsRes.data) ? reviewsRes.data.length : 0,
        blogPostsCount: Array.isArray(blogRes.data) ? blogRes.data.length : 0,
      });

      const sorted = allReservations
        .sort((a: any, b: any) => new Date(b.createdAt ?? b.reservationDate).getTime() - new Date(a.createdAt ?? a.reservationDate).getTime())
        .slice(0, 8);
      setRecentReservations(sorted);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useSocketEvent('reservation:created', useCallback(() => loadData(), [loadData]));
  useSocketEvent('reservation:updated', useCallback(() => loadData(), [loadData]));
  useSocketEvent('reservation:confirmed', useCallback(() => loadData(), [loadData]));
  useSocketEvent('reservation:cancelled', useCallback(() => loadData(), [loadData]));

  if (loading) return <Box p={6} textAlign="center"><Spinner size="lg" /></Box>;

  return (
    <Box>
      <Heading size="lg" mb={2}>
        {t('dashboard.welcome')}, {user?.username}
      </Heading>
      <Text color="gray.600" mb={6}>{t('dashboard.stats')}</Text>

      {/* Main Stats */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4} mb={6}>
        <Card><CardBody>
          <Stat>
            <StatLabel>Korisnici</StatLabel>
            <StatNumber>{stats?.usersCount ?? 0}</StatNumber>
            <StatHelpText>{stats?.stylistsCount ?? 0} stilista</StatHelpText>
          </Stat>
        </CardBody></Card>
        <Card><CardBody>
          <Stat>
            <StatLabel>Rezervacije (ovaj mjesec)</StatLabel>
            <StatNumber>{stats?.reservationsThisMonth ?? 0}</StatNumber>
            <StatHelpText>{stats?.completedReservations ?? 0} završenih | {stats?.pendingReservations ?? 0} na čekanju</StatHelpText>
          </Stat>
        </CardBody></Card>
        <Card><CardBody>
          <Stat>
            <StatLabel color="green.600">Prihod (ovaj mjesec)</StatLabel>
            <StatNumber color="green.600">{(stats?.incomeThisMonth ?? 0).toFixed(2)} KM</StatNumber>
            <StatHelpText>Napojnice: {(stats?.tipsThisMonth ?? 0).toFixed(2)} KM</StatHelpText>
          </Stat>
        </CardBody></Card>
        <Card><CardBody>
          <Stat>
            <StatLabel color="red.600">Rashodi (ovaj mjesec)</StatLabel>
            <StatNumber color="red.600">{(stats?.expensesThisMonth ?? 0).toFixed(2)} KM</StatNumber>
            <StatHelpText>Neto: {((stats?.incomeThisMonth ?? 0) - (stats?.expensesThisMonth ?? 0)).toFixed(2)} KM</StatHelpText>
          </Stat>
        </CardBody></Card>
      </SimpleGrid>

      {/* Secondary Stats */}
      <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4} mb={6}>
        <Card><CardBody>
          <Stat>
            <StatLabel>Aktivni Servisi</StatLabel>
            <StatNumber>{stats?.servicesCount ?? 0}</StatNumber>
          </Stat>
        </CardBody></Card>
        <Card><CardBody>
          <Stat>
            <StatLabel>Recenzije na čekanju</StatLabel>
            <StatNumber color={stats?.pendingReviews ? 'orange.500' : undefined}>
              {stats?.pendingReviews ?? 0}
            </StatNumber>
          </Stat>
        </CardBody></Card>
        <Card><CardBody>
          <Stat>
            <StatLabel>Blog članaka</StatLabel>
            <StatNumber>{stats?.blogPostsCount ?? 0}</StatNumber>
          </Stat>
        </CardBody></Card>
      </SimpleGrid>

      {/* Recent Reservations */}
      <Card>
        <CardBody>
          <Heading size="sm" mb={3}>Posljednje Rezervacije</Heading>
          <Box overflow="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Datum</Th>
                  <Th>Vrijeme</Th>
                  <Th>Klijent</Th>
                  <Th>Servis</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {recentReservations.length === 0 ? (
                  <Tr><Td colSpan={5}><Text color="gray.500">Nema rezervacija.</Text></Td></Tr>
                ) : (
                  recentReservations.map((r) => (
                    <Tr key={r.id}>
                      <Td>{String(r.reservationDate).slice(0, 10)}</Td>
                      <Td>{r.startTime}</Td>
                      <Td>{r.client?.user?.username ?? '-'}</Td>
                      <Td>{r.service?.name ?? '-'}</Td>
                      <Td><Badge colorScheme={statusColorMap[r.status] ?? 'gray'}>{r.status}</Badge></Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>
    </Box>
  );
}
