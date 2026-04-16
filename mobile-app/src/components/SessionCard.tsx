import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Package, Trash2 } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

interface SessionCardProps {
  id: string;
  title: string;
  lastUpdated: string; // ISO string
  productCount: number;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SessionCard({
  id,
  title,
  lastUpdated,
  productCount,
  onPress,
  onDelete,
}: SessionCardProps) {
  const timeAgo = formatDistanceToNow(new Date(lastUpdated), { addSuffix: true });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(id)}
    >
      <View style={styles.row}>
        {/* Left content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.meta}>
            <Package size={14} color="#f59e0b" strokeWidth={2} />
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
    backgroundColor: '#27272a',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  count: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '600',
  },
  metaText: {
    color: '#a1a1aa',
    fontSize: 13,
  },
  dot: {
    color: '#52525b',
    fontSize: 13,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteBtnPressed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
});
