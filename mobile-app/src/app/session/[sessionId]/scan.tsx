import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Camera,
  isScannedCode,
  useCameraDevice,
  useCameraPermission,
  useObjectOutput,
  type ScannedObject,
  type ScannedObjectType,
} from 'react-native-vision-camera';
import { ChevronLeft, DollarSign, Lock, Package, ScanLine, X } from 'lucide-react-native';
import { GradientButton } from '../../../components/GradientButton';
import { colors, font, radius, shadows } from '../../../constants/theme';
import { fetchProductCalculation } from '../../../services/product.service';
import { useSessions } from '../../../store/sessions';
import type { ProductCalculation, ProductCalculationFull } from '../../../types/api';
import type {
  CompetitionLevel,
  ScannedProductInput,
  SellerPopularity,
} from '../../../types/product';

const BARCODE_TYPES: ScannedObjectType[] = [
  'ean-13',
  'ean-8',
  'upc-e',
  'code-128',
  'code-93',
  'code-39',
  'itf-14',
  'interleaved-2-of-5',
  'qr',
];

function getRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function popularityFromScore(score: number): SellerPopularity {
  if (score >= 5000) return 'Very High';
  if (score >= 1000) return 'High';
  if (score >= 200) return 'Medium';
  return 'Low';
}

function competitionFromSellerCount(total: number): CompetitionLevel {
  if (total >= 20) return 'Very High';
  if (total >= 10) return 'High';
  if (total >= 4) return 'Medium';
  return 'Low';
}

function formatInches(value: number): string {
  return `${value.toFixed(1)}\"`;
}

function formatDimensions(d: ProductCalculationFull['fetched']['dimensions']): string {
  if (!d.length && !d.width && !d.height) return '';
  return `${formatInches(d.length)} × ${formatInches(d.width)} × ${formatInches(d.height)}`;
}

function formatWeight(weightLb: number): string {
  if (!weightLb) return '';
  const wholeLbs = Math.floor(weightLb);
  const remainderOz = (weightLb - wholeLbs) * 16;
  if (wholeLbs === 0) return `${remainderOz.toFixed(1)} oz`;
  if (remainderOz < 0.05) return `${wholeLbs} lbs`;
  return `${wholeLbs} lbs ${remainderOz.toFixed(1)} oz`;
}

/**
 * Map the calculation response onto the SessionProduct shape the local
 * store expects. The /api/calculations/product endpoint is the ONLY
 * backend call the app makes per product, so everything we need is
 * derived from this single payload.
 */
function buildScannedInput(
  calc: ProductCalculationFull,
  foundPrice: number,
  estimatedQuantity: number,
  scan: { barcode: string; barcodeType: string },
): ScannedProductInput {
  const fetched = calc.fetched;
  const computed = calc.computed;
  return {
    asin: calc.metadata.asin,
    title: calc.metadata.title || 'Unknown Product',
    image: calc.metadata.image || '',
    rating: 0,
    category: calc.metadata.category || '',
    price: computed.amazonPrice,
    sellerPopularity: popularityFromScore(fetched.sellerPopularity),
    sellerPopularityScore: fetched.sellerPopularity,
    foundPrice,
    estimatedQuantity,
    barcode: scan.barcode,
    barcodeType: scan.barcodeType,
    estimatedShipping: computed.shippingFee,
    amazonFees: computed.referralFee + computed.fbaFee,
    profitMargin: computed.profit.netProfitPerUnit ?? 0,
    requiresApproval: !fetched.inboundEligibility.isEligible,
    competitionLevel: competitionFromSellerCount(fetched.competition.totalSellerCount),
    bsr: fetched.bsr,
    dimensions: formatDimensions(fetched.dimensions),
    weight: formatWeight(fetched.dimensions.weight),
    restrictions: fetched.inboundEligibility.reasons,
    monthlySalesEstimate: fetched.salesEstimate.unitsPerMonth ?? 0,
  };
}

export default function ScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = getRouteParam(params.sessionId);
  const { addScannedProduct } = useSessions();

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const [isConfirming, setIsConfirming] = useState(false);
  const [scannedCode, setScannedCode] = useState<{ barcode: string; barcodeType: string } | null>(null);
  const [foundPriceText, setFoundPriceText] = useState('');
  const [estimatedQuantityText, setEstimatedQuantityText] = useState('1');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [approvalBlocked, setApprovalBlocked] = useState(false);

  const lastBarcodeRef = useRef<string | null>(null);
  /** Cooldown after surfacing the modal so the camera — which fires the
   * scan callback many times per second — can't keep re-opening the sheet
   * for the same code. */
  const scanCooldownRef = useRef<{ barcode: string; until: number } | null>(null);
  const SCAN_COOLDOWN_MS = 3000;

  // Request permission on mount
  useEffect(() => {
    if (!hasPermission) {
      void requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const resetScan = useCallback(() => {
    lastBarcodeRef.current = null;
    scanCooldownRef.current = null;
    setScannedCode(null);
    setFoundPriceText('');
    setEstimatedQuantityText('1');
    setErrorMessage(null);
    setIsConfirming(false);
    setApprovalBlocked(false);
  }, []);

  const handleBarcode = useCallback((raw: string, barcodeType: ScannedObjectType) => {
    const barcode = raw.trim();
    if (!barcode) return;
    if (lastBarcodeRef.current === barcode) return;

    const cooldown = scanCooldownRef.current;
    if (cooldown && cooldown.barcode === barcode && Date.now() < cooldown.until) {
      return;
    }

    lastBarcodeRef.current = barcode;
    scanCooldownRef.current = { barcode, until: Date.now() + SCAN_COOLDOWN_MS };
    setScannedCode({ barcode, barcodeType });
    setErrorMessage(null);
  }, []);

  const onObjectsScanned = useCallback(
    (objects: ScannedObject[]) => {
      if (scannedCode) return;
      for (const object of objects) {
        if (isScannedCode(object) && object.value) {
          handleBarcode(object.value, object.type);
          return;
        }
      }
    },
    [handleBarcode, scannedCode],
  );

  const objectOutput = useObjectOutput({
    types: BARCODE_TYPES,
    onObjectsScanned,
  });

  const parsedFoundPrice = useMemo(() => {
    const normalized = foundPriceText.replace(',', '.').trim();
    if (!normalized) return null;
    const value = Number(normalized);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, [foundPriceText]);

  const parsedEstimatedQuantity = useMemo(() => {
    const normalized = estimatedQuantityText.trim();
    if (!normalized) return null;
    const value = Number.parseInt(normalized, 10);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, [estimatedQuantityText]);

  const handleConfirm = useCallback(async () => {
    if (!sessionId || parsedFoundPrice === null || parsedEstimatedQuantity === null || !scannedCode) return;
    if (isConfirming) return;

    setIsConfirming(true);
    setErrorMessage(null);
    try {
      const calc = await fetchProductCalculation({
        barcode: scannedCode.barcode,
        foundPrice: parsedFoundPrice,
        // foundPrice is the per-unit COGS — the API needs it explicitly so
        // the profit block populates instead of returning COGS_REQUIRED.
        costOfGoods: parsedFoundPrice,
        estimatedQuantity: parsedEstimatedQuantity,
      });
      // Server short-circuits with `{ approvalRequired: true }` when the
      // ASIN is gated for our seller account. Surface a styled in-sheet
      // panel and DO NOT add the product to the session.
      if ('approvalRequired' in calc && calc.approvalRequired) {
        setApprovalBlocked(true);
        setIsConfirming(false);
        return;
      }
      const input = buildScannedInput(calc as ProductCalculationFull, parsedFoundPrice, parsedEstimatedQuantity, scannedCode);
      const product = addScannedProduct(sessionId, input);
      resetScan();
      router.replace(`/session/${sessionId}/product/${product.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not add product.';
      Alert.alert('Unable to add product', message);
      setIsConfirming(false);
    }
  }, [
    sessionId,
    parsedFoundPrice,
    parsedEstimatedQuantity,
    scannedCode,
    isConfirming,
    addScannedProduct,
    resetScan,
    router,
  ]);

  const showSheet = scannedCode !== null;
  const cameraActive = !showSheet;

  if (!sessionId) {
    return (
      <SafeAreaView style={styles.fallback}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <Text style={styles.fallbackTitle}>Session not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.textMuted} strokeWidth={2.2} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Camera */}
      <View style={StyleSheet.absoluteFill}>
        {device && hasPermission ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={cameraActive}
            outputs={[objectOutput]}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.cameraFallback]}>
            {hasPermission ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <Text style={styles.fallbackTitle}>Camera access required</Text>
                <Text style={styles.fallbackSubtitle}>
                  Enable camera permission to scan product barcodes.
                </Text>
                <Pressable style={styles.permissionButton} onPress={() => void requestPermission()}>
                  <Text style={styles.permissionButtonText}>Grant permission</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>

      {/* Overlay frame */}
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.reticleWrap}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
      </View>

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafe} pointerEvents="box-none">
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={22} color={colors.text} strokeWidth={2.2} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <ScanLine size={16} color={colors.accent} strokeWidth={2.2} />
            <Text style={styles.headerTitle}>Scan Product</Text>
          </View>
          <View style={styles.headerButton} />
        </View>
      </SafeAreaView>

      {/* Status strip */}
      <SafeAreaView edges={['bottom']} style={styles.statusSafe} pointerEvents="box-none">
        <View style={styles.statusStrip}>
          {errorMessage ? (
            <View style={styles.statusRow}>
              <Text style={[styles.statusText, styles.statusError]}>{errorMessage}</Text>
              <Pressable onPress={resetScan} hitSlop={8}>
                <Text style={styles.statusAction}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <Text style={styles.statusText}>Align a barcode inside the frame</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Bottom sheet: found price */}
      <Modal
        visible={showSheet}
        transparent
        animationType="slide"
        onRequestClose={resetScan}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={resetScan} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetWrap}
          >
            <SafeAreaView edges={['bottom']} style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetEyebrow}>BARCODE SCANNED</Text>
                <Pressable style={styles.sheetClose} onPress={resetScan} hitSlop={8}>
                  <X size={18} color={colors.textMuted} strokeWidth={2.2} />
                </Pressable>
              </View>

              <Text style={styles.sheetTitle} numberOfLines={2}>
                {scannedCode?.barcode ?? ''}
              </Text>

              <View style={styles.metaRow}>
                {scannedCode?.barcodeType ? (
                  <Text style={styles.metaText}>{scannedCode.barcodeType.toUpperCase()}</Text>
                ) : null}
              </View>

              {approvalBlocked ? (
                <View style={styles.approvalPanel}>
                  <View style={styles.approvalIconWrap}>
                    <Lock size={22} color="#facc15" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.approvalTitle}>Approval Required</Text>
                  <Text style={styles.approvalBody}>
                    Amazon requires approval to list this product on your seller
                    account. This product will not be added to your session.
                  </Text>
                  <GradientButton
                    label="Skip & Continue Scanning"
                    onPress={resetScan}
                    style={styles.confirmButton}
                  />
                </View>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Found Price</Text>
                  <View style={styles.inputWrap}>
                    <DollarSign size={18} color={colors.textSubtle} strokeWidth={2.2} />
                    <TextInput
                      value={foundPriceText}
                      onChangeText={setFoundPriceText}
                      placeholder="0.00"
                      placeholderTextColor={colors.textSubtle}
                      keyboardType="decimal-pad"
                      style={styles.input}
                      autoFocus
                      returnKeyType="next"
                    />
                  </View>

                  <Text style={styles.inputLabel}>Estimated Quantity</Text>
                  <View style={styles.inputWrap}>
                    <Package size={18} color={colors.textSubtle} strokeWidth={2.2} />
                    <TextInput
                      value={estimatedQuantityText}
                      onChangeText={setEstimatedQuantityText}
                      placeholder="1"
                      placeholderTextColor={colors.textSubtle}
                      keyboardType="number-pad"
                      style={styles.input}
                      returnKeyType="done"
                      onSubmitEditing={handleConfirm}
                    />
                  </View>

                  <GradientButton
                    label={isConfirming ? 'Calculating…' : 'Confirm'}
                    onPress={handleConfirm}
                    disabled={parsedFoundPrice === null || parsedEstimatedQuantity === null || isConfirming}
                    style={styles.confirmButton}
                  />
                  {errorMessage ? (
                    <Text style={[styles.statusText, styles.statusError, { marginTop: 8, textAlign: 'center' }]}>
                      {errorMessage}
                    </Text>
                  ) : null}
                </>
              )}
            </SafeAreaView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
    backgroundColor: colors.bgStrong,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleWrap: {
    width: 260,
    height: 260,
    borderRadius: radius.xl,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: colors.accent,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radius.xl },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radius.xl },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radius.xl },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radius.xl },
  headerSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.bgOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.bgOverlay,
  },
  headerTitle: {
    color: colors.text,
    fontSize: font.sizeSm,
    fontWeight: font.weightSemibold,
  },
  statusSafe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  statusStrip: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgOverlay,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  statusText: {
    color: colors.text,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
    textAlign: 'center',
  },
  statusError: {
    color: colors.danger,
  },
  statusAction: {
    color: colors.accent,
    fontSize: font.sizeSm,
    fontWeight: font.weightSemibold,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.bgOverlay,
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.borderStrong,
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sheetEyebrow: {
    color: colors.accent,
    fontSize: font.sizeXs,
    fontWeight: font.weightSemibold,
    letterSpacing: 0.8,
  },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: font.sizeLg,
    fontWeight: font.weightSemibold,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.bgCardMuted,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
    fontWeight: font.weightSemibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: font.sizeLg,
    fontWeight: font.weightSemibold,
    paddingVertical: 0,
  },
  confirmButton: {
    marginTop: 4,
  },
  approvalPanel: {
    marginTop: 8,
    padding: 18,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(250, 204, 21, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.30)',
    alignItems: 'center',
    gap: 10,
  },
  approvalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(250, 204, 21, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  approvalTitle: {
    color: '#facc15',
    fontSize: font.sizeMd,
    fontWeight: font.weightSemibold,
  },
  approvalBody: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  fallback: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  fallbackTitle: {
    color: colors.text,
    fontSize: font.sizeLg,
    fontWeight: font.weightSemibold,
    textAlign: 'center',
  },
  fallbackSubtitle: {
    color: colors.textMuted,
    fontSize: font.sizeSm,
    textAlign: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
  },
  backButtonText: {
    color: colors.text,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
  },
  permissionButton: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  permissionButtonText: {
    color: colors.accentText,
    fontSize: font.sizeSm,
    fontWeight: font.weightSemibold,
  },
});
