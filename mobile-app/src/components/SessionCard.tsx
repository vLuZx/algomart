import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Package, Trash2 } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { colors, font, radius } from '../constants/theme';

interface SessionCardProps {
  readonly id: string;
  readonly title: string;
  readonly lastUpdated: string;
  readonly productCount: number;
  readonly onPress: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

export function SessionCard({
  id,
  title,
  lastUpdated,
  productCount,
  onPress,
  onDelete,
}: Readonly<SessionCardProps>) {
  const timeAgo = formatDistanceToNow(new Date(lastUpdated), { addSuffix: true });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(id)}
    >
      <View style={styles.row}>
        {/* Left content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.meta}>
            <Package size={16} color="#f59e0b" strokeWidth={2} />
            <Text style={styles.count}>{productCount}</Text>
            <Text style={styles.metaText}>
              {productCount === 1 ? 'product' : 'products'}
            </Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaText}>{timeAgo}</Text>
          </View>
        </View>

        {/* Delete button */}
        <Pressable
          style={({ pressed }) => [
            styles.deleteBtn,
            pressed && styles.deleteBtnPressed,
          ]}
          onPress={() => onDelete(id)}
          hitSlop={8}
        >
          <Trash2 size={16} color="#f87171" strokeWidth={2} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: font.sizeMd,
    fontWeight: font.weightMedium,
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  count: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: font.weightSemibold,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  dot: {
    color: colors.textFaint,
    fontSize: 13,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  deleteBtnPressed: {
    backgroundColor: 'rgba(248, 113, 113, 0.18)',
    shadowColor: '#ef4444',
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
});
