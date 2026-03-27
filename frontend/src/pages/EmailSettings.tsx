import { DragEvent, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Code,
  Heading,
  Text,
  VStack,
  FormControl,
  FormLabel,
  Select,
  Input,
  Textarea,
  Switch,
  Button,
  Grid,
  GridItem,
  useToast,
  Card,
  CardBody,
  Divider,
  HStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  IconButton,
  Stack,
} from '@chakra-ui/react';
import { AddIcon, ArrowDownIcon, ArrowUpIcon, DeleteIcon } from '@chakra-ui/icons';
import api from '../api/client';

type ProviderType = 'google' | 'office365' | 'exchange' | 'custom';

interface AppSetting {
  key: string;
  value: string | null;
}

type ExistingTemplateType =
  | 'verification'
  | 'reservation_new'
  | 'reservation_confirmed'
  | 'reservation_cancelled'
  | 'reservation_reminder'
  | 'reservation_reschedule'
  | 'holiday'
  | 'general';

interface ExistingTemplateConfig {
  subject: string;
  title: string;
  intro: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  plainText: string;
}

type CampaignBlockType = 'title' | 'text' | 'button' | 'spacer';

interface CampaignTemplateBlock {
  id: string;
  type: CampaignBlockType;
  content: string;
  secondary?: string;
}

interface CampaignTemplate {
  id: string;
  name: string;
  html: string;
  blocks: CampaignTemplateBlock[];
}

interface CampaignAudienceSummary {
  total: number;
  sample: Array<{
    id: string;
    username: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  }>;
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

const EXISTING_TEMPLATE_TYPES: Array<{ id: ExistingTemplateType; label: string }> = [
  { id: 'verification', label: 'Verifikacija emaila' },
  { id: 'reservation_new', label: 'Nova rezervacija' },
  { id: 'reservation_confirmed', label: 'Potvrđena rezervacija' },
  { id: 'reservation_cancelled', label: 'Otkazana rezervacija' },
  { id: 'reservation_reminder', label: 'Podsjetnik rezervacije' },
  { id: 'reservation_reschedule', label: 'Pomjerena rezervacija' },
  { id: 'holiday', label: 'Praznik / neradni dan' },
  { id: 'general', label: 'Generalna notifikacija' },
];

const TEMPLATE_DEFAULTS: ExistingTemplateConfig = {
  subject: '',
  title: '',
  intro: '',
  body: '',
  ctaLabel: '',
  ctaUrl: '',
  plainText: '',
};

const CAMPAIGN_KEY = 'system_email_campaign_templates';

const createBlock = (type: CampaignBlockType): CampaignTemplateBlock => ({
  id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  type,
  content:
    type === 'title'
      ? 'Naslov kampanje'
      : type === 'text'
        ? 'Ovdje unesite opis kampanje.'
        : type === 'button'
          ? 'Rezerviši termin'
          : '',
  secondary: type === 'button' ? 'https://vas-domen.ba/rezervacija' : undefined,
});

const renderCampaignHtml = (blocks: CampaignTemplateBlock[]): string => {
  const parts = blocks.map((block) => {
    if (block.type === 'title') return `<h2 style="margin:0 0 16px;color:#2d1f1c">${block.content}</h2>`;
    if (block.type === 'text') return `<p style="margin:0 0 14px;color:#4b3a35;line-height:1.6">${block.content}</p>`;
    if (block.type === 'button')
      return `<p style="margin:12px 0 18px"><a href="${block.secondary || '#'}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#7b4b3a;color:#fff;text-decoration:none">${block.content}</a></p>`;
    return '<div style="height:16px"></div>';
  });
  return `<div style="margin:0;padding:24px;background:#f9f3f0"><div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #f2e7e2;border-radius:18px;padding:30px">${parts.join('')}</div></div>`;
};

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
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingCampaigns, setSavingCampaigns] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [loadingAudience, setLoadingAudience] = useState(false);

  const [existingTemplateType, setExistingTemplateType] =
    useState<ExistingTemplateType>('verification');
  const [existingTemplate, setExistingTemplate] =
    useState<ExistingTemplateConfig>(TEMPLATE_DEFAULTS);

  const [campaignTemplates, setCampaignTemplates] = useState<CampaignTemplate[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [campaignMode, setCampaignMode] = useState<'builder' | 'html'>('builder');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [campaignRoles, setCampaignRoles] = useState<string[]>(['CLIENT']);
  const [onlyActiveAudience, setOnlyActiveAudience] = useState(true);
  const [onlyVerifiedAudience, setOnlyVerifiedAudience] = useState(true);
  const [createInAppNotification, setCreateInAppNotification] = useState(true);
  const [audienceSummary, setAudienceSummary] = useState<CampaignAudienceSummary | null>(null);

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
      const selectedTemplateRaw = setValueFromSettings(
        list,
        `system_email_template_${existingTemplateType}`,
      );
      setExistingTemplate(
        selectedTemplateRaw
          ? {
              ...TEMPLATE_DEFAULTS,
              ...(JSON.parse(selectedTemplateRaw) as Partial<ExistingTemplateConfig>),
            }
          : TEMPLATE_DEFAULTS,
      );
      const campaignRaw = setValueFromSettings(list, CAMPAIGN_KEY);
      const parsedCampaigns = campaignRaw
        ? (JSON.parse(campaignRaw) as CampaignTemplate[])
        : [];
      setCampaignTemplates(Array.isArray(parsedCampaigns) ? parsedCampaigns : []);
      if (Array.isArray(parsedCampaigns) && parsedCampaigns.length > 0) {
        setSelectedCampaignId(parsedCampaigns[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const loadTemplateByType = async () => {
      try {
        const { data } = await api.get<AppSetting[]>('/api/settings');
        const list = Array.isArray(data) ? data : [];
        const raw = setValueFromSettings(list, `system_email_template_${existingTemplateType}`);
        setExistingTemplate(
          raw
            ? {
                ...TEMPLATE_DEFAULTS,
                ...(JSON.parse(raw) as Partial<ExistingTemplateConfig>),
              }
            : TEMPLATE_DEFAULTS,
        );
      } catch {
        setExistingTemplate(TEMPLATE_DEFAULTS);
      }
    };
    loadTemplateByType();
  }, [existingTemplateType]);

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

  const handleSaveExistingTemplate = async () => {
    setSavingTemplate(true);
    try {
      await upsertSetting(
        `system_email_template_${existingTemplateType}`,
        JSON.stringify(existingTemplate),
        `Email template config for ${existingTemplateType}`,
      );
      toast({ title: 'Template sačuvan.', status: 'success', isClosable: true });
    } catch {
      toast({ title: 'Greška pri čuvanju template-a.', status: 'error', isClosable: true });
    } finally {
      setSavingTemplate(false);
    }
  };

  const selectedCampaign = campaignTemplates.find((item) => item.id === selectedCampaignId) || null;

  const handleCreateCampaign = () => {
    const next: CampaignTemplate = {
      id: `campaign_${Date.now()}`,
      name: `Nova kampanja ${campaignTemplates.length + 1}`,
      html: '',
      blocks: [createBlock('title'), createBlock('text'), createBlock('button')],
    };
    const nextList = [next, ...campaignTemplates];
    setCampaignTemplates(nextList);
    setSelectedCampaignId(next.id);
  };

  const updateSelectedCampaign = (updater: (current: CampaignTemplate) => CampaignTemplate) => {
    if (!selectedCampaign) return;
    const nextList = campaignTemplates.map((item) =>
      item.id === selectedCampaign.id ? updater(item) : item,
    );
    setCampaignTemplates(nextList);
  };

  const handleCampaignDrop = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault();
    if (!selectedCampaign) return;
    const sourceId = event.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;
    const blocks = [...selectedCampaign.blocks];
    const sourceIndex = blocks.findIndex((block) => block.id === sourceId);
    const targetIndex = blocks.findIndex((block) => block.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = blocks.splice(sourceIndex, 1);
    blocks.splice(targetIndex, 0, moved);
    updateSelectedCampaign((current) => ({
      ...current,
      blocks,
      html: renderCampaignHtml(blocks),
    }));
  };

  const handleSaveCampaignTemplates = async () => {
    setSavingCampaigns(true);
    try {
      const normalized = campaignTemplates.map((item) => ({
        ...item,
        html: campaignMode === 'builder' ? renderCampaignHtml(item.blocks) : item.html,
      }));
      setCampaignTemplates(normalized);
      await upsertSetting(
        CAMPAIGN_KEY,
        JSON.stringify(normalized),
        'Email campaign templates (builder/html)',
      );
      toast({ title: 'Kampanjski template-i sačuvani.', status: 'success', isClosable: true });
    } catch {
      toast({ title: 'Greška pri čuvanju kampanja.', status: 'error', isClosable: true });
    } finally {
      setSavingCampaigns(false);
    }
  };

  const handleToggleCampaignRole = (role: string) => {
    setCampaignRoles((prev) =>
      prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role],
    );
  };

  const getAudiencePayload = () => ({
    roles: campaignRoles,
    onlyActive: onlyActiveAudience,
    onlyEmailVerified: onlyVerifiedAudience,
  });

  const handleLoadAudiencePreview = async () => {
    setLoadingAudience(true);
    try {
      const { data } = await api.post<CampaignAudienceSummary>(
        '/api/notifications/campaigns/audience',
        getAudiencePayload(),
      );
      setAudienceSummary(data);
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || 'Neuspjelo učitavanje publike.',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setLoadingAudience(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!selectedCampaign) {
      toast({ title: 'Odaberite kampanjski template.', status: 'warning', isClosable: true });
      return;
    }
    if ((audienceSummary?.total || 0) <= 0) {
      toast({
        title: 'Publika je prazna. Prvo izračunajte publiku.',
        status: 'warning',
        isClosable: true,
      });
      return;
    }
    setSendingCampaign(true);
    try {
      const { data } = await api.post('/api/notifications/campaigns/send', {
        templateId: selectedCampaign.id,
        subjectOverride: campaignSubject.trim() || undefined,
        campaignName: campaignName.trim() || selectedCampaign.name,
        createInAppNotification,
        tags: ['marketing', 'campaign'],
        audience: getAudiencePayload(),
      });
      toast({
        title: 'Kampanja je poslana.',
        description: `Poslano: ${data?.delivered ?? 0}, preskočeno: ${data?.skipped ?? 0}.`,
        status: 'success',
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: error?.response?.data?.message || 'Slanje kampanje nije uspjelo.',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setSendingCampaign(false);
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

      <Tabs variant="enclosed" colorScheme="brand">
        <TabList>
          <Tab>SMTP i infrastruktura</Tab>
          <Tab>Postojeći template-i</Tab>
          <Tab>Kampanje (Drag & Drop + HTML)</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
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
          </TabPanel>

          <TabPanel px={0}>
            <Card>
              <CardBody>
                <VStack align="stretch" spacing={4}>
                  <HStack>
                    <FormControl>
                      <FormLabel>Tip template-a</FormLabel>
                      <Select
                        value={existingTemplateType}
                        onChange={(event) =>
                          setExistingTemplateType(event.target.value as ExistingTemplateType)
                        }
                      >
                        {EXISTING_TEMPLATE_TYPES.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <Badge alignSelf="end" colorScheme="purple" px={3} py={2} borderRadius="md">
                      Premium Salon Design Aktiviran
                    </Badge>
                  </HStack>

                  <Grid templateColumns="repeat(2, minmax(0, 1fr))" gap={4}>
                    <GridItem colSpan={{ base: 2, md: 1 }}>
                      <FormControl>
                        <FormLabel>Subject</FormLabel>
                        <Input
                          value={existingTemplate.subject}
                          onChange={(event) =>
                            setExistingTemplate((prev) => ({ ...prev, subject: event.target.value }))
                          }
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem colSpan={{ base: 2, md: 1 }}>
                      <FormControl>
                        <FormLabel>Naslov</FormLabel>
                        <Input
                          value={existingTemplate.title}
                          onChange={(event) =>
                            setExistingTemplate((prev) => ({ ...prev, title: event.target.value }))
                          }
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem colSpan={{ base: 2, md: 1 }}>
                      <FormControl>
                        <FormLabel>Intro</FormLabel>
                        <Input
                          value={existingTemplate.intro}
                          onChange={(event) =>
                            setExistingTemplate((prev) => ({ ...prev, intro: event.target.value }))
                          }
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem colSpan={{ base: 2, md: 1 }}>
                      <FormControl>
                        <FormLabel>CTA Label</FormLabel>
                        <Input
                          value={existingTemplate.ctaLabel}
                          onChange={(event) =>
                            setExistingTemplate((prev) => ({ ...prev, ctaLabel: event.target.value }))
                          }
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem colSpan={2}>
                      <FormControl>
                        <FormLabel>Body</FormLabel>
                        <Textarea
                          minH="120px"
                          value={existingTemplate.body}
                          onChange={(event) =>
                            setExistingTemplate((prev) => ({ ...prev, body: event.target.value }))
                          }
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem colSpan={2}>
                      <FormControl>
                        <FormLabel>CTA URL</FormLabel>
                        <Input
                          value={existingTemplate.ctaUrl}
                          onChange={(event) =>
                            setExistingTemplate((prev) => ({ ...prev, ctaUrl: event.target.value }))
                          }
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem colSpan={2}>
                      <FormControl>
                        <FormLabel>Plain Text fallback</FormLabel>
                        <Textarea
                          minH="120px"
                          value={existingTemplate.plainText}
                          onChange={(event) =>
                            setExistingTemplate((prev) => ({ ...prev, plainText: event.target.value }))
                          }
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>

                  <Button colorScheme="brand" onClick={handleSaveExistingTemplate} isLoading={savingTemplate}>
                    Sačuvaj postojeći template
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          </TabPanel>

          <TabPanel px={0}>
            <Card>
              <CardBody>
                <VStack align="stretch" spacing={4}>
                  <HStack>
                    <Button leftIcon={<AddIcon />} onClick={handleCreateCampaign}>
                      Novi kampanjski template
                    </Button>
                    <Select
                      maxW="320px"
                      value={selectedCampaignId}
                      onChange={(event) => setSelectedCampaignId(event.target.value)}
                    >
                      {campaignTemplates.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                    <Select
                      maxW="220px"
                      value={campaignMode}
                      onChange={(event) => setCampaignMode(event.target.value as 'builder' | 'html')}
                    >
                      <option value="builder">Drag & Drop Builder</option>
                      <option value="html">HTML Editor</option>
                    </Select>
                  </HStack>

                  {selectedCampaign ? (
                    <VStack align="stretch" spacing={4}>
                      <FormControl>
                        <FormLabel>Naziv template-a</FormLabel>
                        <Input
                          value={selectedCampaign.name}
                          onChange={(event) =>
                            updateSelectedCampaign((current) => ({ ...current, name: event.target.value }))
                          }
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Subject kampanje (override)</FormLabel>
                        <Input
                          value={campaignSubject}
                          onChange={(event) => setCampaignSubject(event.target.value)}
                          placeholder="npr. Ekskluzivna premium ponuda za vas"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Naziv kampanje (interno)</FormLabel>
                        <Input
                          value={campaignName}
                          onChange={(event) => setCampaignName(event.target.value)}
                          placeholder="npr. Proljetna kampanja 2026"
                        />
                      </FormControl>

                      {campaignMode === 'builder' ? (
                        <Stack spacing={3}>
                          <HStack>
                            <Button size="sm" onClick={() => updateSelectedCampaign((current) => {
                              const nextBlocks = [...current.blocks, createBlock('title')]
                              return { ...current, blocks: nextBlocks, html: renderCampaignHtml(nextBlocks) }
                            })}>+ Naslov</Button>
                            <Button size="sm" onClick={() => updateSelectedCampaign((current) => {
                              const nextBlocks = [...current.blocks, createBlock('text')]
                              return { ...current, blocks: nextBlocks, html: renderCampaignHtml(nextBlocks) }
                            })}>+ Tekst</Button>
                            <Button size="sm" onClick={() => updateSelectedCampaign((current) => {
                              const nextBlocks = [...current.blocks, createBlock('button')]
                              return { ...current, blocks: nextBlocks, html: renderCampaignHtml(nextBlocks) }
                            })}>+ Dugme</Button>
                            <Button size="sm" onClick={() => updateSelectedCampaign((current) => {
                              const nextBlocks = [...current.blocks, createBlock('spacer')]
                              return { ...current, blocks: nextBlocks, html: renderCampaignHtml(nextBlocks) }
                            })}>+ Razmak</Button>
                          </HStack>

                          {selectedCampaign.blocks.map((block, index) => (
                            <Card
                              key={block.id}
                              draggable
                              onDragStart={(event) => event.dataTransfer.setData('text/plain', block.id)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => handleCampaignDrop(event, block.id)}
                              border="1px solid"
                              borderColor="gray.200"
                            >
                              <CardBody>
                                <VStack align="stretch" spacing={2}>
                                  <HStack justify="space-between">
                                    <Badge colorScheme="purple">{block.type.toUpperCase()}</Badge>
                                    <HStack>
                                      <IconButton
                                        aria-label="Move up"
                                        size="xs"
                                        icon={<ArrowUpIcon />}
                                        onClick={() =>
                                          updateSelectedCampaign((current) => {
                                            if (index === 0) return current
                                            const nextBlocks = [...current.blocks]
                                            const temp = nextBlocks[index - 1]
                                            nextBlocks[index - 1] = nextBlocks[index]
                                            nextBlocks[index] = temp
                                            return { ...current, blocks: nextBlocks, html: renderCampaignHtml(nextBlocks) }
                                          })
                                        }
                                      />
                                      <IconButton
                                        aria-label="Move down"
                                        size="xs"
                                        icon={<ArrowDownIcon />}
                                        onClick={() =>
                                          updateSelectedCampaign((current) => {
                                            if (index === current.blocks.length - 1) return current
                                            const nextBlocks = [...current.blocks]
                                            const temp = nextBlocks[index + 1]
                                            nextBlocks[index + 1] = nextBlocks[index]
                                            nextBlocks[index] = temp
                                            return { ...current, blocks: nextBlocks, html: renderCampaignHtml(nextBlocks) }
                                          })
                                        }
                                      />
                                      <IconButton
                                        aria-label="Delete block"
                                        size="xs"
                                        colorScheme="red"
                                        icon={<DeleteIcon />}
                                        onClick={() =>
                                          updateSelectedCampaign((current) => {
                                            const nextBlocks = current.blocks.filter((item) => item.id !== block.id)
                                            return { ...current, blocks: nextBlocks, html: renderCampaignHtml(nextBlocks) }
                                          })
                                        }
                                      />
                                    </HStack>
                                  </HStack>
                                  <Input
                                    value={block.content}
                                    onChange={(event) =>
                                      updateSelectedCampaign((current) => {
                                        const nextBlocks = current.blocks.map((item) =>
                                          item.id === block.id ? { ...item, content: event.target.value } : item,
                                        )
                                        return { ...current, blocks: nextBlocks, html: renderCampaignHtml(nextBlocks) }
                                      })
                                    }
                                  />
                                  {block.type === 'button' && (
                                    <Input
                                      placeholder="Button URL"
                                      value={block.secondary || ''}
                                      onChange={(event) =>
                                        updateSelectedCampaign((current) => {
                                          const nextBlocks = current.blocks.map((item) =>
                                            item.id === block.id ? { ...item, secondary: event.target.value } : item,
                                          )
                                          return { ...current, blocks: nextBlocks, html: renderCampaignHtml(nextBlocks) }
                                        })
                                      }
                                    />
                                  )}
                                </VStack>
                              </CardBody>
                            </Card>
                          ))}
                        </Stack>
                      ) : (
                        <FormControl>
                          <FormLabel>HTML</FormLabel>
                          <Textarea
                            minH="320px"
                            value={selectedCampaign.html}
                            onChange={(event) =>
                              updateSelectedCampaign((current) => ({ ...current, html: event.target.value }))
                            }
                          />
                        </FormControl>
                      )}

                      <FormControl>
                        <FormLabel>HTML Preview Source</FormLabel>
                        <Code whiteSpace="pre-wrap" p={3} borderRadius="md">
                          {(campaignMode === 'builder'
                            ? renderCampaignHtml(selectedCampaign.blocks)
                            : selectedCampaign.html
                          ).slice(0, 1200)}
                        </Code>
                      </FormControl>

                      <Divider />

                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="600">Publika kampanje</Text>
                        <HStack flexWrap="wrap">
                          {['CLIENT', 'STYLIST', 'SYSTEM_ADMIN', 'OWNER'].map((role) => (
                            <Button
                              key={role}
                              size="sm"
                              variant={campaignRoles.includes(role) ? 'solid' : 'outline'}
                              colorScheme={campaignRoles.includes(role) ? 'purple' : 'gray'}
                              onClick={() => handleToggleCampaignRole(role)}
                            >
                              {role}
                            </Button>
                          ))}
                        </HStack>
                        <HStack>
                          <FormControl display="flex" alignItems="center">
                            <FormLabel mb="0">Samo aktivni korisnici</FormLabel>
                            <Switch isChecked={onlyActiveAudience} onChange={(event) => setOnlyActiveAudience(event.target.checked)} />
                          </FormControl>
                          <FormControl display="flex" alignItems="center">
                            <FormLabel mb="0">Samo email-verifikovani</FormLabel>
                            <Switch isChecked={onlyVerifiedAudience} onChange={(event) => setOnlyVerifiedAudience(event.target.checked)} />
                          </FormControl>
                          <FormControl display="flex" alignItems="center">
                            <FormLabel mb="0">Kreiraj in-app notifikaciju</FormLabel>
                            <Switch isChecked={createInAppNotification} onChange={(event) => setCreateInAppNotification(event.target.checked)} />
                          </FormControl>
                        </HStack>

                        <HStack>
                          <Button variant="outline" onClick={handleLoadAudiencePreview} isLoading={loadingAudience}>
                            Izračunaj publiku
                          </Button>
                          <Button colorScheme="purple" onClick={handleSendCampaign} isLoading={sendingCampaign}>
                            Pošalji kampanju
                          </Button>
                        </HStack>

                        {audienceSummary && (
                          <VStack align="stretch" spacing={2}>
                            <Badge colorScheme="purple" w="fit-content" px={3} py={1} borderRadius="full">
                              Ukupno primaoca: {audienceSummary.total}
                            </Badge>
                            <Text fontSize="sm" color="gray.600">
                              Sample (prvih 10):{' '}
                              {audienceSummary.sample.map((item) => item.username).join(', ') || '-'}
                            </Text>
                          </VStack>
                        )}
                        <Text fontSize="xs" color="gray.500">
                          Dinamičke varijable u kampanji: {`{{firstName}}`} {`{{lastName}}`} {`{{username}}`} {`{{email}}`} {`{{appUrl}}`}
                        </Text>
                      </VStack>
                    </VStack>
                  ) : (
                    <Text color="gray.500">
                      Još nema kampanjskih template-a. Kliknite na "Novi kampanjski template".
                    </Text>
                  )}

                  <Button colorScheme="brand" onClick={handleSaveCampaignTemplates} isLoading={savingCampaigns}>
                    Sačuvaj kampanjske template-e
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
