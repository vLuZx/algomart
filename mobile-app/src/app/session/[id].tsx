/**
 * Session Detail Screen
 * Hub for viewing session products and choosing scan mode
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { ScanModeSelector } from '../../components/session/ScanModeSelector';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useSession } from '../../features/session/hooks/use-session';
import { tokens } from '../../constants/tokens';

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const {
    session,
    deleteSession,
    setAsActive,
    updateMode,
  } = useSession(id);

  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const handleScanSingle = () => {
    setAsActive();
    updateMode('single');
    router.push(`/session/scanner?sessionId=${id}&mode=single` as any);
  };

  const handleScanRapid = () => {
    setAsActive();
    updateMode('rapid');
    router.push(`/session/scanner?sessionId=${id}&mode=rapid` as any);
  };

  const handleDeleteSession = async () => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSession();
            router.back();
          },
        },
      ]
    );
  };

  if (!session) {
    return (
      <ScreenContainer>
        <ErrorState
          title="Session Not Found"
          message="This session may have been deleted."
          onRetry={() => router.back()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader
        title={session.name}
        showBackButton
        rightAction={
          <Pressable onPress={handleDeleteSession} hitSlop={8}>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </Pressable>
        }
      />

      <View style={styles.sessionInfo}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{session.productCount}</Text>
          <Text style={styles.statLabel}>
            {session.productCount === 1 ? 'Product' : 'Products'} Scanned
          </Text>
        </View>
      </View>

      <ScanModeSelector
        onSelectSingle={handleScanSingle}
        onSelectRapid={handleScanRapid}
      />

      <View style={styles.divider} />

      <View style={styles.productsSection}>
        <Text style={styles.sectionTitle}>Scanned Products</Text>

        {session.productCount === 0 ? (
          <EmptyState
            title="No products scanned yet"
            message="Tap a scan mode above to start scanning products"
          />
        ) : (
          <ScrollView 
            style={styles.productList}
            contentContainerStyle={styles.productListContent}
          >
            <Text style={styles.placeholderText}>
              Product list will appear here once products are scanned
            </Text>
            {/* TODO: Product cards will go here in next phase */}
          </ScrollView>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sessionInfo: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 48,
    fontWeight: '700',
    color: tokens.colors.primary,
  },
  statLabel: {
    fontSize: tokens.typography.body.fontSize,
    color: tokens.colors.textSecondary,
    marginTop: tokens.spacing.xs,
  },
  deleteIcon: {
    fontSize: 24,
  },
  divider: {
    height: 1,
    backgroundColor: tokens.colors.border,
    marginVertical: tokens.spacing.lg,
  },
  productsSection: {
    flex: 1,
    paddingHorizontal: tokens.spacing.lg,
  },
  sectionTitle: {
    fontSize: tokens.typography.heading3.fontSize,
    fontWeight: tokens.typography.heading3.fontWeight as any,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.md,
  },
  productList: {
    flex: 1,
  },
  productListContent: {
    paddingBottom: tokens.spacing.xl,
  },
  placeholderText: {
    fontSize: tokens.typography.body.fontSize,
    color: tokens.colors.textSecondary,
    textAlign: 'center',
    marginTop: tokens.spacing.xl,
  },
});
