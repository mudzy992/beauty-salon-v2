import { useEffect, useState, useCallback } from 'react';
import {
  Box, Heading, Text, Spinner, Card, CardBody, Button,
  Flex, useToast, FormControl,
  Input, Textarea, Tabs, TabList, Tab, TabPanels,
  TabPanel, Badge, VStack, Switch, HStack, Icon,
  NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper,
  Image, Tooltip, InputGroup, InputLeftAddon,
  Accordion, AccordionItem, AccordionButton, AccordionPanel,
  AccordionIcon, useColorModeValue, Tag,
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

interface AppSetting {
  key: string;
  value: string | null;
  description: string | null;
}

type SettingType = 'text' | 'textarea' | 'boolean' | 'number' | 'url' | 'image' | 'email' | 'color';

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
];

const SYSTEM_GROUPS: SettingGroup[] = [
  {
    label: 'Rezervacije',
    prefix: 'system_reservation_',
    description: 'Sistemske postavke koje kontroliraju ponašanje rezervacijskog sistema.',
    icon: CalendarIcon,
    color: 'orange',
    defaults: [
      { key: 'system_reservation_lock_minutes', desc: 'Koliko minuta stilist može držati "lock" na rezervaciji prije nego istekne', type: 'number', min: 1, max: 120, suffix: 'minuta' },
      { key: 'system_reservation_attendance_hours', desc: 'Koliko sati prije termina klijent mora potvrditi dolazak', type: 'number', min: 1, max: 72, suffix: 'sati' },
      { key: 'system_reservation_auto_cancel', desc: 'Automatski otkaži rezervacije ako klijent ne potvrdi dolazak u roku', type: 'boolean' },
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
      { key: 'system_maintenance_mode', desc: 'Kada je uključen, javna stranica prikazuje poruku o održavanju', type: 'boolean' },
      { key: 'system_app_version', desc: 'Trenutna verzija aplikacije (informativno)', type: 'text', placeholder: '2.0.0' },
    ],
  },
];

function SettingEditor({
  def,
  setting,
  onSave,
}: {
  def: SettingDef;
  setting: AppSetting | undefined;
  onSave: (key: string, value: string, desc: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(setting?.value ?? '');
  const [saving, setSaving] = useState(false);
  const cardBg = useColorModeValue('white', 'gray.700');

  useEffect(() => {
    setValue(setting?.value ?? '');
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
    setEditing(false);
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
                    src={setting.value}
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
              {def.type === 'image' && value && (
                <Image
                  src={value}
                  alt="Preview"
                  maxH="100px"
                  rounded="md"
                  objectFit="cover"
                  fallback={
                    <Box p={2} bg="red.50" rounded="md">
                      <Text fontSize="xs" color="red.500">URL slike nije validan</Text>
                    </Box>
                  }
                />
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
}: {
  group: SettingGroup;
  settingsList: AppSetting[];
  onSave: (key: string, value: string, desc: string) => Promise<void>;
}) {
  const getSettingByKey = (key: string): AppSetting | undefined =>
    settingsList.find((s) => s.key === key);

  const configuredCount = group.defaults.filter(
    (d) => getSettingByKey(d.key)?.value !== null && getSettingByKey(d.key)?.value !== undefined,
  ).length;

  return (
    <Box>
      <Flex align="center" gap={2} mb={2}>
        <Icon as={group.icon} color={`${group.color}.500`} />
        <Heading size="sm" color="gray.700">{group.label}</Heading>
        <Tag size="sm" colorScheme={configuredCount === group.defaults.length ? 'green' : 'gray'}>
          {configuredCount}/{group.defaults.length}
        </Tag>
      </Flex>
      <Text fontSize="sm" color="gray.500" mb={4}>{group.description}</Text>
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
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    api
      .get<AppSetting[]>('/api/settings')
      .then((r) => setSettingsList(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSettingsList([]))
      .finally(() => setLoading(false));
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

  const allKnownKeys = [
    ...SETTING_GROUPS.flatMap((g) => g.defaults.map((d) => d.key)),
    ...SYSTEM_GROUPS.flatMap((g) => g.defaults.map((d) => d.key)),
  ];
  const otherSettings = settingsList.filter((s) => !allKnownKeys.includes(s.key));

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg" color="gray.800">{t('nav.settings')}</Heading>
          <Text fontSize="sm" color="gray.500" mt={1}>
            Upravljajte svim postavkama aplikacije i javne stranice
          </Text>
        </Box>
        <HStack spacing={2}>
          <Tag size="md" colorScheme="green" variant="subtle">
            {settingsList.filter((s) => s.value !== null).length} postavljenih
          </Tag>
          <Tag size="md" colorScheme="gray" variant="subtle">
            {allKnownKeys.length} ukupno
          </Tag>
        </HStack>
      </Flex>

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
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            <Accordion defaultIndex={[0]} allowMultiple>
              {SETTING_GROUPS.map((group) => (
                <AccordionItem key={group.prefix} border="none" mb={4}>
                  <AccordionButton
                    bg="white"
                    rounded="lg"
                    shadow="sm"
                    _hover={{ bg: 'gray.50' }}
                    _expanded={{ bg: `${group.color}.50`, roundedBottom: 0 }}
                    px={4}
                    py={3}
                  >
                    <Flex flex={1} align="center" gap={2}>
                      <Icon as={group.icon} color={`${group.color}.500`} />
                      <Text fontWeight="600" fontSize="sm">{group.label}</Text>
                      <Tag
                        size="sm"
                        colorScheme={
                          group.defaults.filter(
                            (d) => settingsList.find((s) => s.key === d.key)?.value != null,
                          ).length === group.defaults.length
                            ? 'green'
                            : 'gray'
                        }
                      >
                        {group.defaults.filter(
                          (d) => settingsList.find((s) => s.key === d.key)?.value != null,
                        ).length}
                        /{group.defaults.length}
                      </Tag>
                    </Flex>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel bg="white" roundedBottom="lg" shadow="sm" pb={4}>
                    <SettingGroupPanel
                      group={group}
                      settingsList={settingsList}
                      onSave={handleSave}
                    />
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </TabPanel>

          <TabPanel px={0}>
            <Accordion defaultIndex={[0]} allowMultiple>
              {SYSTEM_GROUPS.map((group) => (
                <AccordionItem key={group.prefix} border="none" mb={4}>
                  <AccordionButton
                    bg="white"
                    rounded="lg"
                    shadow="sm"
                    _hover={{ bg: 'gray.50' }}
                    _expanded={{ bg: `${group.color}.50`, roundedBottom: 0 }}
                    px={4}
                    py={3}
                  >
                    <Flex flex={1} align="center" gap={2}>
                      <Icon as={group.icon} color={`${group.color}.500`} />
                      <Text fontWeight="600" fontSize="sm">{group.label}</Text>
                      <Tag
                        size="sm"
                        colorScheme={
                          group.defaults.filter(
                            (d) => settingsList.find((s) => s.key === d.key)?.value != null,
                          ).length === group.defaults.length
                            ? 'green'
                            : 'gray'
                        }
                      >
                        {group.defaults.filter(
                          (d) => settingsList.find((s) => s.key === d.key)?.value != null,
                        ).length}
                        /{group.defaults.length}
                      </Tag>
                    </Flex>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel bg="white" roundedBottom="lg" shadow="sm" pb={4}>
                    <SettingGroupPanel
                      group={group}
                      settingsList={settingsList}
                      onSave={handleSave}
                    />
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
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
        </TabPanels>
      </Tabs>
    </Box>
  );
}
