import { DragEvent, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatLocalizedNumber } from '../i18n/locale-utils.mjs'
import api from '../api/client'
import { useAppToast } from '../lib/toast/useAppToast'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Separator } from '../components/ui/separator'
import { Switch } from '../components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Textarea } from '../components/ui/textarea'

type ProviderType = 'google' | 'office365' | 'exchange' | 'custom';

interface AppSetting {
  key: string;
  value: string | null;
  isSecret?: boolean;
  isConfigured?: boolean;
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

const PROVIDERS: Array<{ id: ProviderType }> = [
  { id: 'google' },
  { id: 'office365' },
  { id: 'exchange' },
  { id: 'custom' },
];

const PRESETS: Record<ProviderType, { host: string; port: string; secure: boolean }> = {
  google: { host: 'smtp.gmail.com', port: '587', secure: false },
  office365: { host: 'smtp.office365.com', port: '587', secure: false },
  exchange: { host: '', port: '587', secure: false },
  custom: { host: '', port: '587', secure: false },
};

const KEYS = {
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

const getExistingTemplateDefaults = (type: ExistingTemplateType): ExistingTemplateConfig => {
  if (type === 'verification') {
    return {
      subject: 'Verifikacija email adrese',
      title: 'Verifikacija email adrese',
      intro: 'Poštovani {{firstName}},',
      body: 'Vaš verifikacijski kod je prikazan ispod. Kod važi 15 minuta.',
      ctaLabel: 'Otvori aplikaciju',
      ctaUrl: '{{appUrl}}',
      plainText: 'Vaš verifikacijski kod je validan 15 minuta.',
    };
  }
  if (type === 'reservation_new') {
    return {
      subject: 'Nova rezervacija',
      title: 'Nova rezervacija',
      intro: 'Poštovani {{firstName}},',
      body: 'Zaprimljena je nova rezervacija. Molimo pregledajte detalje i status termina.',
      ctaLabel: 'Otvori rezervacije',
      ctaUrl: '{{appUrl}}/admin/reservations',
      plainText: 'Zaprimljena je nova rezervacija.',
    };
  }
  if (type === 'reservation_confirmed') {
    return {
      subject: 'Rezervacija potvrđena',
      title: 'Vaša rezervacija je potvrđena',
      intro: 'Poštovani {{firstName}},',
      body: 'Termin je uspješno potvrđen. Hvala vam na povjerenju. Broj termina: {{reservationReference}}.',
      ctaLabel: 'Pregled rezervacije',
      ctaUrl: '{{reservationViewUrl}}',
      plainText:
        'Vaša rezervacija je potvrđena. Broj termina: {{reservationReference}}. Link: {{reservationViewUrl}}',
    };
  }
  if (type === 'reservation_cancelled') {
    return {
      subject: 'Rezervacija otkazana',
      title: 'Obavijest o otkazivanju termina',
      intro: 'Poštovani {{firstName}},',
      body: 'Vaša rezervacija je otkazana. Broj termina: {{reservationReference}}.',
      ctaLabel: 'Pregled rezervacije',
      ctaUrl: '{{reservationViewUrl}}',
      plainText:
        'Rezervacija je otkazana. Broj termina: {{reservationReference}}. Link: {{reservationViewUrl}}',
    };
  }
  if (type === 'reservation_reminder') {
    return {
      subject: 'Podsjetnik za termin',
      title: 'Podsjetnik za vaš termin',
      intro: 'Poštovani {{firstName}},',
      body: 'Podsjećamo vas na nadolazeći termin u našem salonu. Broj termina: {{reservationReference}}.',
      ctaLabel: 'Pregled rezervacije',
      ctaUrl: '{{reservationViewUrl}}',
      plainText:
        'Podsjetnik za vaš termin. Broj termina: {{reservationReference}}. Link: {{reservationViewUrl}}',
    };
  }
  if (type === 'reservation_reschedule') {
    return {
      subject: 'Termin je pomjeren',
      title: 'Promjena termina',
      intro: 'Poštovani {{firstName}},',
      body: 'Termin je pomjeren. Molimo provjerite novi termin i potvrdite odgovara li vam. Broj termina: {{reservationReference}}.',
      ctaLabel: 'Pregled rezervacije',
      ctaUrl: '{{reservationViewUrl}}',
      plainText:
        'Termin je pomjeren. Broj termina: {{reservationReference}}. Link: {{reservationViewUrl}}',
    };
  }
  if (type === 'holiday') {
    return {
      subject: 'Obavijest o neradnom danu',
      title: 'Neradni dan / Praznik',
      intro: 'Poštovani {{firstName}},',
      body: 'Salon će biti zatvoren zbog neradnog dana. Hvala na razumijevanju.',
      ctaLabel: 'Otvori aplikaciju',
      ctaUrl: '{{appUrl}}',
      plainText: 'Obavijest o neradnom danu.',
    };
  }
  return {
    subject: 'Nova obavijest',
    title: 'Obavijest iz salona',
    intro: 'Poštovani {{firstName}},',
    body: 'Imate novu obavijest. Otvorite aplikaciju za detalje.',
    ctaLabel: 'Otvori aplikaciju',
    ctaUrl: '{{appUrl}}',
    plainText: 'Imate novu obavijest.',
  };
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
  const { t, i18n } = useTranslation()
  const { success, error: toastError, warning } = useAppToast()
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [provider, setProvider] = useState<ProviderType>('google');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hasPasswordConfigured, setHasPasswordConfigured] = useState(false);
  const [clearPasswordRequested, setClearPasswordRequested] = useState(false);
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
      const hostVal = setValueFromSettings(list, KEYS.host)
      const providerValue: ProviderType =
        hostVal.includes('gmail')
          ? 'google'
          : hostVal.includes('office365') || hostVal.includes('outlook')
            ? 'office365'
            : hostVal
              ? 'custom'
              : 'google'
      setProvider(providerValue);
      setHost(hostVal || PRESETS[providerValue].host);
      setPort(setValueFromSettings(list, KEYS.port) || PRESETS[providerValue].port);
      setSecure((setValueFromSettings(list, KEYS.secure) || String(PRESETS[providerValue].secure)) === 'true');
      setUsername(setValueFromSettings(list, KEYS.username));
      const passwordItem = list.find((item) => item.key === KEYS.password) || null;
      setHasPasswordConfigured(!!passwordItem?.isConfigured || !!passwordItem?.value?.trim());
      setClearPasswordRequested(false);
      setPassword('');
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
              ...getExistingTemplateDefaults(existingTemplateType),
              ...(JSON.parse(selectedTemplateRaw) as Partial<ExistingTemplateConfig>),
            }
          : getExistingTemplateDefaults(existingTemplateType),
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
                ...getExistingTemplateDefaults(existingTemplateType),
                ...(JSON.parse(raw) as Partial<ExistingTemplateConfig>),
              }
            : getExistingTemplateDefaults(existingTemplateType),
        );
      } catch {
        setExistingTemplate(getExistingTemplateDefaults(existingTemplateType));
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
      warning('SMTP host je obavezan.')
      return
    }
    if (!fromEmail.trim()) {
      warning('From email je obavezan.')
      return
    }
    setSaving(true);
    try {
      const ops: Array<Promise<unknown>> = [
        upsertSetting(KEYS.host, host.trim(), 'SMTP host'),
        upsertSetting(KEYS.port, port.trim(), 'SMTP port'),
        upsertSetting(KEYS.secure, String(secure), 'SMTP secure (SSL/TLS)'),
        upsertSetting(KEYS.username, username.trim(), 'SMTP username'),
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
      ];

      if (clearPasswordRequested) {
        ops.push(upsertSetting(KEYS.password, '', 'SMTP password/app password'))
      } else if (password.trim().length > 0) {
        ops.push(upsertSetting(KEYS.password, password, 'SMTP password/app password'))
      }

      await Promise.all(ops)
      success(t('emailSettings.smtp.settingsSaved'))
    } catch {
      toastError(t('emailSettings.smtp.settingsSaveFailed'))
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTo.trim()) {
      warning(t('emailSettings.smtp.testEmailRequired'))
      return
    }
    setSendingTest(true);
    try {
      await api.post('/api/notifications/test-email', { to: testEmailTo.trim() })
      success(t('emailSettings.smtp.testEmailSent'), t('emailSettings.smtp.checkInbox'))
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toastError(msg || t('emailSettings.smtp.testEmailFailed'))
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendTestToMe = async () => {
    setSendingTest(true);
    try {
      await api.post('/api/notifications/test-email', {})
      success(t('emailSettings.smtp.testEmailSentToAdmin'), t('emailSettings.smtp.checkInbox'))
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toastError(msg || t('emailSettings.smtp.testEmailFailed'))
    } finally {
      setSendingTest(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      await api.post('/api/notifications/test-smtp-connection', {})
      success(t('emailSettings.smtp.connectionSuccess'))
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toastError(msg || t('emailSettings.smtp.connectionFailed'))
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
      success(t('emailSettings.templates.templateSaved'))
    } catch {
      toastError(t('emailSettings.templates.templateSaveFailed'))
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
      success(t('emailSettings.campaigns.saved'))
    } catch {
      toastError(t('emailSettings.campaigns.saveFailed'))
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
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toastError(msg || t('emailSettings.campaigns.audienceLoadFailed'))
    } finally {
      setLoadingAudience(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!selectedCampaign) {
      warning(t('emailSettings.campaigns.selectCampaignWarning'))
      return
    }
    if ((audienceSummary?.total || 0) <= 0) {
      warning(t('emailSettings.campaigns.emptyAudienceWarning'))
      return
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
      success(
        t('emailSettings.campaigns.sent'),
        t('emailSettings.campaigns.sendDetails', {
          delivered: formatLocalizedNumber(data?.delivered ?? 0, i18n.language),
          skipped: formatLocalizedNumber(data?.skipped ?? 0, i18n.language),
        }),
      )
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toastError(msg || t('emailSettings.campaigns.sendFailed'))
    } finally {
      setSendingCampaign(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        {t('common.loading')}
      </div>
    )
  }

  const selectClass =
    'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50'

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('emailSettings.title')}</h1>
      <p className="mb-6 text-slate-600 dark:text-slate-300">
        {t('emailSettings.description')}
      </p>

      <Tabs defaultValue="smtp">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-2">
          <TabsTrigger value="smtp">{t('emailSettings.tabs.smtp')}</TabsTrigger>
          <TabsTrigger value="templates">{t('emailSettings.tabs.templates')}</TabsTrigger>
          <TabsTrigger value="campaigns">{t('emailSettings.tabs.campaigns')}</TabsTrigger>
        </TabsList>

        <TabsContent value="smtp" className="mt-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label>{t('emailSettings.smtp.provider')}</Label>
                <select
                  className={`${selectClass} mt-1`}
                  value={provider}
                  onChange={(event) => handleProviderChange(event.target.value as ProviderType)}
                >
                  {PROVIDERS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {t(`emailSettings.providers.${item.id}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('emailSettings.smtp.host')}</Label>
                  <Input className="mt-1" value={host} onChange={(event) => setHost(event.target.value)} />
                </div>
                <div>
                  <Label>{t('emailSettings.smtp.port')}</Label>
                  <Input className="mt-1" value={port} onChange={(event) => setPort(event.target.value)} />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
                <div className="flex items-center justify-between gap-3">
                  <Label className="mb-0">{t('emailSettings.smtp.secure')}</Label>
                  <Switch checked={secure} onCheckedChange={setSecure} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label className="mb-0">{t('emailSettings.smtp.rejectUnauthorized')}</Label>
                  <Switch checked={rejectUnauthorized} onCheckedChange={setRejectUnauthorized} />
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
                <div className="flex items-center justify-between gap-3">
                  <Label className="mb-0">{t('emailSettings.smtp.requireTls')}</Label>
                  <Switch checked={requireTls} onCheckedChange={setRequireTls} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label className="mb-0">{t('emailSettings.smtp.ignoreTls')}</Label>
                  <Switch checked={ignoreTls} onCheckedChange={setIgnoreTls} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label className="mb-0">{t('emailSettings.smtp.connectionPool')}</Label>
                <Switch checked={pool} onCheckedChange={setPool} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('emailSettings.smtp.username')}</Label>
                  <Input className="mt-1" value={username} onChange={(event) => setUsername(event.target.value)} />
                </div>
                <div>
                  <Label>{t('emailSettings.smtp.password')}</Label>
                  <Input
                    className="mt-1"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={hasPasswordConfigured ? t('emailSettings.smtp.passwordSavedPlaceholder') : ''}
                  />
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="text-xs text-slate-500">
                      {hasPasswordConfigured
                        ? t('emailSettings.smtp.passwordSavedHint')
                        : t('emailSettings.smtp.passwordEntryHint')}
                    </p>
                    {hasPasswordConfigured ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="shrink-0 text-rose-600"
                        onClick={() => {
                          if (!window.confirm(t('emailSettings.smtp.clearPasswordConfirm'))) return
                          setClearPasswordRequested(true)
                          setHasPasswordConfigured(false)
                          setPassword('')
                        }}
                      >
                        {t('emailSettings.smtp.clearPassword')}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('emailSettings.smtp.connectionTimeout')}</Label>
                  <Input
                    className="mt-1"
                    value={connectionTimeoutMs}
                    onChange={(event) => setConnectionTimeoutMs(event.target.value)}
                  />
                </div>
                <div>
                  <Label>{t('emailSettings.smtp.greetingTimeout')}</Label>
                  <Input
                    className="mt-1"
                    value={greetingTimeoutMs}
                    onChange={(event) => setGreetingTimeoutMs(event.target.value)}
                  />
                </div>
                <div>
                  <Label>{t('emailSettings.smtp.socketTimeout')}</Label>
                  <Input
                    className="mt-1"
                    value={socketTimeoutMs}
                    onChange={(event) => setSocketTimeoutMs(event.target.value)}
                  />
                </div>
                <div>
                  <Label>{t('emailSettings.smtp.maxConnectionsAndMessages')}</Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      value={maxConnections}
                      onChange={(event) => setMaxConnections(event.target.value)}
                      placeholder="5"
                    />
                    <Input
                      value={maxMessages}
                      onChange={(event) => setMaxMessages(event.target.value)}
                      placeholder="100"
                    />
                  </div>
                </div>
              </div>

              {!isCustomLike ? (
                <p className="text-sm text-slate-500">
                  {t('emailSettings.smtp.providerCredentialsHint', { provider: provider === 'google' ? 'Google' : 'Office 365' })}
                </p>
              ) : null}

              <Separator />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('emailSettings.smtp.fromEmail')}</Label>
                  <Input className="mt-1" value={fromEmail} onChange={(event) => setFromEmail(event.target.value)} />
                </div>
                <div>
                  <Label>{t('emailSettings.smtp.fromName')}</Label>
                  <Input className="mt-1" value={fromName} onChange={(event) => setFromName(event.target.value)} />
                </div>
                <div>
                  <Label>{t('emailSettings.smtp.replyTo')}</Label>
                  <Input
                    className="mt-1"
                    value={replyTo}
                    onChange={(event) => setReplyTo(event.target.value)}
                    placeholder="support@domena.com"
                  />
                </div>
                <div>
                  <Label>{t('emailSettings.smtp.signature')}</Label>
                  <Input className="mt-1" value={signature} onChange={(event) => setSignature(event.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>{t('emailSettings.smtp.publicAppUrl')}</Label>
                  <Input
                    className="mt-1"
                    value={publicAppUrl}
                    onChange={(event) => setPublicAppUrl(event.target.value)}
                    placeholder="https://vas-domen.ba"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('emailSettings.smtp.saveSettings')}
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleTestConnection()} disabled={testingConnection}>
                  {testingConnection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('emailSettings.smtp.testConnection')}
                </Button>
              </div>

              <Separator />

              <div>
                <Label>{t('emailSettings.smtp.testEmail')}</Label>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={testEmailTo}
                    onChange={(event) => setTestEmailTo(event.target.value)}
                    placeholder="email@domena.com"
                    className="sm:max-w-xs"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => void handleSendTestEmail()} disabled={sendingTest}>
                      {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t('emailSettings.smtp.sendTest')}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => void handleSendTestToMe()} disabled={sendingTest}>
                      {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t('emailSettings.smtp.sendToAdmin')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                  <Label>{t('emailSettings.templates.selectorLabel')}</Label>
                  <select
                    className={`${selectClass} mt-1`}
                    value={existingTemplateType}
                    onChange={(event) => setExistingTemplateType(event.target.value as ExistingTemplateType)}
                  >
                    {EXISTING_TEMPLATE_TYPES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {t(`emailSettings.templates.types.${item.id}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <Badge variant="brand" className="w-fit px-3 py-2">
                  {t('emailSettings.templates.premiumDesignActive')}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('emailSettings.templates.subject')}</Label>
                  <Input
                    className="mt-1"
                    value={existingTemplate.subject}
                    onChange={(event) => setExistingTemplate((prev) => ({ ...prev, subject: event.target.value }))}
                  />
                </div>
                <div>
                  <Label>{t('emailSettings.templates.title')}</Label>
                  <Input
                    className="mt-1"
                    value={existingTemplate.title}
                    onChange={(event) => setExistingTemplate((prev) => ({ ...prev, title: event.target.value }))}
                  />
                </div>
                <div>
                  <Label>{t('emailSettings.templates.intro')}</Label>
                  <Input
                    className="mt-1"
                    value={existingTemplate.intro}
                    onChange={(event) => setExistingTemplate((prev) => ({ ...prev, intro: event.target.value }))}
                  />
                </div>
                <div>
                  <Label>{t('emailSettings.templates.ctaLabel')}</Label>
                  <Input
                    className="mt-1"
                    value={existingTemplate.ctaLabel}
                    onChange={(event) => setExistingTemplate((prev) => ({ ...prev, ctaLabel: event.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>{t('emailSettings.templates.body')}</Label>
                  <Textarea
                    className="mt-1 min-h-[120px]"
                    value={existingTemplate.body}
                    onChange={(event) => setExistingTemplate((prev) => ({ ...prev, body: event.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>{t('emailSettings.templates.ctaUrl')}</Label>
                  <Input
                    className="mt-1"
                    value={existingTemplate.ctaUrl}
                    onChange={(event) => setExistingTemplate((prev) => ({ ...prev, ctaUrl: event.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>{t('emailSettings.templates.plainTextFallback')}</Label>
                  <Textarea
                    className="mt-1 min-h-[120px]"
                    value={existingTemplate.plainText}
                    onChange={(event) => setExistingTemplate((prev) => ({ ...prev, plainText: event.target.value }))}
                  />
                </div>
              </div>

              <Button type="button" onClick={() => void handleSaveExistingTemplate()} disabled={savingTemplate}>
                {savingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('emailSettings.templates.saveExisting')}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button type="button" variant="outline" onClick={handleCreateCampaign}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('emailSettings.campaigns.newTemplate')}
                  </Button>
                  <select
                    className={`${selectClass} sm:w-[320px]`}
                    value={selectedCampaignId}
                    onChange={(event) => setSelectedCampaignId(event.target.value)}
                  >
                    {campaignTemplates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className={`${selectClass} sm:w-[220px]`}
                    value={campaignMode}
                    onChange={(event) => setCampaignMode(event.target.value as 'builder' | 'html')}
                  >
                    <option value="builder">{t('emailSettings.campaigns.builderMode')}</option>
                    <option value="html">{t('emailSettings.campaigns.htmlMode')}</option>
                  </select>
                </div>
              </div>

              {selectedCampaign ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label>{t('emailSettings.campaigns.templateName')}</Label>
                      <Input
                        className="mt-1"
                        value={selectedCampaign.name}
                        onChange={(event) =>
                          updateSelectedCampaign((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>{t('emailSettings.campaigns.subjectOverride')}</Label>
                      <Input
                        className="mt-1"
                        value={campaignSubject}
                        onChange={(event) => setCampaignSubject(event.target.value)}
                        placeholder={t('emailSettings.campaigns.subjectPlaceholder')}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>{t('emailSettings.campaigns.internalName')}</Label>
                      <Input
                        className="mt-1"
                        value={campaignName}
                        onChange={(event) => setCampaignName(event.target.value)}
                        placeholder={t('emailSettings.campaigns.internalNamePlaceholder')}
                      />
                    </div>
                  </div>

                  {campaignMode === 'builder' ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateSelectedCampaign((current) => {
                              const nextBlocks = [...current.blocks, createBlock('title')]
                              return { ...current, blocks: nextBlocks, html: renderCampaignHtml(nextBlocks) }
                            })
                          }
                        >
                          + {t('emailSettings.campaigns.addTitle')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateSelectedCampaign((current) => {
                              const nextBlocks = [...current.blocks, createBlock('text')]
                              return { ...current, blocks: nextBlocks, html: renderCampaignHtml(nextBlocks) }
                            })
                          }
                        >
                          + {t('emailSettings.campaigns.addText')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateSelectedCampaign((current) => {
                              const nextBlocks = [...current.blocks, createBlock('button')]
                              return { ...current, blocks: nextBlocks, html: renderCampaignHtml(nextBlocks) }
                            })
                          }
                        >
                          + {t('emailSettings.campaigns.addButton')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateSelectedCampaign((current) => {
                              const nextBlocks = [...current.blocks, createBlock('spacer')]
                              return { ...current, blocks: nextBlocks, html: renderCampaignHtml(nextBlocks) }
                            })
                          }
                        >
                          + {t('emailSettings.campaigns.addSpacer')}
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {selectedCampaign.blocks.map((block, index) => (
                          <Card
                            key={block.id}
                            className="border border-slate-200 p-4 dark:border-slate-800"
                            draggable
                            onDragStart={(event) => event.dataTransfer.setData('text/plain', block.id)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => handleCampaignDrop(event, block.id)}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <Badge variant="secondary" className="text-[10px]">
                                  {t(`emailSettings.campaigns.blockTypes.${block.type}`)}
                                </Badge>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    aria-label={t('emailSettings.campaigns.moveUp')}
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
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    aria-label={t('emailSettings.campaigns.moveDown')}
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
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-rose-600"
                                    aria-label={t('emailSettings.campaigns.deleteBlock')}
                                    onClick={() =>
                                      updateSelectedCampaign((current) => {
                                        const nextBlocks = current.blocks.filter((item) => item.id !== block.id)
                                        return { ...current, blocks: nextBlocks, html: renderCampaignHtml(nextBlocks) }
                                      })
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

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
                              {block.type === 'button' ? (
                                <Input
                                  placeholder={t('emailSettings.campaigns.buttonUrl')}
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
                              ) : null}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label>{t('emailSettings.campaigns.htmlLabel')}</Label>
                      <Textarea
                        className="mt-1 min-h-[320px]"
                        value={selectedCampaign.html}
                        onChange={(event) =>
                          updateSelectedCampaign((current) => ({ ...current, html: event.target.value }))
                        }
                      />
                    </div>
                  )}

                  <div>
                    <Label>{t('emailSettings.campaigns.htmlPreviewSource')}</Label>
                    <pre className="mt-1 max-h-[280px] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-100">
                      {(campaignMode === 'builder'
                        ? renderCampaignHtml(selectedCampaign.blocks)
                        : selectedCampaign.html
                      ).slice(0, 1200)}
                    </pre>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="font-semibold text-slate-900 dark:text-slate-50">
                      {t('emailSettings.campaigns.audienceHeading')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['CLIENT', 'STYLIST', 'SYSTEM_ADMIN', 'OWNER'].map((role) => (
                        <Button
                          key={role}
                          type="button"
                          size="sm"
                          variant={campaignRoles.includes(role) ? 'default' : 'outline'}
                          onClick={() => handleToggleCampaignRole(role)}
                        >
                          {t(`users.roleNames.${role}`)}
                        </Button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="mb-0">{t('emailSettings.campaigns.onlyActiveUsers')}</Label>
                        <Switch checked={onlyActiveAudience} onCheckedChange={setOnlyActiveAudience} />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <Label className="mb-0">{t('emailSettings.campaigns.onlyVerifiedUsers')}</Label>
                        <Switch checked={onlyVerifiedAudience} onCheckedChange={setOnlyVerifiedAudience} />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <Label className="mb-0">{t('emailSettings.campaigns.createInAppNotification')}</Label>
                        <Switch
                          checked={createInAppNotification}
                          onCheckedChange={setCreateInAppNotification}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleLoadAudiencePreview()}
                        disabled={loadingAudience}
                      >
                        {loadingAudience ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t('emailSettings.campaigns.calculateAudience')}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void handleSendCampaign()}
                        disabled={sendingCampaign}
                      >
                        {sendingCampaign ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t('emailSettings.campaigns.sendCampaign')}
                      </Button>
                    </div>

                    {audienceSummary ? (
                      <div className="space-y-2">
                        <Badge variant="brand" className="w-fit px-3 py-1">
                          {t('emailSettings.campaigns.totalRecipients', {
                            total: formatLocalizedNumber(audienceSummary.total, i18n.language),
                          })}
                        </Badge>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {t('emailSettings.campaigns.sampleFirstTen', {
                            names: audienceSummary.sample.map((item) => item.username).join(', ') || '-',
                          })}
                        </p>
                      </div>
                    ) : null}

                    <p className="text-xs text-slate-500">
                      {t('emailSettings.campaigns.dynamicVariables')}{' '}
                      {'{{firstName}}'} {'{{lastName}}'} {'{{username}}'} {'{{email}}'} {'{{appUrl}}'}
                    </p>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleSaveCampaignTemplates()}
                      disabled={savingCampaigns}
                    >
                      {savingCampaigns ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t('emailSettings.campaigns.saveTemplates')}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  {t('emailSettings.campaigns.noTemplates', {
                    action: t('emailSettings.campaigns.newTemplate'),
                  })}
                </p>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
