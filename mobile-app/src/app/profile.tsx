import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Award,
  Calendar,
  ChevronRight,
  Edit2,
  LogOut,
  Package,
  TrendingUp,
  User,
} from 'lucide-react-native';
import type { ComponentType } from 'react';
import { PageHeader } from '../components/PageHeader';
import { colors, font, gradients, radius, shadows } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessions } from '../store/sessions';

type AccountIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface Badge {
  readonly label: string;
  readonly description: string;
  readonly color: string;
  readonly backgroundColor: string;
}

interface AccountItem {
  readonly label: string;
  readonly icon: AccountIcon;
}

const accountItems: readonly AccountItem[] = [
  { label: 'Account Settings', icon: User },
  { label: 'Subscription & Billing', icon: Award },
  { label: 'Scanning History', icon: Package },
];

export default function ProfilePage() {
  const { sessions, getProducts } = useSessions();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('Alex Carter');

  const allProducts = useMemo(
    () => sessions.flatMap((session) => getProducts(session.id)),
    [getProducts, sessions],
  );

  const avgMargin =
    allProducts.length > 0
      ? allProducts.reduce((sum, product) => sum + (product.profitMargin / product.price) * 100, 0) /
        allProducts.length
      : 0;

  const badges: readonly Badge[] = [
    {
      label: 'Power Scanner',
      description: '500+ products scanned',
      color: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    {
      label: 'Profit Hunter',
      description: '>30% avg margin',
      color: colors.success,
      backgroundColor: colors.successSoft,
    },
    {
      label: 'Session Streak',
      description: '7-day active streak',
      color: colors.info,
      backgroundColor: colors.infoSoft,
    },
  ];

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <PageHeader
        title="Profile"
        icon={<User size={16} color={colors.textMuted} strokeWidth={1.8} />}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <LinearGradient colors={gradients.amber} style={styles.avatarGradient}>
              <Text style={styles.avatarText}>{initials || 'AC'}</Text>
            </LinearGradient>
            <View style={styles.statusDot} />
          </View>

          <View style={styles.profileCopyWrap}>
            {editingName ? (
              <TextInput
                autoFocus
                value={name}
                onChangeText={setName}
                onBlur={() => setEditingName(false)}
                onSubmitEditing={() => setEditingName(false)}
                style={styles.nameInput}
                returnKeyType="done"
              />
            ) : (
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{name}</Text>
                <Pressable onPress={() => setEditingName(true)}>
                  <Edit2 size={14} color={colors.textSubtle} strokeWidth={2} />
                </Pressable>
              </View>
            )}

            <Text style={styles.profileEmail}>alex@example.com</Text>

            <View style={styles.planRow}>
              <View style={styles.planBadgeAmber}>
                <Text style={styles.planBadgeAmberText}>Pro Plan</Text>
              </View>
              <View style={styles.planBadgeGreen}>
                <Text style={styles.planBadgeGreenText}>Active</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statGrid}>
          {[
            { label: 'Sessions', value: sessions.length.toLocaleString(), icon: Calendar },
            { label: 'Scanned', value: allProducts.length.toLocaleString(), icon: Package },
            { label: 'Avg Margin', value: `${avgMargin.toFixed(0)}%`, icon: TrendingUp },
          ].map((stat) => {
            const Icon = stat.icon;

            return (
              <View key={stat.label} style={styles.statCard}>
                <Icon size={16} color={colors.accent} strokeWidth={1.8} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Award size={16} color={colors.accent} strokeWidth={1.8} />
            <Text style={styles.sectionTitle}>Badges</Text>
          </View>

          <View style={styles.badgeWrap}>
            {badges.map((badge) => (
              <View key={badge.label} style={[styles.badgeChip, { backgroundColor: badge.backgroundColor }]}>
                <Award size={14} color={badge.color} strokeWidth={1.8} />
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCardNoPadding}>
          {accountItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <Pressable key={item.label} style={[styles.accountRow, index < accountItems.length - 1 && styles.accountDivider]}>
                <Icon size={16} color={colors.textMuted} strokeWidth={1.8} />
                <Text style={styles.accountLabel}>{item.label}</Text>
                <ChevronRight size={16} color={colors.textFaint} strokeWidth={2} />
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.signOutButton}>
          <LogOut size={16} color={colors.danger} strokeWidth={1.8} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    padding: 20,
    ...shadows.soft,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.accentText,
    fontSize: 22,
    fontWeight: font.weightSemibold,
  },
  statusDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.bgCard,
    backgroundColor: colors.success,
  },
  profileCopyWrap: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    color: colors.text,
    fontSize: font.sizeMd,
    flex: 1,
  },
  nameInput: {
    borderRadius: radius.sm,
    backgroundColor: '#3f3f46',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    fontSize: font.sizeSm,
  },
  profileEmail: {
    color: colors.textSubtle,
    fontSize: font.sizeXs,
    marginTop: 4,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  planBadgeAmber: {
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planBadgeAmberText: {
    color: colors.accent,
    fontSize: 10,
  },
  planBadgeGreen: {
    borderRadius: radius.full,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planBadgeGreenText: {
    color: colors.success,
    fontSize: 10,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    ...shadows.soft,
  },
  statValue: {
    color: colors.text,
    fontSize: font.sizeMd,
  },
  statLabel: {
    color: colors.textFaint,
    fontSize: 10,
  },
  sectionCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    padding: 16,
    ...shadows.soft,
  },
  sectionCardNoPadding: {
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
    ...shadows.soft,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
  },
  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    fontSize: font.sizeXs,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accountDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  accountLabel: {
    flex: 1,
    color: '#e4e4e7',
    fontSize: font.sizeSm,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
    backgroundColor: 'rgba(248, 113, 113, 0.05)',
    paddingVertical: 14,
  },
  signOutText: {
    color: colors.danger,
    fontSize: font.sizeSm,
  },
});