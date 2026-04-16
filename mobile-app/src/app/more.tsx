import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlignJustify,
  Bell,
  ChevronRight,
  Download,
  ExternalLink,
  HelpCircle,
  Palette,
  Share2,
  Shield,
  Star,
  Trash2,
} from 'lucide-react-native';
import type { ComponentType } from 'react';
import { PageHeader } from '../components/PageHeader';
import { colors, font, radius, shadows } from '../constants/theme';

type ItemIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface MoreItem {
  readonly label: string;
  readonly description?: string;
  readonly icon: ItemIcon;
  readonly iconColor: string;
  readonly iconBg: string;
  readonly danger?: boolean;
}

interface MoreSection {
  readonly title: string;
  readonly items: readonly MoreItem[];
}

const sections: readonly MoreSection[] = [
  {
    title: 'Settings',
    items: [
      {
        label: 'Notifications',
        description: 'Alerts and price change updates',
        icon: Bell,
        iconColor: colors.info,
        iconBg: colors.infoSoft,
      },
      {
        label: 'Appearance',
        description: 'Theme and display preferences',
        icon: Palette,
        iconColor: '#c084fc',
        iconBg: 'rgba(168, 85, 247, 0.18)',
      },
      {
        label: 'Data & Privacy',
        description: 'Export, backup, and permissions',
        icon: Shield,
        iconColor: colors.success,
        iconBg: colors.successSoft,
      },
    ],
  },
  {
    title: 'Tools',
    items: [
      {
        label: 'Export All Sessions',
        description: 'Download as CSV or PDF',
        icon: Download,
        iconColor: colors.accent,
        iconBg: colors.accentSoft,
      },
      {
        label: 'Share App',
        description: 'Invite teammates to collaborate',
        icon: Share2,
        iconColor: '#22d3ee',
        iconBg: 'rgba(34, 211, 238, 0.14)',
      },
    ],
  },
  {
    title: 'Support',
    items: [
      {
        label: 'Help Center',
        description: 'Guides and FAQs',
        icon: HelpCircle,
        iconColor: colors.textMuted,
        iconBg: '#3f3f46',
      },
      {
        label: 'Rate the App',
        description: 'Leave a review on the App Store',
        icon: Star,
        iconColor: colors.accent,
        iconBg: colors.accentSoft,
      },
      {
        label: 'Open in Browser',
        description: 'View on desktop for full experience',
        icon: ExternalLink,
        iconColor: colors.textMuted,
        iconBg: '#3f3f46',
      },
    ],
  },
  {
    title: 'Danger Zone',
    items: [
      {
        label: 'Clear All Data',
        description: 'Permanently delete all sessions',
        icon: Trash2,
        iconColor: colors.danger,
        iconBg: colors.dangerSoft,
        danger: true,
      },
    ],
  },
];

export default function MorePage() {
  const [selectedItem, setSelectedItem] = useState<MoreItem | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <PageHeader
        title="More"
        icon={<AlignJustify size={16} color={colors.textMuted} strokeWidth={1.8} />}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={styles.sectionEyebrow}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, index) => {
                const Icon = item.icon;

                return (
                  <Pressable
                    key={item.label}
                    style={[index < section.items.length - 1 && styles.itemDivider]}
                    onPress={() => setSelectedItem(item)}
                  >
                    <View style={styles.itemRow}>
                      <View style={[styles.itemIconWrap, { backgroundColor: item.iconBg }]}>
                        <Icon size={16} color={item.iconColor} strokeWidth={1.8} />
                      </View>

                      <View style={styles.itemCopyWrap}>
                        <Text style={[styles.itemTitle, item.danger && styles.itemTitleDanger]}>
                          {item.label}
                        </Text>
                        {item.description ? (
                          <Text style={styles.itemDescription}>{item.description}</Text>
                        ) : null}
                      </View>

                      <ChevronRight size={16} color={colors.textFaint} strokeWidth={2} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <Text style={styles.versionText}>ScanSesh v1.0.0</Text>
      </ScrollView>

      <Modal transparent visible={Boolean(selectedItem)} animationType="fade" onRequestClose={() => setSelectedItem(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedItem(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedItem?.label}</Text>
            <Text style={styles.modalBody}>
              This item is included in the native port for layout parity. The detailed workflow behind it is still placeholder-only in the figma version.
            </Text>
            <Pressable style={styles.modalButton} onPress={() => setSelectedItem(null)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 20,
  },
  sectionEyebrow: {
    color: colors.textSubtle,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
    ...shadows.soft,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCopyWrap: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    color: '#e4e4e7',
    fontSize: font.sizeSm,
  },
  itemTitleDanger: {
    color: colors.danger,
  },
  itemDescription: {
    color: colors.textSubtle,
    fontSize: 11,
    marginTop: 4,
  },
  versionText: {
    color: colors.textFaint,
    fontSize: 11,
    textAlign: 'center',
    paddingBottom: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.bgOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bg,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    ...shadows.card,
  },
  modalTitle: {
    color: colors.text,
    fontSize: font.sizeMd,
    fontWeight: font.weightSemibold,
  },
  modalBody: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
    lineHeight: 18,
    textAlign: 'center',
  },
  modalButton: {
    minWidth: 100,
    minHeight: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: colors.textMuted,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
  },
});