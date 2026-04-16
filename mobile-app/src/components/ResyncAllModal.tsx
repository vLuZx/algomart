import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Check, RefreshCw, X } from 'lucide-react-native';
import { colors, font, radius, shadows } from '../constants/theme';

interface ResyncAllModalProps {
  readonly visible: boolean;
  readonly productNames: readonly string[];
  readonly onClose: () => void;
}

type SyncState = 'running' | 'done' | 'cancelled';

function estimateLabel(total: number) {
  if (total <= 0) {
    return 'No products to sync';
  }

  const approxSeconds = Math.max(2, Math.min(7, Math.ceil(total / 8)));
  return `~${approxSeconds}s for ${total} product${total === 1 ? '' : 's'}`;
}

export function ResyncAllModal({ visible, productNames, onClose }: ResyncAllModalProps) {
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<SyncState>('running');

  const total = productNames.length;

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    if (total === 0) {
      setProgress(0);
      setState('done');
      const closeTimer = setTimeout(onClose, 900);
      return () => clearTimeout(closeTimer);
    }

    setProgress(0);
    setState('running');

    const step = Math.max(1, Math.ceil(total / 24));
    const timer = setInterval(() => {
      setProgress((current) => {
        const next = Math.min(total, current + step);

        if (next >= total) {
          clearInterval(timer);
          setState('done');
          setTimeout(onClose, 1400);
        }

        return next;
      });
    }, 180);

    return () => clearInterval(timer);
  }, [onClose, total, visible]);

  const currentLabel = useMemo(() => {
    if (state === 'cancelled') {
      return `Stopped after ${progress} of ${total} products`;
    }

    if (state === 'done') {
      return total === 0 ? 'Everything is already up to date.' : 'Amazon prices have been updated.';
    }

    return estimateLabel(total);
  }, [progress, state, total]);

  const progressLabel = total > 0 ? `${Math.min(progress, total)}/${total}` : '0/0';
  const currentProductName =
    total > 0 ? productNames[Math.min(progress, total - 1)] ?? 'Fetching…' : 'Nothing queued';

  const handleCancel = () => {
    setState('cancelled');
    setTimeout(onClose, 700);
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={[styles.iconWrap, state === 'done' && styles.iconWrapDone]}>
            {state === 'done' ? (
              <Check size={24} color={colors.accent} strokeWidth={2.5} />
            ) : state === 'cancelled' ? (
              <X size={24} color={colors.textSubtle} strokeWidth={2.5} />
            ) : (
              <RefreshCw size={24} color={colors.textMuted} strokeWidth={2.2} />
            )}
          </View>

          {state === 'running' ? <ActivityIndicator color={colors.textMuted} /> : null}

          <Text style={[styles.title, state === 'done' && styles.titleDone]}>
            {state === 'cancelled'
              ? 'Sync Cancelled'
              : state === 'done'
                ? 'All Products Synced!'
                : 'Syncing with Amazon'}
          </Text>
          <Text style={styles.subtitle}>{currentLabel}</Text>

          {state === 'running' ? (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${total > 0 ? (progress / total) * 100 : 0}%` }]}
                />
              </View>

              <View style={styles.progressMeta}>
                <Text numberOfLines={1} style={styles.progressItemText}>
                  {progress < total ? currentProductName : 'Finalising…'}
                </Text>
                <Text style={styles.progressCounter}>{progressLabel}</Text>
              </View>
            </View>
          ) : null}

          {state === 'running' ? (
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.bgOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 16,
    ...shadows.card,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(63, 63, 70, 0.25)',
  },
  iconWrapDone: {
    backgroundColor: 'rgba(113, 113, 122, 0.35)',
  },
  title: {
    color: colors.text,
    fontSize: font.sizeMd,
    fontWeight: font.weightSemibold,
  },
  titleDone: {
    color: colors.accent,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: font.sizeXs,
    textAlign: 'center',
  },
  progressWrap: {
    width: '100%',
    gap: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.textMuted,
  },
  progressMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressItemText: {
    flex: 1,
    color: colors.textSubtle,
    fontSize: font.sizeXs,
  },
  progressCounter: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
    fontWeight: font.weightMedium,
  },
  cancelButton: {
    width: '100%',
    minHeight: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
  },
  cancelButtonText: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
    fontWeight: font.weightMedium,
  },
});