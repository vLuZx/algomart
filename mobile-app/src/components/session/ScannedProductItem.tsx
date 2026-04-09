/**
 * Scanned Product Item
 * Displays a single scanned product in the session list
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ScannedProduct } from '../../features/session/types/session.types';
import { tokens } from '../../constants/tokens';

interface ScannedProductItemProps {
  product: ScannedProduct;
  index: number;
}

export function ScannedProductItem({ product, index }: ScannedProductItemProps) {
  const formattedTime = new Date(product.scannedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.index}>#{index + 1}</Text>
        <Text style={styles.time}>{formattedTime}</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>Barcode:</Text>
          <Text style={styles.barcode}>{product.barcode}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Type:</Text>
          <Text style={styles.type}>{product.type}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  index: {
    fontSize: tokens.typography.bodyBold.fontSize,
    fontWeight: tokens.typography.bodyBold.fontWeight as any,
    color: tokens.colors.primary,
  },
  time: {
    fontSize: tokens.typography.caption.fontSize,
    color: tokens.colors.textSecondary,
  },
  content: {
    gap: tokens.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: tokens.typography.body.fontSize,
    color: tokens.colors.textSecondary,
    width: 80,
  },
  barcode: {
    fontSize: tokens.typography.bodyBold.fontSize,
    fontWeight: tokens.typography.bodyBold.fontWeight as any,
    color: tokens.colors.text,
    fontFamily: 'monospace',
  },
  type: {
    fontSize: tokens.typography.body.fontSize,
    color: tokens.colors.text,
    textTransform: 'uppercase',
  },
});
