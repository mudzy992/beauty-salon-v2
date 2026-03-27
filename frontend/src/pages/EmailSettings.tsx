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
  const [requireTls, setRequireTls] = useState(false);
  const [ignoreTls, setIgnoreTls] = useState(false);
  const [connectionTimeoutMs, setConnectionTimeoutMs] = useState('10000');
  const [greetingTimeoutMs, setGreetingTimeoutMs] = useState('10000');
  const [socketTimeoutMs, setSocketTimeoutMs] = useState('20000');
  const [pool, setPool] = useState(true);
  const [maxConnections, setMaxConnections] = useState('5');
  const [maxMessages, setMaxMessages] = useState('100');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('Beauty Salon');
  const [replyTo, setReplyTo] = useState('');
  const [signature, setSignature] = useState('Beauty Salon Nejra');
  const [publicAppUrl, setPublicAppUrl] = useState('');
  const [testEmailTo, setTestEmailTo] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

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
      setRequireTls((setValueFromSettings(list, 'system_email_require_tls') || 'false') === 'true');
      setIgnoreTls((setValueFromSettings(list, 'system_email_ignore_tls') || 'false') === 'true');
      setConnectionTimeoutMs(setValueFromSettings(list, 'system_email_connection_timeout_ms') || '10000');
      setGreetingTimeoutMs(setValueFromSettings(list, 'system_email_greeting_timeout_ms') || '10000');
      setSocketTimeoutMs(setValueFromSettings(list, 'system_email_socket_timeout_ms') || '20000');
      setPool((setValueFromSettings(list, 'system_email_pool') || 'true') === 'true');
      setMaxConnections(setValueFromSettings(list, 'system_email_max_connections') || '5');
      setMaxMessages(setValueFromSettings(list, 'system_email_max_messages') || '100');
      setFromEmail(setValueFromSettings(list, KEYS.fromEmail));
      setFromName(setValueFromSettings(list, KEYS.fromName) || 'Beauty Salon');
      setReplyTo(setValueFromSettings(list, 'system_email_reply_to'));
      setSignature(setValueFromSettings(list, 'system_email_signature') || 'Beauty Salon Nejra');
      setPublicAppUrl(setValueFromSettings(list, 'system_public_app_url'));
      setTestEmailTo(setValueFromSettings(list, KEYS.fromEmail));
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
        upsertSetting('system_email_require_tls', String(requireTls), 'SMTP require TLS'),
        upsertSetting('system_email_ignore_tls', String(ignoreTls), 'SMTP ignore TLS'),
        upsertSetting('system_email_connection_timeout_ms', connectionTimeoutMs.trim(), 'SMTP connection timeout (ms)'),
        upsertSetting('system_email_greeting_timeout_ms', greetingTimeoutMs.trim(), 'SMTP greeting timeout (ms)'),
        upsertSetting('system_email_socket_timeout_ms', socketTimeoutMs.trim(), 'SMTP socket timeout (ms)'),
        upsertSetting('system_email_pool', String(pool), 'SMTP pooled connections'),
        upsertSetting('system_email_max_connections', maxConnections.trim(), 'SMTP max pooled connections'),
        upsertSetting('system_email_max_messages', maxMessages.trim(), 'SMTP max messages per connection'),
        upsertSetting(KEYS.fromEmail, fromEmail.trim(), 'Email sender address'),
        upsertSetting(KEYS.fromName, fromName.trim(), 'Email sender name'),
        upsertSetting('system_email_reply_to', replyTo.trim(), 'Email reply-to address'),
        upsertSetting('system_email_signature', signature.trim(), 'Email template signature'),
        upsertSetting('system_public_app_url', publicAppUrl.trim(), 'Public app base URL for email links'),
      ]);
      toast({ title: 'Email postavke su sačuvane.', status: 'success', isClosable: true });
    } catch {
      toast({ title: 'Greška pri čuvanju email postavki.', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTo.trim()) {
      toast({ title: 'Unesite email adresu za test.', status: 'warning', isClosable: true });
      return;
    }
    setSendingTest(true);
    try {
      await api.post('/api/notifications/test-email', { to: testEmailTo.trim() });
      toast({
        title: 'Test email je poslan.',
        description: 'Provjerite inbox i spam folder.',
        status: 'success',
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || 'Slanje test emaila nije uspjelo.',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendTestToMe = async () => {
    setSendingTest(true);
    try {
      await api.post('/api/notifications/test-email', {});
      toast({
        title: 'Test email je poslan na vaš admin nalog.',
        description: 'Provjerite inbox i spam folder.',
        status: 'success',
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || 'Slanje test emaila nije uspjelo.',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      await api.post('/api/notifications/test-smtp-connection', {});
      toast({
        title: 'SMTP konekcija je uspješna.',
        status: 'success',
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || 'SMTP konekcija nije uspjela.',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setTestingConnection(false);
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
            <HStack justify="space-between">
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Require TLS</FormLabel>
                <Switch isChecked={requireTls} onChange={(event) => setRequireTls(event.target.checked)} />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Ignore TLS</FormLabel>
                <Switch isChecked={ignoreTls} onChange={(event) => setIgnoreTls(event.target.checked)} />
              </FormControl>
            </HStack>
            <HStack justify="space-between">
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Pool konekcije</FormLabel>
                <Switch isChecked={pool} onChange={(event) => setPool(event.target.checked)} />
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
            <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={4}>
              <GridItem colSpan={{ base: 2, md: 1 }}>
                <FormControl>
                  <FormLabel>Connection timeout (ms)</FormLabel>
                  <Input value={connectionTimeoutMs} onChange={(event) => setConnectionTimeoutMs(event.target.value)} />
                </FormControl>
              </GridItem>
              <GridItem colSpan={{ base: 2, md: 1 }}>
                <FormControl>
                  <FormLabel>Greeting timeout (ms)</FormLabel>
                  <Input value={greetingTimeoutMs} onChange={(event) => setGreetingTimeoutMs(event.target.value)} />
                </FormControl>
              </GridItem>
              <GridItem colSpan={{ base: 2, md: 1 }}>
                <FormControl>
                  <FormLabel>Socket timeout (ms)</FormLabel>
                  <Input value={socketTimeoutMs} onChange={(event) => setSocketTimeoutMs(event.target.value)} />
                </FormControl>
              </GridItem>
              <GridItem colSpan={{ base: 2, md: 1 }}>
                <FormControl>
                  <FormLabel>Max konekcija / Max poruka</FormLabel>
                  <HStack>
                    <Input value={maxConnections} onChange={(event) => setMaxConnections(event.target.value)} placeholder="5" />
                    <Input value={maxMessages} onChange={(event) => setMaxMessages(event.target.value)} placeholder="100" />
                  </HStack>
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
              <GridItem colSpan={{ base: 2, md: 1 }}>
                <FormControl>
                  <FormLabel>Reply-To</FormLabel>
                  <Input value={replyTo} onChange={(event) => setReplyTo(event.target.value)} placeholder="support@domena.com" />
                </FormControl>
              </GridItem>
              <GridItem colSpan={{ base: 2, md: 1 }}>
                <FormControl>
                  <FormLabel>Potpis (footer)</FormLabel>
                  <Input value={signature} onChange={(event) => setSignature(event.target.value)} />
                </FormControl>
              </GridItem>
              <GridItem colSpan={2}>
                <FormControl>
                  <FormLabel>Public App URL (linkovi u emailovima)</FormLabel>
                  <Input value={publicAppUrl} onChange={(event) => setPublicAppUrl(event.target.value)} placeholder="https://vas-domen.ba" />
                </FormControl>
              </GridItem>
            </Grid>

            <HStack>
              <Button colorScheme="brand" onClick={handleSave} isLoading={saving}>
                Sačuvaj email postavke
              </Button>
              <Button variant="outline" onClick={handleTestConnection} isLoading={testingConnection}>
                Test konekcije
              </Button>
            </HStack>

            <Divider />

            <FormControl>
              <FormLabel>Test email</FormLabel>
              <HStack>
                <Input
                  value={testEmailTo}
                  onChange={(event) => setTestEmailTo(event.target.value)}
                  placeholder="email@domena.com"
                />
                <Button
                  variant="outline"
                  colorScheme="brand"
                  onClick={handleSendTestEmail}
                  isLoading={sendingTest}
                >
                  Pošalji test
                </Button>
                <Button
                  variant="solid"
                  colorScheme="purple"
                  onClick={handleSendTestToMe}
                  isLoading={sendingTest}
                >
                  Pošalji meni
                </Button>
              </HStack>
            </FormControl>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
}
