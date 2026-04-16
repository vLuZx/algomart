import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Check,
  DollarSign,
  MoreVertical,
  RefreshCw,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, gradients, radius, shadows } from '../constants/theme';
import type { SellerPopularity, SessionProduct } from '../types/product';
import { RatingStars } from './RatingStars';

interface ProductCardProps {
  readonly sessionId: string;
  readonly product: SessionProduct;
  readonly onDelete: (productId: string) => void;
  readonly onUpdateFoundPrice: (productId: string, foundPrice: number) => void;
}

const popularityColors: Record<SellerPopularity, string> = {
  Low: colors.textSubtle,
  Medium: colors.info,
  High: colors.accent,
  'Very High': colors.success,
};

export function ProductCard({
  sessionId,
  product,
  onDelete,
  onUpdateFoundPrice,
}: ProductCardProps) {
  const router = useRouter();
  const [actionsVisible, setActionsVisible] = useState(false);
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [draftPrice, setDraftPrice] = useState(product.foundPrice.toFixed(2));
  const [priceError, setPriceError] = useState('');

  useEffect(() => {
    if (!syncModalVisible) {
      return undefined;
    }

    setSyncDone(false);
    const doneTimer = setTimeout(() => setSyncDone(true), 1800);
    const closeTimer = setTimeout(() => {
      setSyncModalVisible(false);
      setSyncDone(false);
    }, 2600);

    return () => {
      clearTimeout(doneTimer);
      clearTimeout(closeTimer);
    };
  }, [syncModalVisible]);

  const handleOpenProduct = () => {
    router.push(`/session/${sessionId}/product/${product.id}`);
  };

  const openPriceModal = () => {
    setActionsVisible(false);
    setDraftPrice(product.foundPrice.toFixed(2));
    setPriceError('');
    setPriceModalVisible(true);
  };

  const openSyncModal = () => {
    setActionsVisible(false);
    setSyncModalVisible(true);
  };

  const openDeleteModal = () => {
    setActionsVisible(false);
    setDeleteModalVisible(true);
  };

  const handleSavePrice = () => {
    const parsed = Number.parseFloat(draftPrice.replaceAll(/[^0-9.]/g, ''));

    if (Number.isNaN(parsed) || parsed <= 0) {
      setPriceError('Please enter a valid price greater than $0.00');
      return;
    }

    onUpdateFoundPrice(product.id, parsed);
    setPriceModalVisible(false);
  };

  const popularityColor = popularityColors[product.sellerPopularity];

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={handleOpenProduct}
      >
        <Pressable
          style={({ pressed }) => [styles.menuButton, pressed && styles.menuButtonPressed]}
          onPress={(event) => {
            event.stopPropagation();
            setActionsVisible(true);
          }}
          hitSlop={8}
        >
          <MoreVertical size={16} color={colors.textMuted} strokeWidth={2} />
        </Pressable>

        <View style={styles.contentRow}>
          <Image source={{ uri: product.image }} style={styles.image} />

          <View style={styles.detailsColumn}>
            <Text style={styles.title} numberOfLines={2}>
              {product.title}
            </Text>

            <View style={styles.ratingRow}>
              <RatingStars rating={product.rating} size={13} />
              <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
            </View>

            <View style={styles.badgeRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{product.category}</Text>
              </View>
            </View>

            <View style={styles.footerRow}>
              <View style={styles.priceColumn}>
                <View style={styles.inlinePriceRow}>
                  <Text style={styles.priceLabel}>Amazon:</Text>
                  <Text style={styles.priceValue}>${product.price.toFixed(2)}</Text>
                </View>

                <View style={styles.inlinePriceRow}>
                  <Text style={styles.priceLabel}>Found:</Text>
                  <Text style={styles.foundPriceValue}>${product.foundPrice.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.popularityRow}>
                <TrendingUp size={13} color={popularityColor} strokeWidth={2.2} />
                <Text style={[styles.popularityText, { color: popularityColor }]}>
                  {product.sellerPopularity}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>

      <Modal transparent visible={actionsVisible} animationType="fade" onRequestClose={() => setActionsVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setActionsVisible(false)}>
          <View style={styles.actionsSheet}>
            <Pressable style={styles.actionRow} onPress={openPriceModal}>
              <DollarSign size={16} color={colors.accent} strokeWidth={2.2} />
              <Text style={styles.actionText}>Change Found Price</Text>
            </Pressable>

            <Pressable style={styles.actionRow} onPress={openSyncModal}>
              <RefreshCw size={16} color={colors.info} strokeWidth={2.2} />
              <Text style={styles.actionText}>Resync with Amazon</Text>
            </Pressable>

            <View style={styles.actionDivider} />

            <Pressable style={styles.actionRow} onPress={openDeleteModal}>
              <Trash2 size={16} color={colors.danger} strokeWidth={2.2} />
              <Text style={styles.destructiveActionText}>Remove from Session</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal transparent visible={priceModalVisible} animationType="fade" onRequestClose={() => setPriceModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.dialog}>
            <View style={styles.dialogHeader}>
              <View style={styles.dialogTitleRow}>
                <View style={styles.iconBadgeAmber}>
                  <DollarSign size={16} color={colors.accent} strokeWidth={2.2} />
                </View>
                <Text style={styles.dialogTitle}>Change Found Price</Text>
              </View>

              <Pressable style={styles.closeButton} onPress={() => setPriceModalVisible(false)}>
                <X size={14} color={colors.textMuted} strokeWidth={2.2} />
              </Pressable>
            </View>

            <View style={styles.dialogBody}>
              <Text style={styles.dialogSubtitle} numberOfLines={1}>
                {product.title}
              </Text>
              <Text style={styles.dialogCaption}>
                Current: <Text style={styles.dialogCaptionValue}>${product.foundPrice.toFixed(2)}</Text>
              </Text>

              <Text style={styles.inputLabel}>New Found Price</Text>
              <View style={styles.priceInputWrap}>
                <Text style={styles.pricePrefix}>$</Text>
                <TextInput
                  value={draftPrice}
                  onChangeText={(value) => {
                    setDraftPrice(value);
                    if (priceError) {
                      setPriceError('');
                    }
                  }}
                  placeholder="0.00"
                  placeholderTextColor={colors.textFaint}
                  style={styles.priceInput}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleSavePrice}
                />
              </View>

              {priceError ? <Text style={styles.errorText}>{priceError}</Text> : null}
            </View>

            <View style={styles.dialogFooter}>
              <Pressable style={styles.secondaryButton} onPress={() => setPriceModalVisible(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>

              <Pressable style={styles.primaryButtonPressable} onPress={handleSavePrice}>
                <LinearGradient colors={gradients.amber} style={styles.primaryButton}>
                  <Check size={14} color={colors.accentText} strokeWidth={2.4} />
                  <Text style={styles.primaryButtonText}>Save Price</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal transparent visible={syncModalVisible} animationType="fade" onRequestClose={() => setSyncModalVisible(false)}>
        <View style={styles.modalBackdropCentered}>
          <View style={styles.syncDialog}>
            <View style={[styles.syncIconWrap, syncDone && styles.syncIconWrapDone]}>
              {syncDone ? (
                <Check size={24} color={colors.success} strokeWidth={2.4} />
              ) : (
                <RefreshCw size={24} color={colors.info} strokeWidth={2.4} />
              )}
            </View>

            {syncDone ? null : <ActivityIndicator color={colors.info} style={styles.syncSpinner} />}

            <Text style={[styles.syncTitle, syncDone && styles.syncTitleDone]}>
              {syncDone ? 'Sync Complete!' : 'Syncing with Amazon'}
            </Text>
            <Text style={styles.syncCaption}>
              {syncDone
                ? 'Amazon prices have been updated.'
                : 'Fetching the latest pricing data…'}
            </Text>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={deleteModalVisible} animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDeleteModalVisible(false)}>
          <View style={styles.deleteSheet}>
            <LinearGradient colors={gradients.danger} style={styles.deleteAccent} />

            <View style={styles.deleteHeader}>
              <View style={styles.iconBadgeDanger}>
                <Trash2 size={16} color={colors.danger} strokeWidth={2.2} />
              </View>
              <View style={styles.deleteHeaderText}>
                <Text style={styles.dialogTitle}>Remove Product</Text>
                <Text style={styles.dialogCaption}>This action cannot be undone</Text>
              </View>
            </View>

            <View style={styles.deleteProductWrap}>
              <Text style={styles.deleteProductText} numberOfLines={2}>
                {product.title}
              </Text>
            </View>

            <View style={styles.dialogFooter}>
              <Pressable style={styles.secondaryButton} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.removeButton}
                onPress={() => {
                  setDeleteModalVisible(false);
                  onDelete(product.id);
                }}
              >
                <Trash2 size={14} color={colors.text} strokeWidth={2.2} />
                <Text style={styles.removeButtonText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    backgroundColor: colors.bgCardMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 16,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  menuButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonPressed: {
    backgroundColor: '#3f3f46',
  },
  contentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
  },
  detailsColumn: {
    flex: 1,
    paddingRight: 22,
  },
  title: {
    color: colors.text,
    fontSize: font.sizeSm,
    lineHeight: 19,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  ratingText: {
    color: colors.textSubtle,
    fontSize: font.sizeXs,
  },
  badgeRow: {
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    backgroundColor: 'rgba(39, 39, 42, 0.84)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  priceColumn: {
    gap: 2,
  },
  inlinePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceLabel: {
    color: colors.textSubtle,
    fontSize: font.sizeXs,
  },
  priceValue: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
    fontWeight: font.weightMedium,
  },
  foundPriceValue: {
    color: colors.accent,
    fontSize: font.sizeLg,
    fontWeight: font.weightMedium,
  },
  popularityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  popularityText: {
    fontSize: font.sizeXs,
    fontWeight: font.weightSemibold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.bgOverlay,
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalBackdropCentered: {
    flex: 1,
    backgroundColor: colors.bgOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionsSheet: {
    alignSelf: 'stretch',
    backgroundColor: colors.bgStrong,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: 10,
    ...shadows.card,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  actionText: {
    color: colors.text,
    fontSize: font.sizeSm,
  },
  destructiveActionText: {
    color: colors.danger,
    fontSize: font.sizeSm,
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  dialog: {
    marginTop: 'auto',
    marginBottom: 'auto',
    backgroundColor: colors.bgStrong,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dialogTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadgeAmber: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeDanger: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: {
    color: colors.text,
    fontSize: font.sizeSm,
    fontWeight: font.weightSemibold,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dialogSubtitle: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
    marginBottom: 4,
  },
  dialogCaption: {
    color: colors.textSubtle,
    fontSize: font.sizeXs,
  },
  dialogCaptionValue: {
    color: colors.textMuted,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
    marginTop: 16,
    marginBottom: 8,
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 14,
  },
  pricePrefix: {
    color: colors.accent,
    fontSize: font.sizeMd,
    fontWeight: font.weightSemibold,
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    minHeight: 50,
    color: colors.text,
    fontSize: font.sizeMd,
  },
  errorText: {
    color: colors.danger,
    fontSize: font.sizeXs,
    marginTop: 8,
  },
  dialogFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.textMuted,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
  },
  primaryButtonPressable: {
    flex: 1,
    borderRadius: radius.lg,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: colors.accentText,
    fontSize: font.sizeSm,
    fontWeight: font.weightSemibold,
  },
  syncDialog: {
    width: '100%',
    maxWidth: 260,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgStrong,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    ...shadows.card,
  },
  syncIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncIconWrapDone: {
    backgroundColor: colors.successSoft,
  },
  syncSpinner: {
    marginTop: 14,
  },
  syncTitle: {
    color: colors.text,
    fontSize: font.sizeSm,
    fontWeight: font.weightSemibold,
    marginTop: 14,
  },
  syncTitleDone: {
    color: colors.success,
  },
  syncCaption: {
    color: colors.textSubtle,
    fontSize: font.sizeXs,
    textAlign: 'center',
    marginTop: 6,
  },
  deleteSheet: {
    backgroundColor: colors.bgStrong,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  deleteAccent: {
    height: 4,
  },
  deleteHeader: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  deleteHeaderText: {
    flex: 1,
  },
  deleteProductWrap: {
    marginHorizontal: 20,
    marginBottom: 18,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deleteProductText: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
    lineHeight: 18,
  },
  removeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.lg,
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  removeButtonText: {
    color: colors.text,
    fontSize: font.sizeSm,
    fontWeight: font.weightSemibold,
  },
});