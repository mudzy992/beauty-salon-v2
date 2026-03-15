import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Heading,
  Text,
  Card,
  CardBody,
  Switch,
  FormControl,
  FormLabel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  useToast,
  Badge,
} from '@chakra-ui/react';
import api from '../api/client';

const LOYALTY_ENABLED_KEY = 'loyalty_enabled';

interface LoyaltyAccountRow {
  id: string;
  points: number;
  tier: string | null;
  isActive: boolean;
  createdAt: string;
  user: { id: string; username: string; email: string; firstName: string | null; lastName: string | null };
  _count: { transactions: number };
}

export default function Loyalty() {
  const toast = useToast();
  const [programEnabled, setProgramEnabled] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<LoyaltyAccountRow[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadSettings = useCallback(() => {
    setLoadingSettings(true);
    api
      .get<{ key: string; value: string | null }>(`/api/settings/${LOYALTY_ENABLED_KEY}`)
      .then((res) => setProgramEnabled(res.data.value === 'true'))
      .catch(() => setProgramEnabled(false))
      .finally(() => setLoadingSettings(false));
  }, []);

  const loadAccounts = useCallback(() => {
    setLoadingAccounts(true);
    api
      .get<LoyaltyAccountRow[]>('/api/loyalty/accounts')
      .then((res) => setAccounts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAccounts([]))
      .finally(() => setLoadingAccounts(false));
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleProgramToggle = (checked: boolean) => {
    setUpdating('program');
    api
      .put(`/api/settings/${LOYALTY_ENABLED_KEY}`, {
        value: checked ? 'true' : 'false',
        description: 'Loyalty program uključen (true) ili isključen (false).',
      })
      .then(() => {
        setProgramEnabled(checked);
        toast({ title: checked ? 'Program uključen' : 'Program isključen', status: 'success', isClosable: true });
      })
      .catch(() => toast({ title: 'Greška pri spremanju', status: 'error', isClosable: true }))
      .finally(() => setUpdating(null));
  };

  const handleAccountActiveToggle = (id: string, isActive: boolean) => {
    setUpdating(id);
    api
      .patch(`/api/loyalty/accounts/${id}`, { isActive })
      .then(() => {
        setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, isActive } : a)));
        toast({ title: isActive ? 'Račun aktiviran' : 'Račun deaktiviran', status: 'success', isClosable: true });
      })
      .catch(() => toast({ title: 'Greška pri ažuriranju', status: 'error', isClosable: true }))
      .finally(() => setUpdating(null));
  };

  const userName = (u: LoyaltyAccountRow['user']) =>
    [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email;

  return (
    <Box>
      <Heading size="lg" mb={2}>
        Loyalty program
      </Heading>
      <Text color="gray.600" mb={6}>
        Infrastruktura programa vjernosti. Program je neaktivan dok ga ne uključite. Računi se mogu aktivirati pojedinačno.
      </Text>

      <Card mb={6}>
        <CardBody>
          <FormControl display="flex" alignItems="center" gap={4}>
            <Switch
              id="loyalty-program"
              isChecked={programEnabled}
              isDisabled={loadingSettings || updating === 'program'}
              onChange={(e) => handleProgramToggle(e.target.checked)}
              colorScheme="green"
            />
            <FormLabel htmlFor="loyalty-program" mb={0}>
              Program uključen (vidljiv klijentima i spreman za buduće bodovanje)
            </FormLabel>
          </FormControl>
          {loadingSettings && <Spinner size="sm" ml={4} />}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Heading size="sm" mb={3}>
            Loyalty računi
          </Heading>
          {loadingAccounts ? (
            <Box py={6} textAlign="center">
              <Spinner />
            </Box>
          ) : accounts.length === 0 ? (
            <Text color="gray.500">Nema loyalty računa. Računi se kreiraju kada se program aktivira i klijenti ispune uvjete (buduća implementacija).</Text>
          ) : (
            <Box overflowX="auto">
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Korisnik</Th>
                    <Th>Email</Th>
                    <Th isNumeric>Bodovi</Th>
                    <Th>Status</Th>
                    <Th>Transakcije</Th>
                    <Th>Aktivnost</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {accounts.map((a) => (
                    <Tr key={a.id}>
                      <Td>{userName(a.user)}</Td>
                      <Td>{a.user.email}</Td>
                      <Td isNumeric>{a.points}</Td>
                      <Td>
                        <Badge colorScheme={a.isActive ? 'green' : 'gray'}>{a.isActive ? 'Aktivan' : 'Neaktivan'}</Badge>
                      </Td>
                      <Td>{a._count.transactions}</Td>
                      <Td>
                        <Switch
                          size="sm"
                          isChecked={a.isActive}
                          isDisabled={updating === a.id}
                          onChange={(e) => handleAccountActiveToggle(a.id, e.target.checked)}
                          colorScheme="green"
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </CardBody>
      </Card>
    </Box>
  );
}
