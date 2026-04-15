/**
 * Sessions Screen
 *
 * Lists all scanning sessions with search, create, and delete.
 */

import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessions } from '../store/sessions';
import { colors, font, spacing, radius, shared } from '../constants/theme';
import type { Session } from '../types/session';

// ── Helpers ──────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Main component ───────────────────────────────────────────────────

export default function SessionsScreen() {
  const { sessions, addSession, deleteSession } = useSessions();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.name.toLowerCase().includes(q));
  }, [sessions, search]);

  const handleNew = () => {
    Alert.prompt(
      'New Session',
      'Enter a name for this session',
      (name) => {
        const trimmed = name?.trim();
        if (trimmed) addSession(trimmed);
      },
      'plain-text',
      '',
      'default',
    );
  };

  const handleDelete = (session: Session) => {
    Alert.alert(
      'Delete Session',
      `Delete "${session.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSession(session.id),
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Session }) => (
    <View style={styles.card}>
      <View style={shared.rowBetween}>
        {/* Left side */}
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <View style={[shared.row, { marginTop: spacing.sm, gap: spacing.sm }]}>
            <Text style={styles.boxIcon}>📦</Text>
            <Text style={styles.productCount}>{item.productCount}</Text>
            <Text style={styles.countLabel}>products</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.timeAgo}>{timeAgo(item.updatedAt)}</Text>
          </View>
        </View>

        {/* Delete button */}
        <Pressable
          style={({ pressed }) => [
            styles.deleteBtn,
            pressed && styles.deleteBtnPressed,
          ]}
          onPress={() => handleDelete(item)}
          hitSlop={12}
        >
          <Text style={styles.deleteIcon}>🗑</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={shared.screen}>
      {/* Header */}
      <View style={[shared.rowBetween, styles.header]}>
        <Text style={font.heading}>Sessions</Text>
        <Pressable
          style={({ pressed }) => [
            styles.newBtn,
            pressed && styles.newBtnPressed,
          ]}
          onPress={handleNew}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={[shared.content, { marginBottom: spacing.lg }]}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search sessions..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap <Text style={{ color: colors.accent, fontWeight: '600' }}>+ New</Text> to create your first scanning session
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },

  /* "+ New" button */
  newBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  newBtnPressed: {
    backgroundColor: colors.accentDark,
  },
  newBtnText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: '700',
  },

  /* Search */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },

  /* List */
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  /* Card */
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardTitle: {
    ...font.title,
  },
  boxIcon: {
    fontSize: 14,
  },
  productCount: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  countLabel: {
    color: colors.accent,
    fontSize: 14,
  },
  dot: {
    color: colors.textMuted,
    fontSize: 14,
  },
  timeAgo: {
    color: colors.textMuted,
    fontSize: 13,
  },

  /* Delete button */
  deleteBtn: {
    backgroundColor: colors.dangerMuted,
    borderRadius: radius.md,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnPressed: {
    backgroundColor: 'rgba(229, 77, 77, 0.25)',
  },
  deleteIcon: {
    fontSize: 18,
  },

  /* Empty state */
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...font.title,
    fontSize: 20,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...font.body,
    textAlign: 'center',
    lineHeight: 20,
  },
});
