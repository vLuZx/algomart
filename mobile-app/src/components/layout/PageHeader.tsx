/**
 * Page Header
 * Reusable header component with optional back button
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { tokens } from '../../constants/tokens';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  rightAction?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  subtitle, 
  onBack, 
  showBackButton = false,
  rightAction 
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.header}>
      {showBackButton && (
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
      )}
      
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      
      {rightAction && (
        <View style={styles.rightAction}>{rightAction}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: tokens.colors.text,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: tokens.typography.heading1.fontSize,
    fontWeight: tokens.typography.heading1.fontWeight as any,
    color: tokens.colors.text,
  },
  subtitle: {
    fontSize: tokens.typography.caption.fontSize,
    color: tokens.colors.textSecondary,
    marginTop: tokens.spacing.xs,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
