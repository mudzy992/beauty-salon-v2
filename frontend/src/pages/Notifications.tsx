import { useEffect, useState, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Heading, VStack, Card, CardBody, Text, Spinner, Flex,
  Badge, useToast, Switch, FormControl, FormLabel,
  Table, Thead, Tbody, Tr, Th, Td, IconButton,
  Tabs, TabList, Tab, TabPanels, TabPanel,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { BellIcon, CheckIcon } from '@chakra-ui/icons';
import api from '../api/client';
import { useSocketEvent } from '../context/SocketContext';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  channel: string;
  isRead: boolean;
  sentAt: string;
  readAt: string | null;
}

interface NotifPreference {
  id: string;
  type: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
}

export default function Notifications() {
  const { t } = useTranslation();
  const toast = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const [preferences, setPreferences] = useState<NotifPreference[]>([]);
  const [prefLoading, setPrefLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadNotifications = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (showUnreadOnly) params.unreadOnly = 'true';
    api.get<Notification[]>('/api/notifications', { params })
      .then((r) => setNotifications(Array.isArray(r.data) ? r.data : []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [showUnreadOnly]);

  const loadPreferences = useCallback(() => {
    setPrefLoading(true);
    api.get<NotifPreference[]>('/api/notifications/preferences')
      .then((r) => setPreferences(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPreferences([]))
      .finally(() => setPrefLoading(false));
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);
  useEffect(() => { loadPreferences(); }, [loadPreferences]);

  useSocketEvent('notification:new', useCallback(() => loadNotifications(), [loadNotifications]));

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      loadNotifications();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    }
  };

  const savePreference = async (type: string, pushEnabled: boolean, emailEnabled: boolean) => {
    setSaving(true);
    try {
      await api.post('/api/notifications/preferences', { type, pushEnabled, emailEnabled });
      toast({ title: 'Preference sačuvane', status: 'success', isClosable: true, duration: 2000 });
      loadPreferences();
    } catch {
      toast({ title: 'Greška', status: 'error', isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const channelBadge = (channel: string) => {
    const color = channel === 'PUSH' ? 'blue' : channel === 'EMAIL' ? 'purple' : 'teal';
    return <Badge colorScheme={color}>{channel}</Badge>;
  };

  const NOTIFICATION_TYPES = [
    'RESERVATION_NEW', 'RESERVATION_CONFIRMED', 'RESERVATION_CANCELLED',
    'RESERVATION_REMINDER', 'HOLIDAY', 'REVIEW_NEW', 'GENERAL',
  ];

  const getExistingPref = (type: string) => preferences.find((p) => p.type === type);

  return (
    <Box>
      <Heading size="lg" mb={6}>{t('nav.notifications')}</Heading>
      <Flex justify="flex-end" mb={4}>
        <IconButton
          as={RouterLink}
          to="/admin/email-settings"
          aria-label="Email postavke"
          icon={<BellIcon />}
          title="Email postavke"
        />
      </Flex>
      <Tabs>
        <TabList>
          <Tab>Notifikacije</Tab>
          <Tab>Preference</Tab>
        </TabList>
        <TabPanels>
          {/* Notifications List */}
          <TabPanel>
            <Flex justify="space-between" align="center" mb={4}>
              <FormControl display="flex" alignItems="center" maxW="250px">
                <FormLabel mb="0" fontSize="sm">Samo nepročitane</FormLabel>
                <Switch isChecked={showUnreadOnly} onChange={(e) => setShowUnreadOnly(e.target.checked)} colorScheme="brand" />
              </FormControl>
            </Flex>

            {loading ? <Spinner /> : notifications.length === 0 ? (
              <Text color="gray.500">{t('common.noData')}</Text>
            ) : (
              <VStack align="stretch" spacing={2}>
                {notifications.map((n) => (
                  <Card key={n.id} bg={n.isRead ? 'white' : 'blue.50'} borderLeft={n.isRead ? '3px solid transparent' : '3px solid'} borderColor={n.isRead ? 'transparent' : 'blue.400'}>
                    <CardBody py={3}>
                      <Flex justify="space-between" align="start">
                        <Box flex={1}>
                          <Flex gap={2} align="center" mb={1}>
                            <Text fontWeight="bold" fontSize="sm">{n.title}</Text>
                            {channelBadge(n.channel)}
                            <Badge variant="outline">{n.type}</Badge>
                          </Flex>
                          <Text fontSize="sm" color="gray.700">{n.body}</Text>
                          <Text fontSize="xs" color="gray.500" mt={1}>
                            {new Date(n.sentAt).toLocaleString('bs-BA')}
                          </Text>
                        </Box>
                        {!n.isRead && (
                          <IconButton
                            aria-label="Označi kao pročitano"
                            icon={<CheckIcon />}
                            size="sm"
                            variant="ghost"
                            colorScheme="green"
                            onClick={() => markAsRead(n.id)}
                          />
                        )}
                      </Flex>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            )}
          </TabPanel>

          {/* Preferences */}
          <TabPanel>
            <Text fontSize="sm" color="gray.600" mb={4}>
              Konfiguriši kako želiš primati notifikacije za svaki tip.
            </Text>
            {prefLoading ? <Spinner /> : (
              <Box bg="white" rounded="lg" shadow="sm" overflow="auto">
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Tip notifikacije</Th>
                      <Th>Push</Th>
                      <Th>Email</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {NOTIFICATION_TYPES.map((type) => {
                      const pref = getExistingPref(type);
                      const pushEnabled = pref?.pushEnabled ?? true;
                      const emailEnabled = pref?.emailEnabled ?? true;
                      return (
                        <Tr key={type}>
                          <Td fontWeight="medium">{type.replace(/_/g, ' ')}</Td>
                          <Td>
                            <Switch
                              isChecked={pushEnabled}
                              onChange={(e) => savePreference(type, e.target.checked, emailEnabled)}
                              colorScheme="blue"
                              isDisabled={saving}
                            />
                          </Td>
                          <Td>
                            <Switch
                              isChecked={emailEnabled}
                              onChange={(e) => savePreference(type, pushEnabled, e.target.checked)}
                              colorScheme="purple"
                              isDisabled={saving}
                            />
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
