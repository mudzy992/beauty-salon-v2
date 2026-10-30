import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { EmptyState } from '../../components/ui/EmptyState';
import { useNotificationStore } from '../../store/notificationStore';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { useSocket } from '../../realtime/SocketContext';
import { spacing, borderRadius } from '../../theme';
import type { Notification } from '../../types';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  reservation: 'calendar-outline',
  review: 'star-outline',
  blog: 'newspaper-outline',
  holiday: 'sunny-outline',
  system: 'settings-outline',
};

export function NotificationsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const { notifications, isLoading, fetch, markAsRead } = useNotificationStore();
  const { connected: socketConnected } = useSocket();
  const [refreshing, setRefreshing] = useState(false);

  const refreshNotifications = useAutoRefresh(fetch, {
    intervalMs: 30000,
    connectedIntervalMs: 120000,
    isSocketConnected: socketConnected,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  }, [refreshNotifications]);

  const getIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    return ICON_MAP[type] || 'notifications-outline';
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <View>
    <TouchableOpacity
      onPress={() => !item.isRead && markAsRead(item.id)}
      style={[
        styles.item,
        {
          backgroundColor: item.isRead ? colors.background : colors.accentLight,
          borderBottomColor: colors.borderLight,
          borderCurve: 'continuous',
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.accent }]}>
        <Ionicons name={getIcon(item.type)} size={20} color={colors.primary} />
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.itemBody, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={[styles.itemTime, { color: colors.textMuted }]}>
          {new Date(item.sentAt).toLocaleDateString('bs-BA', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      {!item.isRead && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
    </View>
  );

  if (isLoading && notifications.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={
        notifications.length === 0
          ? [styles.emptyList, { paddingBottom: tabBarBottom }]
          : { paddingBottom: spacing.md + tabBarBottom }
      }
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <EmptyState
          icon="notifications-off-outline"
          title={t('notifications.noNotifications')}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyList: { flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemBody: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  itemTime: { fontSize: 11, marginTop: spacing.xs },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: spacing.sm,
  },
});
