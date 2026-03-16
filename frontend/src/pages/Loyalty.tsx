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
  HStack,
  Button,
  NumberInput,
  NumberInputField,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Textarea,
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

interface AppSetting {
  key: string;
  value: string | null;
}

interface LoyaltyTierRow {
  id: string;
  name: string;
  minPoints: number;
  maxDiscountPercent?: number;
}

export default function Loyalty() {
  const toast = useToast();
  const [programEnabled, setProgramEnabled] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<LoyaltyAccountRow[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [redeemTarget, setRedeemTarget] = useState<LoyaltyAccountRow | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<LoyaltyAccountRow | null>(null);
  const [redeemPoints, setRedeemPoints] = useState<number>(0);
  const [redeemReason, setRedeemReason] = useState('');
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustNote, setAdjustNote] = useState('');

  const loadSettings = useCallback(() => {
    setLoadingSettings(true);
    api
      .get<AppSetting[] | AppSetting>(`/api/loyalty/settings`)
      .then((res) => {
        const list: AppSetting[] = Array.isArray(res.data) ? res.data : [res.data];
        const enabled = list.find((s) => s.key === LOYALTY_ENABLED_KEY)?.value === 'true';
        setProgramEnabled(enabled);
      })
      .catch(() => {
        setProgramEnabled(false);
      })
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

  const openRedeem = (account: LoyaltyAccountRow) => {
    setRedeemTarget(account);
    setRedeemPoints(0);
    setRedeemReason('');
  };

  const openAdjust = (account: LoyaltyAccountRow) => {
    setAdjustTarget(account);
    setAdjustDelta(0);
    setAdjustNote('');
  };

  const handleRedeemConfirm = () => {
    if (!redeemTarget || redeemPoints <= 0) return;
    setUpdating(`redeem-${redeemTarget.id}`);
    api
      .post(`/api/loyalty/accounts/${redeemTarget.id}/redeem`, { points: redeemPoints, reason: redeemReason })
      .then((res) => {
        setAccounts((prev) => prev.map((a) => (a.id === redeemTarget.id ? { ...a, points: res.data.points } : a)));
        toast({ title: 'Bodovi iskorišteni', status: 'success', isClosable: true });
        setRedeemTarget(null);
      })
      .catch((err) => {
        toast({
          title: 'Greška pri korištenju bodova',
          description: err.response?.data?.message ?? undefined,
          status: 'error',
          isClosable: true,
        });
      })
      .finally(() => setUpdating(null));
  };

  const handleAdjustConfirm = () => {
    if (!adjustTarget || adjustDelta === 0) return;
    setUpdating(`adjust-${adjustTarget.id}`);
    api
      .post(`/api/loyalty/accounts/${adjustTarget.id}/adjust`, { pointsDelta: adjustDelta, note: adjustNote })
      .then((res) => {
        setAccounts((prev) => prev.map((a) => (a.id === adjustTarget.id ? { ...a, points: res.data.points } : a)));
        toast({ title: 'Bodovi ažurirani', status: 'success', isClosable: true });
        setAdjustTarget(null);
      })
      .catch((err) => {
        toast({
          title: 'Greška pri ažuriranju bodova',
          description: err.response?.data?.message ?? undefined,
          status: 'error',
          isClosable: true,
        });
      })
      .finally(() => setUpdating(null));
  };

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
          {!loadingSettings && (
            <Box mt={4}>
              <Text fontSize="sm" fontWeight="semibold" mb={1}>
                Gdje podesiti loyalty pravila
              </Text>
              <Text fontSize="xs" color="gray.600">
                Detaljna konfiguracija (bodovi po valuti, tierovi, pravila za korištenje bodova) se uređuje kroz
                stranicu Postavke → Sistem → "Loyalty program". Ovdje vidite račune i možete ručno koristiti ili
                korigovati bodove.
              </Text>
            </Box>
          )}
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
            <Text color="gray.500">
              Nema loyalty računa. Kada je program uključen i klijent ima barem jednu završenu rezervaciju, račun će se
              automatski kreirati.
            </Text>
          ) : (
            <Box overflowX="auto">
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Korisnik</Th>
                    <Th>Email</Th>
                    <Th isNumeric>Bodovi</Th>
                    <Th>Tier</Th>
                    <Th>Status</Th>
                    <Th>Transakcije</Th>
                    <Th>Akcije</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {accounts.map((a) => (
                    <Tr key={a.id}>
                      <Td>{userName(a.user)}</Td>
                      <Td>{a.user.email}</Td>
                      <Td isNumeric>{a.points}</Td>
                      <Td>{a.tier ?? '-'}</Td>
                      <Td>
                        <Badge colorScheme={a.isActive ? 'green' : 'gray'}>{a.isActive ? 'Aktivan' : 'Neaktivan'}</Badge>
                      </Td>
                      <Td>{a._count.transactions}</Td>
                      <Td>
                        <HStack spacing={2}>
                          <Switch
                            size="sm"
                            isChecked={a.isActive}
                            isDisabled={updating === a.id}
                            onChange={(e) => handleAccountActiveToggle(a.id, e.target.checked)}
                            colorScheme="green"
                          />
                          <Button size="xs" variant="outline" onClick={() => openRedeem(a)}>
                            Redeem
                          </Button>
                          <Button size="xs" variant="outline" onClick={() => openAdjust(a)}>
                            Adjust
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={!!redeemTarget} onClose={() => setRedeemTarget(null)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Iskoristi bodove</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm" mb={3}>
              Račun: {redeemTarget && userName(redeemTarget.user)} (dostupno {redeemTarget?.points} bodova)
            </Text>
            <FormControl mb={3}>
              <FormLabel>Broj bodova za korištenje</FormLabel>
              <NumberInput min={1} max={redeemTarget?.points ?? undefined} value={redeemPoints} onChange={(_, v) => setRedeemPoints(v || 0)}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Napomena (opcionalno)</FormLabel>
              <Textarea value={redeemReason} onChange={(e) => setRedeemReason(e.target.value)} />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={() => setRedeemTarget(null)}>
              Zatvori
            </Button>
            <Button colorScheme="green" onClick={handleRedeemConfirm} isLoading={updating === `redeem-${redeemTarget?.id}`}>
              Potvrdi
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={!!adjustTarget} onClose={() => setAdjustTarget(null)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ručna korekcija bodova</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm" mb={3}>
              Račun: {adjustTarget && userName(adjustTarget.user)} (trenutno {adjustTarget?.points} bodova)
            </Text>
            <FormControl mb={3}>
              <FormLabel>Promjena bodova (+ ili -)</FormLabel>
              <NumberInput value={adjustDelta} onChange={(_, v) => setAdjustDelta(v || 0)}>
                <NumberInputField />
              </NumberInput>
            </FormControl>
            <FormControl>
              <FormLabel>Napomena (preporučeno)</FormLabel>
              <Textarea value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={() => setAdjustTarget(null)}>
              Zatvori
            </Button>
            <Button colorScheme="blue" onClick={handleAdjustConfirm} isLoading={updating === `adjust-${adjustTarget?.id}`}>
              Spremi
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
