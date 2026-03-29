import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Heading, Text, Spinner, Card, CardBody, Button,
  Flex, useToast, FormControl,
  Input, Textarea, Tabs, TabList, Tab, TabPanels,
  TabPanel, Badge, VStack, Switch, HStack, Icon,
  NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper,
  Image, Tooltip, InputGroup, InputLeftAddon,
  useColorModeValue, Tag, Alert, AlertIcon, AlertTitle, AlertDescription,
  Divider, SimpleGrid,
} from '@chakra-ui/react';
import {
  EditIcon, CheckIcon, CloseIcon, ExternalLinkIcon,
  InfoIcon, SettingsIcon, ViewIcon, AtSignIcon,
  CalendarIcon, BellIcon, LockIcon, StarIcon,
} from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { useSettings } from '../context/SettingsContext';
import { useSocketEvent } from '../context/SocketContext';
import { getUploadUrl } from '../utils/uploadUrl';

interface AppSetting {
  key: string;
  value: string | null;
  description: string | null;
  isSecret?: boolean;
  isConfigured?: boolean;
  scope?: 'PUBLIC' | 'PRIVATE';
  type?: 'string' | 'boolean' | 'number' | 'json';
}

type SettingType = 'text' | 'textarea' | 'boolean' | 'number' | 'url' | 'image' | 'email' | 'color';

type RegistryItem = {
  key: string
  scope: 'PUBLIC' | 'PRIVATE'
  type: 'string' | 'boolean' | 'number' | 'json'
  isSecret?: boolean
  defaultValue?: string
  min?: number
  max?: number
}

interface SettingDef {
  key: string;
  desc: string;
  type: SettingType;
  placeholder?: string;
  min?: number;
  max?: number;
  suffix?: string;
}

interface SettingGroup {
  label: string;
  prefix: string;
  description: string;
  icon: typeof SettingsIcon;
  color: string;
  defaults: SettingDef[];
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    label: 'Režim održavanja',
    prefix: 'maintenance_',
    description:
      'Kada je uključeno, javni web i mobilna početna prikazuju poruku umjesto sadržaja. Admin panel (/admin) i stranice prijave (/login) rade normalno.',
    icon: LockIcon,
    color: 'orange',
    defaults: [
      { key: 'system_maintenance_mode', desc: 'Režim održavanja (javni sadržaj blokiran)', type: 'boolean' },
      {
        key: 'public_maintenance_message',
        desc: 'Poruka za posjetioce (prazno = podrazumijevani tekst)',
        type: 'textarea',
        placeholder: 'Radimo na poboljšanjima. Pokušajte kasnije.',
      },
    ],
  },
  {
    label: 'Hero Sekcija',
    prefix: 'public_hero_',
    description: 'Postavke za hero (glavnu) sekciju na javnoj početnoj stranici. Ovdje definirate naslov, podnaslov, pozadinsku sliku i CTA dugme.',
    icon: StarIcon,
    color: 'purple',
    defaults: [
      { key: 'public_hero_title', desc: 'Glavni naslov koji se prikazuje na hero sekciji', type: 'text', placeholder: 'Dobro došli u Beauty Salon Nejra' },
      { key: 'public_hero_subtitle', desc: 'Podnaslov ispod glavnog naslova', type: 'textarea', placeholder: 'Vaš frizerski salon za savršen izgled...' },
      { key: 'public_hero_image', desc: 'URL pozadinske slike za hero sekciju (preporučena veličina: 1920x800px)', type: 'image', placeholder: 'https://...' },
      { key: 'public_hero_cta_text', desc: 'Tekst na glavnom CTA (Call-to-Action) dugmetu', type: 'text', placeholder: 'Rezervišite termin' },
      { key: 'public_hero_cta_link', desc: 'Link na koji vodi CTA dugme', type: 'url', placeholder: '/rezervacija' },
    ],
  },
  {
    label: 'O Nama',
    prefix: 'public_about_',
    description: 'Sekcija "O nama" na javnoj stranici. Predstavite svoj salon, iskustvo i tim.',
    icon: InfoIcon,
    color: 'blue',
    defaults: [
      { key: 'public_about_title', desc: 'Naslov sekcije "O nama"', type: 'text', placeholder: 'O nama' },
      { key: 'public_about_text', desc: 'Tekst o salonu – opišite svoju priču, iskustvo i specijalizacije', type: 'textarea', placeholder: 'Beauty Salon Nejra nudi...' },
      { key: 'public_about_image', desc: 'Slika za sekciju "O nama" (preporučena: 600x400px)', type: 'image', placeholder: 'https://...' },
    ],
  },
  {
    label: 'Kontakt Informacije',
    prefix: 'public_contact_',
    description: 'Kontakt podaci koji se prikazuju na javnoj stranici i u footeru.',
    icon: AtSignIcon,
    color: 'green',
    defaults: [
      { key: 'public_contact_bg', desc: 'Pozadinska slika stranice kontakt', type: 'image', placeholder: 'https://...' },
      { key: 'public_contact_title', desc: 'Naslov stranice kontakt', type: 'text', placeholder: 'Kontakt' },
      { key: 'public_contact_subtitle', desc: 'Podnaslov stranice kontakt', type: 'text', placeholder: 'Javite nam se' },
      { key: 'public_contact_address', desc: 'Fizička adresa salona', type: 'text', placeholder: 'Ulica i broj, Grad' },
      { key: 'public_contact_phone', desc: 'Kontakt telefon', type: 'text', placeholder: '+387 XX XXX XXX' },
      { key: 'public_contact_email', desc: 'Kontakt email adresa', type: 'email', placeholder: 'info@salon.ba' },
      { key: 'public_contact_map_embed', desc: 'Google Maps embed URL za prikaz mape (kopirajte iz Google Maps → Share → Embed)', type: 'url', placeholder: 'https://www.google.com/maps/embed?...' },
      { key: 'public_contact_working_hours_text', desc: 'Tekst radnog vremena za javni prikaz (npr. "Pon-Pet: 09-17h, Sub: 09-14h")', type: 'textarea', placeholder: 'Pon-Pet: 09:00-17:00\nSub: 09:00-14:00\nNed: Zatvoreno' },
    ],
  },
  {
    label: 'Društvene Mreže',
    prefix: 'public_social_',
    description: 'Linkovi na vaše profile na društvenim mrežama. Prikazuju se u footeru i kontakt sekciji.',
    icon: ExternalLinkIcon,
    color: 'pink',
    defaults: [
      { key: 'public_social_facebook', desc: 'Link na Facebook stranicu', type: 'url', placeholder: 'https://facebook.com/vaš-salon' },
      { key: 'public_social_instagram', desc: 'Link na Instagram profil', type: 'url', placeholder: 'https://instagram.com/vaš-salon' },
      { key: 'public_social_tiktok', desc: 'Link na TikTok profil', type: 'url', placeholder: 'https://tiktok.com/@vaš-salon' },
    ],
  },
  {
    label: 'Footer',
    prefix: 'public_footer_',
    description: 'Postavke za footer (podnožje) na svim javnim stranicama.',
    icon: ViewIcon,
    color: 'gray',
    defaults: [
      { key: 'public_footer_text', desc: 'Tekst u footeru (npr. kratki opis salona)', type: 'textarea', placeholder: 'Beauty Salon Nejra - Vaš salon za ljepotu' },
      { key: 'public_footer_copyright', desc: 'Copyright tekst u footeru', type: 'text', placeholder: '© 2026 Beauty Salon Nejra. Sva prava zadržana.' },
    ],
  },
  {
    label: 'Rezervacija - Javna Stranica',
    prefix: 'public_reserve_',
    description: 'Postavke za stranicu rezervacije koja je vidljiva klijentima.',
    icon: CalendarIcon,
    color: 'teal',
    defaults: [
      { key: 'public_reserve_title', desc: 'Naslov stranice za rezervaciju', type: 'text', placeholder: 'Rezervišite Vaš Termin' },
      { key: 'public_reserve_subtitle', desc: 'Podnaslov na stranici za rezervaciju', type: 'text', placeholder: 'Osigurajte svoje vrijeme...' },
      { key: 'public_reserve_bg', desc: 'Pozadinska slika za stranicu rezervacije (preporučena: 1920x1080px)', type: 'image', placeholder: 'https://...' },
    ],
  },
  {
    label: 'Blokovi (highlights)',
    prefix: 'public_highlight_',
    description: 'Tri istaknuta bloka na početnoj stranici.',
    icon: StarIcon,
    color: 'purple',
    defaults: [
      { key: 'public_highlight_1_title', desc: 'Naslov bloka 1', type: 'text', placeholder: '' },
      { key: 'public_highlight_1_text', desc: 'Tekst bloka 1', type: 'textarea', placeholder: '' },
      { key: 'public_highlight_2_title', desc: 'Naslov bloka 2', type: 'text', placeholder: '' },
      { key: 'public_highlight_2_text', desc: 'Tekst bloka 2', type: 'textarea', placeholder: '' },
      { key: 'public_highlight_3_title', desc: 'Naslov bloka 3', type: 'text', placeholder: '' },
      { key: 'public_highlight_3_text', desc: 'Tekst bloka 3', type: 'textarea', placeholder: '' },
    ],
  },
  {
    label: 'Pregled usluga (kartice)',
    prefix: 'public_services_peek_',
    description: 'Naslovi i slike za sekciju usluga na početnoj stranici.',
    icon: ViewIcon,
    color: 'teal',
    defaults: [
      { key: 'public_services_peek_title', desc: 'Naslov sekcije', type: 'text', placeholder: '' },
      { key: 'public_services_peek_subtitle', desc: 'Podnaslov sekcije', type: 'text', placeholder: '' },
      { key: 'public_service_1_title', desc: 'Naslov kartice 1', type: 'text', placeholder: '' },
      { key: 'public_service_1_img', desc: 'Slika kartice 1', type: 'image', placeholder: 'https://...' },
      { key: 'public_service_2_title', desc: 'Naslov kartice 2', type: 'text', placeholder: '' },
      { key: 'public_service_2_img', desc: 'Slika kartice 2', type: 'image', placeholder: 'https://...' },
      { key: 'public_service_3_title', desc: 'Naslov kartice 3', type: 'text', placeholder: '' },
      { key: 'public_service_3_img', desc: 'Slika kartice 3', type: 'image', placeholder: 'https://...' },
    ],
  },
  {
    label: 'Stranice (lista usluga, galerija, blog)',
    prefix: 'public_pages_',
    description: 'Hero naslovi i pozadine za stranice /usluge, /galerija, /blog.',
    icon: ViewIcon,
    color: 'blue',
    defaults: [
      { key: 'public_services_bg', desc: 'Pozadina stranice lista usluga', type: 'image', placeholder: 'https://...' },
      { key: 'public_services_title', desc: 'Naslov stranice lista usluga', type: 'text', placeholder: '' },
      { key: 'public_services_subtitle', desc: 'Podnaslov stranice lista usluga', type: 'text', placeholder: '' },
      { key: 'public_gallery_bg', desc: 'Pozadina stranice galerije', type: 'image', placeholder: 'https://...' },
      { key: 'public_gallery_title', desc: 'Naslov stranice galerije', type: 'text', placeholder: '' },
      { key: 'public_gallery_subtitle', desc: 'Podnaslov stranice galerije', type: 'text', placeholder: '' },
      { key: 'public_blog_bg', desc: 'Pozadina stranice bloga', type: 'image', placeholder: 'https://...' },
      { key: 'public_blog_title', desc: 'Naslov stranice bloga', type: 'text', placeholder: '' },
      { key: 'public_blog_subtitle', desc: 'Podnaslov stranice bloga', type: 'text', placeholder: '' },
    ],
  },
  {
    label: 'Prijava i registracija',
    prefix: 'public_auth_',
    description: 'Slike i tekstovi za stranice /login i /register.',
    icon: LockIcon,
    color: 'gray',
    defaults: [
      { key: 'public_login_image', desc: 'Slika panela prijave', type: 'image', placeholder: 'https://...' },
      { key: 'public_login_title', desc: 'Naslov prijave', type: 'text', placeholder: '' },
      { key: 'public_login_subtitle', desc: 'Podnaslov prijave', type: 'text', placeholder: '' },
      { key: 'public_register_image', desc: 'Slika panela registracije', type: 'image', placeholder: 'https://...' },
      { key: 'public_register_title', desc: 'Naslov registracije', type: 'text', placeholder: '' },
      { key: 'public_register_subtitle', desc: 'Podnaslov registracije', type: 'text', placeholder: '' },
    ],
  },
];

const SYSTEM_GROUPS: SettingGroup[] = [
  {
    label: 'Branding',
    prefix: 'app_',
    description: 'Logo i naziv aplikacije. Ako je logo postavljen, prikazuje se umjesto naziva na webu i u mobilnom hero-u.',
    icon: StarIcon,
    color: 'pink',
    defaults: [
      { key: 'app_title', desc: 'Naziv aplikacije', type: 'text', placeholder: 'Beauty Salon' },
      { key: 'app_logo', desc: 'Logo aplikacije (upload ili URL)', type: 'image', placeholder: 'https://... ili upload' },
    ],
  },
  {
    label: 'Notifikacije',
    prefix: 'system_notif_',
    description: 'Postavke za email i push notifikacije.',
    icon: BellIcon,
    color: 'cyan',
    defaults: [
      { key: 'system_notif_email_from', desc: 'Email adresa s koje se šalju notifikacije (from)', type: 'email', placeholder: 'noreply@salon.ba' },
      { key: 'system_notif_email_name', desc: 'Ime pošiljaoca u email notifikacijama', type: 'text', placeholder: 'Beauty Salon Nejra' },
      { key: 'system_notif_reminder_hours', desc: 'Koliko sati prije termina poslati podsjetnik klijentu', type: 'number', min: 1, max: 48, suffix: 'sati' },
    ],
  },
  {
    label: 'Opće Postavke',
    prefix: 'system_general_',
    description: 'Opće sistemske postavke aplikacije.',
    icon: LockIcon,
    color: 'red',
    defaults: [
      { key: 'system_public_app_url', desc: 'Javni URL aplikacije (linkovi u emailovima, itd.)', type: 'url', placeholder: 'https://salon.ba' },
      { key: 'system_app_version', desc: 'Trenutna verzija aplikacije (informativno)', type: 'text', placeholder: '2.0.0' },
    ],
  },
  {
    label: 'Loyalty program',
    prefix: 'loyalty_',
    description:
      'Pravila bodovanja, nivoa i korištenja bodova za loyalty program. Ove postavke primjenjuju se globalno na sve klijente.',
    icon: StarIcon,
    color: 'green',
    defaults: [
      { key: 'loyalty_enabled', desc: 'Loyalty program uključen (osnovni switch je i na stranici Loyalty)', type: 'boolean' },
      { key: 'loyalty_points_per_currency', desc: 'Broj bodova po 1 KM stvarne cijene usluge', type: 'number', min: 0, max: 100, suffix: 'bodova / KM' },
      { key: 'loyalty_earn_on_tip', desc: 'Računati bodove i na iznos napojnice (tip)', type: 'boolean' },
      { key: 'loyalty_min_amount_for_earn', desc: 'Minimalni iznos usluge za dodjelu bodova', type: 'number', min: 0, max: 10000, suffix: 'KM' },
      { key: 'loyalty_excluded_services', desc: 'JSON lista ID-ova servisa koji su isključeni iz bodovanja', type: 'textarea', placeholder: '["service-id-1","service-id-2"]' },
      { key: 'loyalty_redeem_enabled', desc: 'Dopustiti korištenje (redeem) bodova', type: 'boolean' },
      { key: 'loyalty_redeem_rate', desc: 'Informativno: vrijednost 1 boda u KM (trenutno za prikaz / buduće feature-e)', type: 'number', min: 0, max: 10, suffix: 'KM / bod' },
      { key: 'loyalty_min_points_to_redeem', desc: 'Minimalan broj bodova za jedno korištenje (redeem)', type: 'number', min: 0, max: 100000, suffix: 'bodova' },
      { key: 'loyalty_max_discount_percent', desc: 'Maksimalni procenat računa koji se može platiti bodovima (za buduću validaciju)', type: 'number', min: 0, max: 100, suffix: '%' },
      {
        key: 'loyalty_tiers',
        desc: 'JSON definicija nivoa (tierova) po ukupnim bodovima (Silver/Gold/Platinum...)',
        type: 'textarea',
        placeholder:
          '[{"id":"silver","name":"Silver","minPoints":0},{"id":"gold","name":"Gold","minPoints":500},{"id":"platinum","name":"Platinum","minPoints":1500}]',
      },
    ],
  },
];

const ALL_KNOWN_SETTING_KEYS = [
  ...SETTING_GROUPS.flatMap((g) => g.defaults.map((d) => d.key)),
  ...SYSTEM_GROUPS.flatMap((g) => g.defaults.map((d) => d.key)),
];

function isMeaningfullyConfigured(row: AppSetting | undefined, reg: RegistryItem | undefined): boolean {
  if (!row || !reg) return false;
  if (row.isSecret) return Boolean(row.isConfigured);
  const v = row.value;
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  if (reg.type === 'boolean') {
    const def = (reg.defaultValue ?? 'false').toLowerCase();
    return s.toLowerCase() !== def;
  }
  if (reg.type === 'number') {
    const def = reg.defaultValue ?? '0';
    return s.trim() !== def;
  }
  if (reg.type === 'json') {
    const def = (reg.defaultValue ?? '').trim();
    if (s === '') return false;
    if (def !== '' && s === def) return false;
    return true;
  }
  const def = reg.defaultValue ?? '';
  if (s === '') return false;
  if (def !== '' && s === def) return false;
  return true;
}

function SettingEditor({
  def,
  setting,
  onSave,
}: {
  def: SettingDef;
  setting: AppSetting | undefined;
  onSave: (key: string, value: string, desc: string) => Promise<void>;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(setting?.value ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const cardBg = useColorModeValue('white', 'gray.700');

  useEffect(() => {
    setValue(setting?.value ?? '');
    setSelectedFile(null);
  }, [setting]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(def.key, value, def.desc);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(setting?.value ?? '');
    setSelectedFile(null);
    setEditing(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('entity', 'branding');
      const { data } = await api.post<{ pathOriginal: string }>('/api/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!data?.pathOriginal) throw new Error('Upload failed');
      setValue(data.pathOriginal);
      setSelectedFile(null);
      toast({ title: 'Logo uploadovan', status: 'success', duration: 2000, isClosable: true });
    } catch {
      toast({ title: 'Greška pri uploadu', status: 'error', isClosable: true });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    const current = (value || '').trim();
    if (!current) return;
    const shouldDeleteFromStorage =
      !current.startsWith('http') && !current.startsWith('data:') && !current.startsWith('blob:');
    setSaving(true);
    try {
      if (shouldDeleteFromStorage) {
        await api.delete('/api/uploads/by-path-original', { data: { pathOriginal: current } });
      }
      await onSave(def.key, '', def.desc);
      setEditing(false);
      toast({ title: 'Slika uklonjena', status: 'success', duration: 2000, isClosable: true });
    } catch {
      toast({ title: 'Greška pri uklanjanju', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const handleBooleanToggle = async (checked: boolean) => {
    setSaving(true);
    try {
      await onSave(def.key, checked ? 'true' : 'false', def.desc);
    } finally {
      setSaving(false);
    }
  };

  if (def.type === 'boolean') {
    const isOn = (setting?.value ?? 'false').toLowerCase() === 'true';
    return (
      <Card size="sm" bg={cardBg} shadow="sm" _hover={{ shadow: 'md' }} transition="all 0.2s">
        <CardBody>
          <Flex justify="space-between" align="center">
            <Box flex={1}>
              <Text fontWeight="600" fontSize="sm" color="gray.700">{def.desc}</Text>
              <Text fontSize="xs" color="gray.400" fontFamily="mono" mt={0.5}>{def.key}</Text>
            </Box>
            <Switch
              isChecked={isOn}
              onChange={(e) => handleBooleanToggle(e.target.checked)}
              colorScheme="brand"
              size="lg"
              isDisabled={saving}
            />
          </Flex>
        </CardBody>
      </Card>
    );
  }

  const hasValue = setting?.value !== null && setting?.value !== undefined && setting?.value !== '';

  if (!editing) {
    return (
      <Card size="sm" bg={cardBg} shadow="sm" _hover={{ shadow: 'md' }} transition="all 0.2s">
        <CardBody>
          <Flex justify="space-between" align="start" gap={3}>
            <Box flex={1} minW={0}>
              <HStack spacing={2} mb={1}>
                <Text fontWeight="600" fontSize="sm" color="gray.700">{def.desc}</Text>
                {hasValue ? (
                  <Badge colorScheme="green" fontSize="2xs">Postavljeno</Badge>
                ) : (
                  <Badge colorScheme="gray" fontSize="2xs">Nije postavljeno</Badge>
                )}
              </HStack>
              <Text fontSize="xs" color="gray.400" fontFamily="mono" mb={1}>{def.key}</Text>

              {hasValue && def.type === 'image' && setting?.value && (
                <Box mt={2} mb={1}>
                  <Image
                    src={getUploadUrl(setting.value)}
                    alt={def.key}
                    maxH="80px"
                    rounded="md"
                    objectFit="cover"
                    fallback={
                      <Box p={2} bg="gray.100" rounded="md">
                        <Text fontSize="xs" color="gray.500">Slika nije dostupna</Text>
                      </Box>
                    }
                  />
                </Box>
              )}

              {hasValue && def.type === 'url' && setting?.value && (
                <Tooltip label={setting.value} placement="top">
                  <Text
                    fontSize="sm"
                    color="blue.500"
                    noOfLines={1}
                    cursor="pointer"
                    onClick={() => window.open(setting.value!, '_blank')}
                    _hover={{ textDecoration: 'underline' }}
                  >
                    {setting.value}
                  </Text>
                </Tooltip>
              )}

              {hasValue && def.type !== 'image' && def.type !== 'url' && (
                <Text fontSize="sm" noOfLines={2} bg="gray.50" p={1.5} px={2} rounded="md" color="gray.700">
                  {setting?.value}
                  {def.suffix && <Text as="span" color="gray.400" ml={1}>{def.suffix}</Text>}
                </Text>
              )}
            </Box>
            <Button
              size="sm"
              leftIcon={<EditIcon />}
              variant="ghost"
              colorScheme="brand"
              onClick={() => setEditing(true)}
            >
              {hasValue ? 'Uredi' : 'Postavi'}
            </Button>
          </Flex>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card size="sm" bg={cardBg} shadow="md" borderWidth="2px" borderColor="brand.200">
      <CardBody>
        <Text fontWeight="600" fontSize="sm" color="brand.700" mb={1}>{def.desc}</Text>
        <Text fontSize="xs" color="gray.400" fontFamily="mono" mb={3}>{def.key}</Text>

        <FormControl mb={3}>
          {def.type === 'textarea' ? (
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={def.placeholder}
              rows={3}
              bg="white"
              autoFocus
            />
          ) : def.type === 'number' ? (
            <HStack>
              <NumberInput
                value={value}
                onChange={(v) => setValue(v)}
                min={def.min}
                max={def.max}
                maxW="150px"
              >
                <NumberInputField bg="white" autoFocus />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              {def.suffix && <Text fontSize="sm" color="gray.500">{def.suffix}</Text>}
            </HStack>
          ) : def.type === 'email' ? (
            <InputGroup>
              <InputLeftAddon>@</InputLeftAddon>
              <Input
                type="email"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={def.placeholder}
                bg="white"
                autoFocus
              />
            </InputGroup>
          ) : def.type === 'url' || def.type === 'image' ? (
            <Box>
              <Input
                type="url"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={def.placeholder}
                bg="white"
                mb={2}
                autoFocus
              />
              {def.type === 'image' && (
                <Box>
                  <HStack spacing={2} mb={2} align="center">
                    <Input
                      type="file"
                      accept="image/*"
                      bg="white"
                      p={1}
                      onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                      isDisabled={uploading || saving}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="brand"
                      onClick={handleUpload}
                      isLoading={uploading}
                      isDisabled={!selectedFile}
                    >
                      Upload
                    </Button>
                    {value ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={handleRemoveImage}
                        isLoading={saving}
                      >
                        Ukloni
                      </Button>
                    ) : null}
                  </HStack>
                  {value ? (
                    <Image
                      src={getUploadUrl(value)}
                      alt="Preview"
                      maxH="100px"
                      rounded="md"
                      objectFit="contain"
                      bg="gray.50"
                      fallback={
                        <Box p={2} bg="red.50" rounded="md">
                          <Text fontSize="xs" color="red.500">Slika nije dostupna</Text>
                        </Box>
                      }
                    />
                  ) : null}
                </Box>
              )}
            </Box>
          ) : (
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={def.placeholder}
              bg="white"
              autoFocus
            />
          )}
        </FormControl>

        <HStack spacing={2} justify="flex-end">
          <Button size="sm" variant="ghost" leftIcon={<CloseIcon />} onClick={handleCancel}>
            Odustani
          </Button>
          <Button
            size="sm"
            colorScheme="brand"
            leftIcon={<CheckIcon />}
            onClick={handleSave}
            isLoading={saving}
          >
            Sačuvaj
          </Button>
        </HStack>
      </CardBody>
    </Card>
  );
}

function SettingGroupPanel({
  group,
  settingsList,
  onSave,
  registryMap,
}: {
  group: SettingGroup;
  settingsList: AppSetting[];
  onSave: (key: string, value: string, desc: string) => Promise<void>;
  registryMap: Map<string, RegistryItem>;
}) {
  const getSettingByKey = (key: string): AppSetting | undefined =>
    settingsList.find((s) => s.key === key);

  const configuredCount = group.defaults.filter((d) =>
    isMeaningfullyConfigured(getSettingByKey(d.key), registryMap.get(d.key)),
  ).length;

  return (
    <Box>
      <Flex align="center" gap={2} mb={2} flexWrap="wrap">
        <Icon as={group.icon} color={`${group.color}.500`} />
        <Heading size="sm" color="gray.700">{group.label}</Heading>
        <Tag size="sm" colorScheme={configuredCount === group.defaults.length ? 'green' : 'gray'}>
          {configuredCount}/{group.defaults.length}
        </Tag>
      </Flex>
      <Text fontSize="sm" color="gray.600" mb={4} lineHeight="tall">{group.description}</Text>
      <VStack align="stretch" spacing={3}>
        {group.defaults.map((def) => (
          <SettingEditor
            key={def.key}
            def={def}
            setting={getSettingByKey(def.key)}
            onSave={onSave}
          />
        ))}
      </VStack>
    </Box>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const toast = useToast();
  const { refreshSettings } = useSettings();
  const [settingsList, setSettingsList] = useState<AppSetting[]>([]);
  const [registry, setRegistry] = useState<RegistryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<AppSetting[]>('/api/settings'),
      api.get<RegistryItem[]>('/api/settings/registry'),
    ])
      .then(([settingsRes, registryRes]) => {
        setSettingsList(Array.isArray(settingsRes.data) ? settingsRes.data : [])
        setRegistry(Array.isArray(registryRes.data) ? registryRes.data : [])
      })
      .catch(() => {
        setSettingsList([])
        setRegistry([])
      })
      .finally(() => setLoading(false))
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useSocketEvent('settings:updated', useCallback((_data: unknown) => {
    loadData();
    refreshSettings();
  }, [loadData, refreshSettings]));

  const handleSave = async (key: string, value: string, desc: string) => {
    try {
      await api.put(`/api/settings/${key}`, { value, description: desc });
      toast({ title: 'Postavka sačuvana', status: 'success', duration: 2000, isClosable: true });
      loadData();
      refreshSettings();
    } catch {
      toast({ title: 'Greška pri čuvanju', status: 'error', isClosable: true });
      throw new Error('Save failed');
    }
  };

  const registryMap = useMemo(() => new Map(registry.map((r) => [r.key, r])), [registry]);
  const registryKeys = useMemo(() => new Set(registry.map((r) => r.key)), [registry]);
  const otherSettings = useMemo(
    () => settingsList.filter((s) => !ALL_KNOWN_SETTING_KEYS.includes(s.key)),
    [settingsList],
  );
  const unknownSettings = useMemo(
    () => settingsList.filter((s) => !registryKeys.has(s.key)),
    [settingsList, registryKeys],
  );
  const contractConfigured = useMemo(
    () =>
      registry.filter((r) =>
        isMeaningfullyConfigured(settingsList.find((s) => s.key === r.key), r),
      ).length,
    [registry, settingsList],
  );
  const legacyRowCount = useMemo(
    () => settingsList.filter((s) => !registryMap.has(s.key)).length,
    [settingsList, registryMap],
  );

  if (loading) {
    return (
      <Flex justify="center" align="center" h="400px">
        <VStack spacing={3}>
          <Spinner size="xl" color="brand.500" thickness="3px" />
          <Text color="gray.500">Učitavanje postavki...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box maxW="container.xl" mx="auto">
      <Flex justify="space-between" align="flex-start" mb={4} gap={4} flexWrap="wrap">
        <Box>
          <Heading size="lg" color="gray.800">{t('nav.settings')}</Heading>
          <Text fontSize="sm" color="gray.600" mt={1} maxW="lg">
            Postavke iz kontrakta (registry) su jedini podržani ključevi. Broj ispod računa ključeve čija vrijednost nije prazna i razlikuje se od zadane (default).
          </Text>
        </Box>
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2} minW={{ sm: '220px' }}>
          <Box bg="gray.50" borderRadius="md" px={3} py={2} borderWidth="1px" borderColor="gray.100">
            <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">Kontrakt</Text>
            <Text fontWeight="600" color="gray.800">{contractConfigured} / {registry.length}</Text>
          </Box>
          <Box bg="gray.50" borderRadius="md" px={3} py={2} borderWidth="1px" borderColor="gray.100">
            <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">Redovi u bazi</Text>
            <Text fontWeight="600" color="gray.800">{settingsList.length}{legacyRowCount > 0 ? ` (${legacyRowCount} izvan kontrakta)` : ''}</Text>
          </Box>
        </SimpleGrid>
      </Flex>

      <Alert status="info" variant="subtle" borderRadius="md" mb={6} fontSize="sm">
        <AlertIcon />
        <Box>
          <AlertTitle fontSize="sm">Kako čitati brojače</AlertTitle>
          <AlertDescription>
            „Kontrakt“ = ključevi definisani u backend registry-ju. „Postavljeno“ u grupi = vrijednost koja nije default i nije prazna. Nasumični ili zastarjeli ključevi u bazi pojavljuju se u kartici Legacy.
          </AlertDescription>
        </Box>
      </Alert>

      <Tabs variant="enclosed-colored" colorScheme="brand">
        <TabList>
          <Tab fontSize="sm" fontWeight="600">
            <Icon as={ViewIcon} mr={2} />
            Javna Stranica
          </Tab>
          <Tab fontSize="sm" fontWeight="600">
            <Icon as={SettingsIcon} mr={2} />
            Sistem
          </Tab>
          {otherSettings.length > 0 && (
            <Tab fontSize="sm" fontWeight="600">
              Ostale ({otherSettings.length})
            </Tab>
          )}
          {unknownSettings.length > 0 && (
            <Tab fontSize="sm" fontWeight="600">
              Legacy / nepoznate ({unknownSettings.length})
            </Tab>
          )}
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            <VStack align="stretch" spacing={8} pt={1}>
              {SETTING_GROUPS.map((group, idx) => (
                <Box key={group.prefix}>
                  {idx > 0 ? <Divider /> : null}
                  <SettingGroupPanel
                    group={group}
                    settingsList={settingsList}
                    onSave={handleSave}
                    registryMap={registryMap}
                  />
                </Box>
              ))}
            </VStack>
          </TabPanel>

          <TabPanel px={0}>
            <VStack align="stretch" spacing={8} pt={1}>
              {SYSTEM_GROUPS.map((group, idx) => (
                <Box key={group.prefix}>
                  {idx > 0 ? <Divider /> : null}
                  <SettingGroupPanel
                    group={group}
                    settingsList={settingsList}
                    onSave={handleSave}
                    registryMap={registryMap}
                  />
                </Box>
              ))}
            </VStack>
          </TabPanel>

          {otherSettings.length > 0 && (
            <TabPanel px={0}>
              <Text fontSize="sm" color="gray.500" mb={4}>
                Postavke koje nisu u predefinisanim grupama. Ove postavke možete ručno uređivati ili brisati.
              </Text>
              <VStack align="stretch" spacing={3}>
                {otherSettings.map((s) => (
                  <Card key={s.key} size="sm" shadow="sm">
                    <CardBody>
                      <Flex justify="space-between" align="start" gap={3}>
                        <Box flex={1} minW={0}>
                          <HStack spacing={2} mb={1}>
                            <Text fontWeight="600" fontSize="sm" color="gray.700">{s.key}</Text>
                            <Badge colorScheme="green" fontSize="2xs">Postavljeno</Badge>
                          </HStack>
                          {s.description && (
                            <Text fontSize="xs" color="gray.500" mb={1}>{s.description}</Text>
                          )}
                          <Text fontSize="sm" noOfLines={2} bg="gray.50" p={1.5} px={2} rounded="md">
                            {s.value}
                          </Text>
                        </Box>
                        <HStack>
                          <Button
                            size="sm"
                            variant="ghost"
                            colorScheme="brand"
                            onClick={() => {
                              const newVal = window.prompt(`Vrijednost za "${s.key}":`, s.value ?? '');
                              if (newVal !== null) handleSave(s.key, newVal, s.description ?? '');
                            }}
                          >
                            Uredi
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={async () => {
                              if (!window.confirm(`Obrisati postavku "${s.key}"?`)) return;
                              try {
                                await api.delete(`/api/settings/${s.key}`);
                                toast({ title: 'Obrisano', status: 'success', isClosable: true });
                                loadData();
                                refreshSettings();
                              } catch {
                                toast({ title: 'Greška', status: 'error', isClosable: true });
                              }
                            }}
                          >
                            Obriši
                          </Button>
                        </HStack>
                      </Flex>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            </TabPanel>
          )}

          {unknownSettings.length > 0 && (
            <TabPanel px={0}>
              <Text fontSize="sm" color="orange.700" mb={2} fontWeight="600">
                Legacy / nepoznate postavke
              </Text>
              <Text fontSize="sm" color="gray.500" mb={4}>
                Ove postavke nisu dio aktuelnog \"settings contract\"-a. Mogu biti zastarjele ili pogrešno imenovane.
                Preporuka je da ih migriramo ili obrišemo nakon provjere.
              </Text>
              <VStack align="stretch" spacing={3}>
                {unknownSettings.map((s) => (
                  <Card key={s.key} size="sm" shadow="sm">
                    <CardBody>
                      <Flex justify="space-between" align="start" gap={3}>
                        <Box flex={1} minW={0}>
                          <HStack spacing={2} mb={1}>
                            <Text fontWeight="600" fontSize="sm" color="gray.700">{s.key}</Text>
                            <Badge colorScheme="orange" fontSize="2xs">Legacy</Badge>
                          </HStack>
                          {s.description && (
                            <Text fontSize="xs" color="gray.500" mb={1}>{s.description}</Text>
                          )}
                          <Text fontSize="sm" noOfLines={2} bg="gray.50" p={1.5} px={2} rounded="md">
                            {s.value}
                          </Text>
                        </Box>
                        <HStack>
                          <Button
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={async () => {
                              if (!window.confirm(`Obrisati legacy postavku \"${s.key}\"?`)) return
                              try {
                                await api.delete(`/api/settings/${s.key}`)
                                toast({ title: 'Obrisano', status: 'success', isClosable: true })
                                loadData()
                                refreshSettings()
                              } catch {
                                toast({ title: 'Greška', status: 'error', isClosable: true })
                              }
                            }}
                          >
                            Obriši
                          </Button>
                        </HStack>
                      </Flex>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>
    </Box>
  );
}
