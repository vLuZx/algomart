/**
 * Session Detail Screen
 * Hub for viewing session products and choosing scan mode
 */

import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { ScanModeSelector } from '../../components/session/ScanModeSelector';
import { ScannedProductItem } from '../../components/session/ScannedProductItem';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
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
    updateName,
  } = useSession(id);

  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  
  // Double tap handling
  const lastTapRef = useRef<number>(0);
  const DOUBLE_TAP_DELAY = 300;

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

  const handleNameDoubleTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    
    if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
      // Double tap detected
      setEditedName(session?.name || '');
      setIsEditingName(true);
      lastTapRef.current = 0; // Reset
    } else {
      // First tap
      lastTapRef.current = now;
    }
  };

  const handleNameSubmit = async () => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== session?.name) {
      await updateName(trimmedName);
    }
    setIsEditingName(false);
  };

  const handleNameBlur = () => {
    handleNameSubmit();
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
      <Pressable onPress={handleNameDoubleTap} disabled={isEditingName}>
        <PageHeader
          title={isEditingName ? '' : session.name}
          showBackButton
          rightAction={
            <Pressable onPress={handleDeleteSession} hitSlop={8}>
              <FontAwesome6 name="trash-can" size={20} color={tokens.colors.text} />
            </Pressable>
          }
        />
      </Pressable>

      {isEditingName && (
        <View style={styles.nameEditContainer}>
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
        </View>
      )}

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
            {session.scannedProducts.map((product, index) => (
              <ScannedProductItem
                key={product.id}
                product={product}
                index={index}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  nameEditContainer: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
  },
  nameInput: {
    fontSize: tokens.typography.heading2.fontSize,
    fontWeight: tokens.typography.heading2.fontWeight as any,
    color: tokens.colors.text,
    padding: tokens.spacing.sm,
    borderWidth: 2,
    borderColor: tokens.colors.primary,
    borderRadius: tokens.borderRadius.md,
    backgroundColor: tokens.colors.backgroundSecondary,
  },
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
});
