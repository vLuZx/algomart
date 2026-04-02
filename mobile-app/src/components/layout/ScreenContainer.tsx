/**
 * Screen Container
 * Safe area wrapper for all screens
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from '../../constants/tokens';

interface ScreenContainerProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string;
}

export function ScreenContainer({ 
  children, 
  edges = ['top', 'left', 'right', 'bottom'],
  backgroundColor = tokens.colors.background 
}: ScreenContainerProps) {
  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor }]}
      edges={edges}
    >
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
