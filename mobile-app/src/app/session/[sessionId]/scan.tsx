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
import { ChevronLeft, DollarSign, Package, ScanLine, X } from 'lucide-react-native';
import { GradientButton } from '../../../components/GradientButton';
import { colors, font, radius, shadows } from '../../../constants/theme';
import { lookupByBarcode } from '../../../services/product.service';
import { useSessions } from '../../../store/sessions';
import type { ProductLookupResult } from '../../../types/api';
import type { ScannedProductInput } from '../../../types/product';

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

function buildScannedInput(
  lookup: ProductLookupResult,
  foundPrice: number,
  estimatedQuantity: number,
  scan: { barcode: string; barcodeType: string },
): ScannedProductInput {
  // All enrichment (including amazonFees) comes from the single
  // /api/amazon/insights call in lookupByBarcode. Fields SP-API does not
  // expose (rating, sellerPopularity, competitionLevel, etc.) stay at
  // neutral defaults until new APIs back them.
  return {
    asin: lookup.asin,
    title: lookup.title ?? lookup.brand ?? 'Unknown Product',
    image: lookup.image ?? '',
    rating: 0,
    category: lookup.category ?? '',
    price: lookup.price ?? foundPrice,
    sellerPopularity: 'Medium',
    foundPrice,
    estimatedQuantity,
    barcode: scan.barcode,
    barcodeType: scan.barcodeType,
    ...(lookup.dimensions ? { dimensions: lookup.dimensions } : {}),
    ...(lookup.weight ? { weight: lookup.weight } : {}),
    ...(lookup.salesRank !== null ? { salesRank: lookup.salesRank } : {}),
    ...(lookup.bsr ? { bsr: lookup.bsr.rank } : {}),
    ...(typeof lookup.amazonFees === 'number' ? { amazonFees: lookup.amazonFees } : {}),
  };
}

export default function ScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = getRouteParam(params.sessionId);
  const { addScannedProduct } = useSessions();

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [lookupResult, setLookupResult] = useState<ProductLookupResult | null>(null);
  const [scannedCode, setScannedCode] = useState<{ barcode: string; barcodeType: string } | null>(null);
  const [foundPriceText, setFoundPriceText] = useState('');
  const [estimatedQuantityText, setEstimatedQuantityText] = useState('1');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lastBarcodeRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  /**
   * Cache successful lookups for the lifetime of this scan screen so that
   * repeatedly scanning the same barcode (the camera fires the callback
   * many times per second) does NOT re-hit the API. Errors intentionally
   * are NOT cached so the user can retry a transient failure.
   */
  const lookupCacheRef = useRef<Map<string, ProductLookupResult>>(new Map());
  /** Cooldown window after a successful scan during which the same
   * barcode is silently ignored, preventing rapid-fire duplicates from
   * the camera even after the modal closes. */
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
    inFlightRef.current = false;
    // Clear cooldown so a user-initiated Retry can immediately rescan
    // the same code that just failed.
    scanCooldownRef.current = null;
    setLookupResult(null);
    setScannedCode(null);
    setFoundPriceText('');
    setEstimatedQuantityText('1');
    setErrorMessage(null);
    setIsLookingUp(false);
    setIsConfirming(false);
  }, []);

  const handleBarcode = useCallback(async (raw: string, barcodeType: ScannedObjectType) => {
    const barcode = raw.trim();
    if (!barcode || inFlightRef.current) return;
    if (lastBarcodeRef.current === barcode) return;

    // Suppress repeats within the cooldown window (camera spams the same
    // barcode many times per second).
    const cooldown = scanCooldownRef.current;
    if (cooldown && cooldown.barcode === barcode && Date.now() < cooldown.until) {
      return;
    }

    lastBarcodeRef.current = barcode;
    inFlightRef.current = true;
    setIsLookingUp(true);
    setErrorMessage(null);

    try {
      // Reuse cached lookups instead of re-hitting the API for a barcode
      // we've already resolved on this screen.
      const cached = lookupCacheRef.current.get(barcode);
      const result = cached ?? (await lookupByBarcode(barcode));
      if (!cached) lookupCacheRef.current.set(barcode, result);

      scanCooldownRef.current = { barcode, until: Date.now() + SCAN_COOLDOWN_MS };
      setScannedCode({ barcode, barcodeType });
      setLookupResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Product lookup failed.';
      setErrorMessage(message);
      // Hold the cooldown for failed lookups too so the camera doesn't
      // spam the API with retries while the user is still pointed at the
      // same (unresolvable) barcode. The user can press Retry, which calls
      // resetScan() and clears the cooldown.
      scanCooldownRef.current = { barcode, until: Date.now() + SCAN_COOLDOWN_MS };
    } finally {
      inFlightRef.current = false;
      setIsLookingUp(false);
    }
  }, []);

  const onObjectsScanned = useCallback(
    (objects: ScannedObject[]) => {
      if (inFlightRef.current || lookupResult) return;
      for (const object of objects) {
        if (isScannedCode(object) && object.value) {
          void handleBarcode(object.value, object.type);
          return;
        }
      }
    },
    [handleBarcode, lookupResult],
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

  const handleConfirm = useCallback(() => {
    if (!sessionId || !lookupResult || parsedFoundPrice === null || parsedEstimatedQuantity === null || !scannedCode) return;
    if (isConfirming) return;

    setIsConfirming(true);
    try {
      const input = buildScannedInput(lookupResult, parsedFoundPrice, parsedEstimatedQuantity, scannedCode);
      console.debug('[Scan] confirm: lookupResult.price =', lookupResult.price);
      console.debug('[Scan] confirm: parsedFoundPrice =', parsedFoundPrice);
      console.debug('[Scan] confirm: input.price (→ Amazon Price) =', input.price);
      console.debug('[Scan] confirm: input.amazonFees =', input.amazonFees);
      const product = addScannedProduct(sessionId, input);
      console.debug('[Scan] stored product.price =', product.price);
      resetScan();
      router.replace(`/session/${sessionId}/product/${product.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not add product.';
      Alert.alert('Unable to add product', message);
      setIsConfirming(false);
    }
  }, [
    sessionId,
    lookupResult,
    parsedFoundPrice,
    parsedEstimatedQuantity,
    scannedCode,
    isConfirming,
    addScannedProduct,
    resetScan,
    router,
  ]);

  const showSheet = lookupResult !== null;
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
          {isLookingUp ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={styles.statusText}>Looking up product…</Text>
            </View>
          ) : errorMessage ? (
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
                <Text style={styles.sheetEyebrow}>PRODUCT FOUND</Text>
                <Pressable style={styles.sheetClose} onPress={resetScan} hitSlop={8}>
                  <X size={18} color={colors.textMuted} strokeWidth={2.2} />
                </Pressable>
              </View>

              <Text style={styles.sheetTitle} numberOfLines={2}>
                {lookupResult?.title ?? lookupResult?.brand ?? 'Unknown product'}
              </Text>

              <View style={styles.metaRow}>
                {lookupResult?.asin ? (
                  <Text style={styles.metaText}>ASIN {lookupResult.asin}</Text>
                ) : null}
                {lookupResult?.price !== null && lookupResult?.price !== undefined ? (
                  <Text style={styles.metaText}>
                    Amazon ${lookupResult.price.toFixed(2)}
                  </Text>
                ) : (
                  <Text style={styles.metaText}>No Amazon price available</Text>
                )}
              </View>

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
                label="Confirm"
                onPress={handleConfirm}
                disabled={parsedFoundPrice === null || parsedEstimatedQuantity === null || isConfirming}
                style={styles.confirmButton}
              />
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
