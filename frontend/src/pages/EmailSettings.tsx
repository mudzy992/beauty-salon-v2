import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  FormControl,
  FormLabel,
  Select,
  Input,
  Switch,
  Button,
  Grid,
  GridItem,
  useToast,
  Card,
  CardBody,
  Divider,
  HStack,
} from '@chakra-ui/react';
import api from '../api/client';

type ProviderType = 'google' | 'office365' | 'exchange' | 'custom';

interface AppSetting {
  key: string;
  value: string | null;
}

const PROVIDERS: Array<{ id: ProviderType; label: string }> = [
  { id: 'google', label: 'Google (Gmail Workspace)' },
  { id: 'office365', label: 'Office 365 / Outlook' },
  { id: 'exchange', label: 'Exchange (self-hosted)' },
  { id: 'custom', label: 'Custom SMTP' },
];

const PRESETS: Record<ProviderType, { host: string; port: string; secure: boolean }> = {
  google: { host: 'smtp.gmail.com', port: '587', secure: false },
  office365: { host: 'smtp.office365.com', port: '587', secure: false },
  exchange: { host: '', port: '587', secure: false },
  custom: { host: '', port: '587', secure: false },
};

const KEYS = {
  provider: 'system_email_provider',
  host: 'system_email_host',
  port: 'system_email_port',
  secure: 'system_email_secure',
  username: 'system_email_username',
  password: 'system_email_password',
  rejectUnauthorized: 'system_email_tls_reject_unauthorized',
  fromEmail: 'system_notif_email_from',
  fromName: 'system_notif_email_name',
} as const;

export default function EmailSettings() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [provider, setProvider] = useState<ProviderType>('google');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rejectUnauthorized, setRejectUnauthorized] = useState(true);
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('Beauty Salon');

  const isCustomLike = useMemo(
    () => provider === 'custom' || provider === 'exchange',
    [provider],
  );

  const setValueFromSettings = (settings: AppSetting[], key: string) =>
    settings.find((item) => item.key === key)?.value ?? '';

  const upsertSetting = async (key: string, value: string, description: string) => {
    await api.put(`/api/settings/${key}`, {
      value,
      description,
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<AppSetting[]>('/api/settings');
      const list = Array.isArray(data) ? data : [];
      const rawProvider = setValueFromSettings(list, KEYS.provider);
      const providerValue = PROVIDERS.some((item) => item.id === rawProvider)
        ? (rawProvider as ProviderType)
        : 'google';
      setProvider(providerValue);
      setHost(setValueFromSettings(list, KEYS.host) || PRESETS[providerValue].host);
      setPort(setValueFromSettings(list, KEYS.port) || PRESETS[providerValue].port);
      setSecure((setValueFromSettings(list, KEYS.secure) || String(PRESETS[providerValue].secure)) === 'true');
      setUsername(setValueFromSettings(list, KEYS.username));
      setPassword(setValueFromSettings(list, KEYS.password));
      setRejectUnauthorized((setValueFromSettings(list, KEYS.rejectUnauthorized) || 'true') === 'true');
      setFromEmail(setValueFromSettings(list, KEYS.fromEmail));
      setFromName(setValueFromSettings(list, KEYS.fromName) || 'Beauty Salon');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleProviderChange = (next: ProviderType) => {
    setProvider(next);
    const preset = PRESETS[next];
    if (preset.host) setHost(preset.host);
    setPort(preset.port);
    setSecure(preset.secure);
  };

  const handleSave = async () => {
    if (!host.trim()) {
      toast({ title: 'SMTP host je obavezan.', status: 'warning', isClosable: true });
      return;
    }
    if (!fromEmail.trim()) {
      toast({ title: 'From email je obavezan.', status: 'warning', isClosable: true });
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        upsertSetting(KEYS.provider, provider, 'Email provider: google|office365|exchange|custom'),
        upsertSetting(KEYS.host, host.trim(), 'SMTP host'),
        upsertSetting(KEYS.port, port.trim(), 'SMTP port'),
        upsertSetting(KEYS.secure, String(secure), 'SMTP secure (SSL/TLS)'),
        upsertSetting(KEYS.username, username.trim(), 'SMTP username'),
        upsertSetting(KEYS.password, password, 'SMTP password/app password'),
        upsertSetting(KEYS.rejectUnauthorized, String(rejectUnauthorized), 'TLS reject unauthorized'),
        upsertSetting(KEYS.fromEmail, fromEmail.trim(), 'Email sender address'),
        upsertSetting(KEYS.fromName, fromName.trim(), 'Email sender name'),
      ]);
      toast({ title: 'Email postavke su sačuvane.', status: 'success', isClosable: true });
    } catch {
      toast({ title: 'Greška pri čuvanju email postavki.', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Text>Učitavanje...</Text>;
  }

  return (
    <Box>
      <Heading size="lg" mb={2}>
        Email postavke
      </Heading>
      <Text color="gray.600" mb={6}>
        Konfigurišite SMTP za slanje verifikacijskih i drugih notifikacijskih emailova.
      </Text>

      <Card>
        <CardBody>
          <VStack align="stretch" spacing={4}>
            <FormControl>
              <FormLabel>Provider</FormLabel>
              <Select
                value={provider}
                onChange={(event) => handleProviderChange(event.target.value as ProviderType)}
              >
                {PROVIDERS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </FormControl>

            <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={4}>
              <GridItem colSpan={{ base: 2, md: 1 }}>
                <FormControl>
                  <FormLabel>SMTP Host</FormLabel>
                  <Input value={host} onChange={(event) => setHost(event.target.value)} />
                </FormControl>
              </GridItem>
              <GridItem colSpan={{ base: 2, md: 1 }}>
                <FormControl>
                  <FormLabel>SMTP Port</FormLabel>
                  <Input value={port} onChange={(event) => setPort(event.target.value)} />
                </FormControl>
              </GridItem>
            </Grid>

            <HStack justify="space-between">
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Secure (TLS/SSL)</FormLabel>
                <Switch isChecked={secure} onChange={(event) => setSecure(event.target.checked)} />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Reject TLS Unauthorized</FormLabel>
                <Switch
                  isChecked={rejectUnauthorized}
                  onChange={(event) => setRejectUnauthorized(event.target.checked)}
                />
              </FormControl>
            </HStack>

            <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={4}>
              <GridItem colSpan={{ base: 2, md: 1 }}>
                <FormControl>
                  <FormLabel>SMTP Username</FormLabel>
                  <Input value={username} onChange={(event) => setUsername(event.target.value)} />
                </FormControl>
              </GridItem>
              <GridItem colSpan={{ base: 2, md: 1 }}>
                <FormControl>
                  <FormLabel>SMTP Password / App Password</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </FormControl>
              </GridItem>
            </Grid>

            {!isCustomLike && (
              <Text fontSize="sm" color="gray.500">
                Za {provider === 'google' ? 'Google' : 'Office 365'} koristite App Password ili OAuth SMTP credentials.
              </Text>
            )}

            <Divider />

            <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={4}>
              <GridItem colSpan={{ base: 2, md: 1 }}>
                <FormControl>
                  <FormLabel>From Email</FormLabel>
                  <Input value={fromEmail} onChange={(event) => setFromEmail(event.target.value)} />
                </FormControl>
              </GridItem>
              <GridItem colSpan={{ base: 2, md: 1 }}>
                <FormControl>
                  <FormLabel>From Name</FormLabel>
                  <Input value={fromName} onChange={(event) => setFromName(event.target.value)} />
                </FormControl>
              </GridItem>
            </Grid>

            <Button colorScheme="brand" onClick={handleSave} isLoading={saving}>
              Sačuvaj email postavke
            </Button>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
}
