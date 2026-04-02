/**
 * Scan Mode Selector
 * Buttons for choosing Single vs Rapid scan mode
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { tokens } from '../../constants/tokens';

interface ScanModeSelectorProps {
  onSelectSingle: () => void;
  onSelectRapid: () => void;
}

export function ScanModeSelector({ onSelectSingle, onSelectRapid }: ScanModeSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Scan Mode</Text>
      
      <View style={styles.buttons}>
        <Pressable 
          style={({ pressed }) => [
            styles.button,
            styles.singleButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={onSelectSingle}
        >
          <Text style={styles.buttonIcon}>📱</Text>
          <Text style={styles.buttonTitle}>Single Scan</Text>
          <Text style={styles.buttonDescription}>
            Scan one product and view detailed analysis
          </Text>
        </Pressable>

        <Pressable 
          style={({ pressed }) => [
            styles.button,
            styles.rapidButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={onSelectRapid}
        >
          <Text style={styles.buttonIcon}>⚡</Text>
          <Text style={styles.buttonTitle}>Rapid Scan</Text>
          <Text style={styles.buttonDescription}>
            Scan multiple products quickly
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: tokens.spacing.lg,
  },
  title: {
    fontSize: tokens.typography.heading3.fontSize,
    fontWeight: tokens.typography.heading3.fontWeight as any,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
  },
  button: {
    flex: 1,
    padding: tokens.spacing.lg,
    borderRadius: tokens.borderRadius.lg,
    alignItems: 'center',
    ...tokens.shadows.md,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  singleButton: {
    backgroundColor: tokens.colors.primary,
  },
  rapidButton: {
    backgroundColor: tokens.colors.info,
  },
  buttonIcon: {
    fontSize: 32,
    marginBottom: tokens.spacing.sm,
  },
  buttonTitle: {
    fontSize: tokens.typography.body.fontSize,
    fontWeight: '700',
    color: tokens.colors.white,
    marginBottom: tokens.spacing.xs,
  },
  buttonDescription: {
    fontSize: tokens.typography.caption.fontSize,
    color: tokens.colors.white,
    textAlign: 'center',
    opacity: 0.9,
  },
});
