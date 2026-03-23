import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFloatingTabBarTotalHeight } from '../../navigation/FloatingTabBar';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useAppModeStore } from '../../store/appModeStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { isClient } from '../../utils/roles';
import { spacing } from '../../theme';

export function StylistProfileScreen() {
  const { colors } = useTheme();
  const tabBarBottom = useFloatingTabBarTotalHeight();
  const { user, logout } = useAuthStore();
  const setMode = useAppModeStore((s) => s.setMode);
  const canSwitchToClient = user && isClient(user);

  const handleSwitchToClient = () => {
    setMode('client');
  };

  const handleLogout = () => {
    Alert.alert('Odjava', 'Da li ste sigurni da se želite odjaviti?', [
      { text: 'Otkaži', style: 'cancel' },
      { text: 'Odjavi se', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + tabBarBottom }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.userCard}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </Text>
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={[styles.roleLabel, { color: colors.primary }]}>Stilist</Text>
      </Card>

      {canSwitchToClient && (
        <Card style={styles.menuCard}>
          <Button
            title="Prebaci na Client app"
            onPress={handleSwitchToClient}
            variant="outline"
            fullWidth
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Prikazat će se klijentska aplikacija (početna, usluge, rezervacije).
          </Text>
        </Card>
      )}

      <Card style={styles.menuCard}>
        <Button title="Odjavi se" onPress={handleLogout} variant="ghost" textStyle={{ color: colors.error }} fullWidth />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  userCard: { alignItems: 'center', marginBottom: spacing.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { fontSize: 28, fontWeight: '700' },
  userName: { fontSize: 20, fontWeight: '700' },
  roleLabel: { fontSize: 14, marginTop: 2, fontWeight: '600' },
  menuCard: { marginBottom: spacing.md },
  hint: { fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
});
