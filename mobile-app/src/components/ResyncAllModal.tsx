import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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

function SyncIcon({ state, spinRotate }: Readonly<{ state: SyncState; spinRotate: Animated.AnimatedInterpolation<string> }>) {
  if (state === 'done') {
    return <Check size={24} color={colors.accent} strokeWidth={2.5} />;
  }
  if (state === 'cancelled') {
    return <X size={24} color={colors.textSubtle} strokeWidth={2.5} />;
  }
  return (
    <Animated.View style={{ transform: [{ rotate: spinRotate }] }}>
      <RefreshCw size={24} color={colors.info} strokeWidth={2.2} />
    </Animated.View>
  );
}

function syncTitle(state: SyncState) {
  if (state === 'cancelled') return 'Sync Cancelled';
  if (state === 'done') return 'All Products Synced!';
  return 'Syncing with Amazon';
}

export function ResyncAllModal({ visible, productNames, onClose }: ResyncAllModalProps) {
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<SyncState>('running');

  const total = productNames.length;

  // Spinning animation for RefreshCw icon
  const spinAnim = useRef(new Animated.Value(0)).current;
  // Bouncing dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || state !== 'running') return;

    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spin.start();

    const bounce = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -6, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      );

    const b1 = bounce(dot1, 0);
    const b2 = bounce(dot2, 150);
    const b3 = bounce(dot3, 300);
    b1.start();
    b2.start();
    b3.start();

    return () => {
      spin.stop();
      b1.stop();
      b2.stop();
      b3.stop();
      spinAnim.setValue(0);
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    };
  }, [visible, state, spinAnim, dot1, dot2, dot3]);

  const spinRotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
            <SyncIcon state={state} spinRotate={spinRotate} />
          </View>

          <Text style={[styles.title, state === 'done' && styles.titleDone]}>
            {syncTitle(state)}
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

          {/* Bouncing dots */}
          {state === 'running' ? (
            <View style={styles.dotsRow}>
              <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
              <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
              <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
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
    backgroundColor: 'rgba(96, 165, 250, 0.10)',
  },
  iconWrapDone: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
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
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.info,
  },
});