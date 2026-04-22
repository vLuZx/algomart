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
  Bell,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
  Tag,
  ToggleLeft,
  ToggleRight,
  Zap,
} from 'lucide-react-native';
import type { ComponentType } from 'react';
import { GradientButton } from '../components/GradientButton';
import { PageHeader } from '../components/PageHeader';
import { colors, font, radius, shadows } from '../constants/theme';

type AutomationIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface Automation {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly trigger: string;
  readonly lastRun?: string;
  readonly icon: AutomationIcon;
  readonly enabled: boolean;
}

const initialAutomations: readonly Automation[] = [
  // TODO(backend): Replace with automations fetched from the user's account
  // (e.g. `GET /api/automations`). The previously hard-coded "Price Drop
  // Alert", "Auto-Tag Profitable", "Daily Price Sync", and "BSR Filter"
  // entries were mock fixtures and have been removed.
];

export default function AutomationsPage() {
  const [automations, setAutomations] = useState(initialAutomations);
  const [noticeVisible, setNoticeVisible] = useState(false);

  const enabledCount = automations.filter((automation) => automation.enabled).length;

  const toggleAutomation = (id: string) => {
    setAutomations((current) =>
      current.map((automation) =>
        automation.id === id ? { ...automation, enabled: !automation.enabled } : automation,
      ),
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <PageHeader
        title="Automations"
        icon={<Zap size={16} color={colors.accent} strokeWidth={1.8} />}
        action={
          <GradientButton
            label="New"
            icon={<Plus size={14} color={colors.accentText} strokeWidth={2.4} />}
            onPress={() => setNoticeVisible(true)}
            style={styles.newButtonWrap}
            contentStyle={styles.newButtonContent}
            textStyle={styles.newButtonText}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryPill}>
          <Zap size={16} color={colors.accent} strokeWidth={1.8} />
          <Text style={styles.summaryText}>
            <Text style={styles.summaryActiveText}>
              {enabledCount} automation{enabledCount === 1 ? '' : 's'}
            </Text>{' '}
            currently active
          </Text>
        </View>

        <View style={styles.listWrap}>
          {automations.map((automation) => {
            const Icon = automation.icon;

            return (
              <View key={automation.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.automationIconWrap,
                      automation.enabled && styles.automationIconWrapActive,
                    ]}
                  >
                    <Icon
                      size={16}
                      color={automation.enabled ? colors.accent : colors.textSubtle}
                      strokeWidth={1.8}
                    />
                  </View>

                  <View style={styles.copyWrap}>
                    <View style={styles.titleRow}>
                      <Text style={styles.cardTitle}>{automation.name}</Text>
                      <Pressable onPress={() => toggleAutomation(automation.id)}>
                        {automation.enabled ? (
                          <ToggleRight size={30} color={colors.accent} strokeWidth={1.8} />
                        ) : (
                          <ToggleLeft size={30} color={colors.textFaint} strokeWidth={1.8} />
                        )}
                      </Pressable>
                    </View>

                    <Text style={styles.cardDescription}>{automation.description}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.triggerRow}>
                    <Text style={styles.triggerLabel}>Trigger:</Text>
                    <Text style={styles.triggerValue}>{automation.trigger}</Text>
                  </View>

                  <View style={styles.trailingRow}>
                    {automation.lastRun ? (
                      <Text style={styles.lastRunText}>Last: {automation.lastRun}</Text>
                    ) : null}
                    <Pressable onPress={() => setNoticeVisible(true)}>
                      <ChevronRight size={16} color={colors.textFaint} strokeWidth={2} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal transparent visible={noticeVisible} animationType="fade" onRequestClose={() => setNoticeVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setNoticeVisible(false)}>
          <View style={styles.modalCard}>
            <View style={styles.noticeIconWrap}>
              <Zap size={18} color={colors.accent} strokeWidth={1.8} />
            </View>
            <Text style={styles.noticeTitle}>Automation Builder</Text>
            <Text style={styles.noticeBody}>
              The new automation builder UI is not in the figma flow yet, so this native port keeps it as a placeholder action.
            </Text>
            <Pressable style={styles.noticeButton} onPress={() => setNoticeVisible(false)}>
              <Text style={styles.noticeButtonText}>Close</Text>
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
  newButtonWrap: {
    minWidth: 88,
  },
  newButtonContent: {
    minHeight: 36,
  },
  newButtonText: {
    fontSize: font.sizeXs,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...shadows.soft,
  },
  summaryText: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
  },
  summaryActiveText: {
    color: colors.accent,
  },
  listWrap: {
    gap: 10,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    padding: 16,
    ...shadows.soft,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  automationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: '#3f3f46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  automationIconWrapActive: {
    backgroundColor: colors.accentSoft,
  },
  copyWrap: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  cardTitle: {
    flex: 1,
    color: '#e4e4e7',
    fontSize: font.sizeSm,
  },
  cardDescription: {
    color: colors.textSubtle,
    fontSize: font.sizeXs,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  triggerLabel: {
    color: colors.textFaint,
    fontSize: 11,
  },
  triggerValue: {
    color: colors.textMuted,
    fontSize: 11,
    flexShrink: 1,
  },
  trailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastRunText: {
    color: colors.textFaint,
    fontSize: 11,
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
  noticeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeTitle: {
    color: colors.text,
    fontSize: font.sizeMd,
    fontWeight: font.weightSemibold,
  },
  noticeBody: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
    textAlign: 'center',
    lineHeight: 18,
  },
  noticeButton: {
    minWidth: 100,
    minHeight: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeButtonText: {
    color: colors.textMuted,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
  },
});