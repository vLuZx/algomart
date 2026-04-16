import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, shadows } from '../constants/theme';

interface PageHeaderProps {
  readonly title: string;
  readonly icon: ReactNode;
  readonly action?: ReactNode;
}

export function PageHeader({ title, icon, action }: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>{icon}</View>
          <Text style={styles.title}>{title}</Text>
        </View>
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    ...shadows.soft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
  },
  title: {
    color: colors.text,
    fontSize: font.sizeLg,
    fontWeight: font.weightNormal,
  },
});