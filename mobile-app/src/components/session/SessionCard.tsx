/**
 * Session Card
 * Displays a session in the session list
 */

import React, { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import type { Session } from '../../features/session/types/session.types';
import { tokens } from '../../constants/tokens';

interface SessionCardProps {
  session: Session;
  onPress: () => void;
  onDelete: () => void;
  onRename?: (newName: string) => void;
}

export function SessionCard({ session, onPress, onDelete, onRename }: SessionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(session.name);
  
  // Double tap handling
  const lastTapRef = useRef<number>(0);
  const DOUBLE_TAP_DELAY = 300;

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

  const handleNameDoubleTap = () => {
    if (onRename) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      
      if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
        // Double tap detected
        setIsEditing(true);
        lastTapRef.current = 0; // Reset
      } else {
        // First tap
        lastTapRef.current = now;
      }
    }
  };

  const handleNameSubmit = () => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== session.name && onRename) {
      onRename(trimmedName);
    } else {
      setEditedName(session.name);
    }
    setIsEditing(false);
  };

  const handleNameBlur = () => {
    handleNameSubmit();
  };

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
          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={editedName}
              onChangeText={setEditedName}
              onBlur={handleNameBlur}
              onSubmitEditing={handleNameSubmit}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
            />
          ) : (
            <Pressable onPress={handleNameDoubleTap} style={styles.nameButton}>
              <Text style={styles.name}>{session.name}</Text>
            </Pressable>
          )}
          <Pressable onPress={onDelete} style={styles.deleteButton} hitSlop={8}>
            <FontAwesome6 name="trash-can" size={18} color={tokens.colors.textSecondary} />
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
  nameButton: {
    flex: 1,
  },
  name: {
    fontSize: tokens.typography.heading3.fontSize,
    fontWeight: tokens.typography.heading3.fontWeight as any,
    color: tokens.colors.text,
  },
  nameInput: {
    flex: 1,
    fontSize: tokens.typography.heading3.fontSize,
    fontWeight: tokens.typography.heading3.fontWeight as any,
    color: tokens.colors.text,
    padding: tokens.spacing.xs,
    borderWidth: 1,
    borderColor: tokens.colors.primary,
    borderRadius: tokens.borderRadius.sm,
    backgroundColor: tokens.colors.backgroundSecondary,
  },
  deleteButton: {
    padding: tokens.spacing.xs,
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
