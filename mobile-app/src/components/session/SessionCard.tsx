/**
 * Session Card
 * Displays a session in the session list
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Session } from '../../features/session/types/session.types';
import { tokens } from '../../constants/tokens';

interface SessionCardProps {
  session: Session;
  onPress: () => void;
  onDelete: () => void;
}

export function SessionCard({ session, onPress, onDelete }: SessionCardProps) {
  const formattedDate = new Date(session.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = new Date(session.createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const lastUpdated = new Date(session.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{session.name}</Text>
          <Pressable onPress={onDelete} style={styles.deleteButton} hitSlop={8}>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </Pressable>
        </View>

        <View style={styles.metadata}>
          <Text style={styles.metaText}>Created: {formattedDate} at {formattedTime}</Text>
          <Text style={styles.metaText}>Last updated: {lastUpdated}</Text>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{session.productCount}</Text>
            <Text style={styles.statLabel}>
              {session.productCount === 1 ? 'Product' : 'Products'}
            </Text>
          </View>

          {session.lastUsedMode && (
            <View style={styles.modeBadge}>
              <Text style={styles.modeText}>
                {session.lastUsedMode === 'single' ? 'Single Scan' : 'Rapid Scan'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.borderRadius.lg,
    marginBottom: tokens.spacing.md,
    ...tokens.shadows.md,
  },
  cardPressed: {
    opacity: 0.7,
  },
  content: {
    padding: tokens.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  name: {
    fontSize: tokens.typography.heading3.fontSize,
    fontWeight: tokens.typography.heading3.fontWeight as any,
    color: tokens.colors.text,
    flex: 1,
  },
  deleteButton: {
    padding: tokens.spacing.xs,
  },
  deleteIcon: {
    fontSize: 20,
  },
  metadata: {
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.md,
  },
  metaText: {
    fontSize: tokens.typography.caption.fontSize,
    color: tokens.colors.textSecondary,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: tokens.colors.primary,
  },
  statLabel: {
    fontSize: tokens.typography.caption.fontSize,
    color: tokens.colors.textSecondary,
    marginTop: 2,
  },
  modeBadge: {
    backgroundColor: tokens.colors.primaryLight,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.sm,
  },
  modeText: {
    fontSize: tokens.typography.caption.fontSize,
    color: tokens.colors.background,
    fontWeight: '600',
  },
});
