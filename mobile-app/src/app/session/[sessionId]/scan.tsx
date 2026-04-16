import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertCircle,
  ArrowRight,
  Barcode,
  CheckCircle2,
  ChevronLeft,
  Minus,
  ScanLine,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, gradients, radius, shadows } from '../../../constants/theme';
import { scannerPool } from '../../../data/mockData';
import { useSessions } from '../../../store/sessions';
import type { ScannerSeedProduct } from '../../../types/product';

type Step = 'idle' | 'scanning' | 'price-entry' | 'result' | 'error';

interface ScanResult {
  foundPrice: number;
  amazonFees: number;
  shipping: number;
  profit: number;
  profitPct: number;
}

const SCAN_ERRORS = [
  'Not listed on Amazon',
  'Product is restricted in your region',
  'ASIN not found in database',
  'Hazmat item — cannot be sold by third parties',
  'Age-restricted product',
  'Brand gated — requires approval',
] as const;

function getRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function randomItem<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function getProfitTone(profit: number, pct: number) {
  if (profit > 10 && pct > 10) {
    return {
      color: colors.success,
      backgroundColor: colors.successSoft,
      label: 'Good deal!',
      icon: 'up' as const,
    };
  }

  if (profit > 3 && pct > 5) {
    return {
      color: colors.accent,
      backgroundColor: colors.accentSoft,
      label: 'Marginal',
      icon: 'flat' as const,
    };
  }

  return {
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    label: 'Poor margin',
    icon: 'down' as const,
  };
}

function renderProfitIcon(icon: 'up' | 'flat' | 'down', color: string) {
  if (icon === 'up') {
    return <TrendingUp size={14} color={color} strokeWidth={2.2} />;
  }

  if (icon === 'flat') {
    return <Minus size={14} color={color} strokeWidth={2.2} />;
  }

  return <TrendingDown size={14} color={color} strokeWidth={2.2} />;
}

interface ScannerFinderProps {
  readonly step: Step;
  readonly sheetVisible: boolean;
  readonly pulseAnimation: Animated.Value;
  readonly scanLineTranslate: Animated.AnimatedInterpolation<number>;
}

function FinderContent({ step, sheetVisible }: Readonly<Pick<ScannerFinderProps, 'step' | 'sheetVisible'>>) {
  if (step === 'scanning') {
    return (
      <>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.finderCaptionAmber}>Scanning…</Text>
      </>
    );
  }

  if (sheetVisible) {
    return <Barcode size={36} color={colors.bgCard} strokeWidth={2} />;
  }

  return (
    <>
      <Barcode size={40} color={colors.textFaint} strokeWidth={1.8} />
      <Text style={styles.finderCaption}>Align barcode within frame</Text>
    </>
  );
}

function ScannerFinder({ step, sheetVisible, pulseAnimation, scanLineTranslate }: ScannerFinderProps) {
  return (
    <View style={styles.viewfinder}>
      {step === 'scanning' ? (
        <Animated.View style={[styles.pulseOverlay, { opacity: pulseAnimation }]} />
      ) : null}

      <View style={[styles.corner, styles.cornerTopLeft]} />
      <View style={[styles.corner, styles.cornerTopRight]} />
      <View style={[styles.corner, styles.cornerBottomLeft]} />
      <View style={[styles.corner, styles.cornerBottomRight]} />

      {step === 'idle' ? (
        <Animated.View style={[styles.scanLineWrap, { transform: [{ translateY: scanLineTranslate }] }]}>
          <LinearGradient colors={['transparent', colors.accentLight, 'transparent']} style={styles.scanLine} />
        </Animated.View>
      ) : null}

      <View style={styles.finderContent}>
        <FinderContent step={step} sheetVisible={sheetVisible} />
      </View>
    </View>
  );
}

interface PriceEntrySheetProps {
  readonly product: ScannerSeedProduct;
  readonly priceInput: string;
  readonly priceError: string;
  readonly onPriceChange: (value: string) => void;
  readonly onCancel: () => void;
  readonly onCalculate: () => void;
}

function PriceEntrySheet({
  product,
  priceInput,
  priceError,
  onPriceChange,
  onCancel,
  onCalculate,
}: PriceEntrySheetProps) {
  return (
    <View style={styles.sheetContent}>
      <View style={styles.badgeRow}>
        <CheckCircle2 size={14} color={colors.success} strokeWidth={2.4} />
        <Text style={styles.successBadgeText}>Found on Amazon</Text>
        <Text style={styles.asinText}>{product.asin}</Text>
      </View>

      <View style={styles.productPreviewCard}>
        <Image source={{ uri: product.image }} style={styles.previewImage} />
        <View style={styles.previewBody}>
          <Text style={styles.previewTitle} numberOfLines={2}>
            {product.title}
          </Text>
          <Text style={styles.previewCaption}>
            Amazon price: <Text style={styles.previewCaptionValue}>${product.price.toFixed(2)}</Text>
          </Text>
        </View>
      </View>

      <Text style={styles.inputPrompt}>What did you pay for it?</Text>
      <View style={styles.priceEntryWrap}>
        <Text style={styles.priceEntryPrefix}>$</Text>
        <TextInput
          value={priceInput}
          onChangeText={onPriceChange}
          placeholder="0.00"
          placeholderTextColor={colors.textFaint}
          style={styles.priceEntryInput}
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={onCalculate}
        />
      </View>
      {priceError ? <Text style={styles.errorText}>{priceError}</Text> : <View style={styles.errorSpacer} />}

      <View style={styles.sheetButtonRow}>
        <Pressable style={styles.secondaryButton} onPress={onCancel}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>

        <Pressable style={styles.primarySheetButtonPressable} onPress={onCalculate}>
          <LinearGradient colors={gradients.amber} style={styles.primarySheetButton}>
            <Text style={styles.primarySheetButtonText}>Calculate Profit</Text>
            <ArrowRight size={14} color={colors.accentText} strokeWidth={2.5} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

interface ResultSheetProps {
  readonly product: ScannerSeedProduct;
  readonly result: ScanResult;
  readonly profitTone: ReturnType<typeof getProfitTone>;
  readonly onScanAgain: () => void;
  readonly onOpenProduct: () => void;
}

function ResultSheet({ product, result, profitTone, onScanAgain, onOpenProduct }: ResultSheetProps) {
  return (
    <View style={styles.sheetContent}>
      <View style={styles.resultHeaderRow}>
        <Image source={{ uri: product.image }} style={styles.resultImage} />
        <View style={styles.resultHeaderBody}>
          <Text style={styles.previewTitle} numberOfLines={1}>
            {product.title}
          </Text>
          <Text style={styles.asinTextLeft}>{product.asin}</Text>
        </View>
      </View>

      <View style={styles.breakdownCard}>
        {[
          { label: 'Amazon Price', value: `$${product.price.toFixed(2)}`, color: colors.textMuted },
          { label: 'Your Found Price', value: `-$${result.foundPrice.toFixed(2)}`, color: colors.accent },
          { label: 'Amazon Fees (15%)', value: `-$${result.amazonFees.toFixed(2)}`, color: colors.textMuted },
          { label: 'Est. Shipping', value: `-$${result.shipping.toFixed(2)}`, color: colors.textMuted },
        ].map((row, index) => (
          <View key={row.label} style={[styles.breakdownRow, index < 3 && styles.breakdownRowBorder]}>
            <Text style={styles.breakdownLabel}>{row.label}</Text>
            <Text style={[styles.breakdownValue, { color: row.color }]}>{row.value}</Text>
          </View>
        ))}

        <View style={[styles.breakdownProfitRow, { backgroundColor: profitTone.backgroundColor }]}>
          <View style={styles.breakdownProfitLabelRow}>
            {renderProfitIcon(profitTone.icon, profitTone.color)}
            <Text style={[styles.breakdownProfitLabel, { color: profitTone.color }]}>Net Profit · {profitTone.label}</Text>
          </View>

          <View style={styles.breakdownProfitValueWrap}>
            <Text style={[styles.breakdownProfitValue, { color: profitTone.color }]}>
              {result.profit >= 0 ? '+' : ''}${result.profit.toFixed(2)}
            </Text>
            <Text style={styles.breakdownPercent}>
              ({result.profitPct >= 0 ? '+' : ''}{result.profitPct.toFixed(1)}%)
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.sheetButtonRow}>
        <Pressable style={styles.secondaryButton} onPress={onScanAgain}>
          <Text style={styles.secondaryButtonText}>Scan Again</Text>
        </Pressable>

        <Pressable style={styles.primarySheetButtonPressable} onPress={onOpenProduct}>
          <LinearGradient colors={gradients.amber} style={styles.primarySheetButton}>
            <Text style={styles.primarySheetButtonText}>Open Product</Text>
            <ArrowRight size={14} color={colors.accentText} strokeWidth={2.5} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

interface ErrorSheetProps {
  readonly errorReason: string;
  readonly onReset: () => void;
}

function ErrorSheet({ errorReason, onReset }: ErrorSheetProps) {
  return (
    <View style={styles.sheetContent}>
      <View style={styles.badgeRowLeft}>
        <View style={styles.errorBadgeIcon}>
          <XCircle size={14} color={colors.danger} strokeWidth={2.4} />
        </View>
        <Text style={styles.errorBadgeText}>Product Not Found</Text>
      </View>

      <View style={styles.errorCard}>
        <AlertCircle size={16} color={colors.danger} strokeWidth={2.2} />
        <Text style={styles.errorCardText}>{errorReason}</Text>
      </View>

      <Pressable style={styles.secondaryButton} onPress={onReset}>
        <Text style={styles.secondaryButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

interface ScannerSheetProps {
  readonly step: Step;
  readonly scannedProduct: ScannerSeedProduct | null;
  readonly priceInput: string;
  readonly priceError: string;
  readonly errorReason: string;
  readonly scanResult: ScanResult | null;
  readonly profitTone: ReturnType<typeof getProfitTone> | null;
  readonly onPriceChange: (value: string) => void;
  readonly onCancel: () => void;
  readonly onCalculate: () => void;
  readonly onScanAgain: () => void;
  readonly onOpenProduct: () => void;
}

function ScannerSheet({
  step,
  scannedProduct,
  priceInput,
  priceError,
  errorReason,
  scanResult,
  profitTone,
  onPriceChange,
  onCancel,
  onCalculate,
  onScanAgain,
  onOpenProduct,
}: ScannerSheetProps) {
  let content: JSX.Element | null = null;

  if (step === 'price-entry' && scannedProduct) {
    content = (
      <PriceEntrySheet
        product={scannedProduct}
        priceInput={priceInput}
        priceError={priceError}
        onPriceChange={onPriceChange}
        onCancel={onCancel}
        onCalculate={onCalculate}
      />
    );
  } else if (step === 'result' && scannedProduct && scanResult && profitTone) {
    content = (
      <ResultSheet
        product={scannedProduct}
        result={scanResult}
        profitTone={profitTone}
        onScanAgain={onScanAgain}
        onOpenProduct={onOpenProduct}
      />
    );
  } else if (step === 'error') {
    content = <ErrorSheet errorReason={errorReason} onReset={onScanAgain} />;
  }

  if (!content) {
    return null;
  }

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      {content}
    </View>
  );
}

export default function ScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = getRouteParam(params.sessionId);
  const { getSession, addScannedProduct } = useSessions();
  const session = sessionId ? getSession(sessionId) : undefined;

  const [step, setStep] = useState<Step>('idle');
  const [scannedProduct, setScannedProduct] = useState<ScannerSeedProduct | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [priceInput, setPriceInput] = useState('');
  const [priceError, setPriceError] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [errorReason, setErrorReason] = useState('');

  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(0.1)).current;
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnimation, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnimation, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [scanLineAnimation]);

  useEffect(() => {
    if (step !== 'scanning') {
      pulseAnimation.setValue(0.1);
      return undefined;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 0.28,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 0.1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [pulseAnimation, step]);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
    };
  }, []);

  const scanLineTranslate = scanLineAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 172],
  });

  const sheetVisible = step === 'price-entry' || step === 'result' || step === 'error';
  const profitTone = useMemo(() => {
    if (!scanResult) {
      return null;
    }

    return getProfitTone(scanResult.profit, scanResult.profitPct);
  }, [scanResult]);

  if (!sessionId || !session) {
    return (
      <SafeAreaView style={styles.fallbackContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bgStrong} />
        <Pressable style={styles.headerBackButton} onPress={() => router.replace('/')}>
          <ChevronLeft size={20} color={colors.textMuted} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.fallbackTitle}>Session not found</Text>
        <Text style={styles.fallbackSubtitle}>Open a valid session before using the scanner.</Text>
      </SafeAreaView>
    );
  }

  const triggerScan = () => {
    if (step === 'scanning') {
      return;
    }

    setStep('scanning');
    setScannedProduct(null);
    setScanResult(null);
    setErrorReason('');

    scanTimerRef.current = setTimeout(() => {
      const successfulScan = Math.random() > 0.3;
      setScanCount((current) => current + 1);

      if (successfulScan) {
        setScannedProduct(randomItem(scannerPool));
        setPriceInput('');
        setPriceError('');
        setStep('price-entry');
        return;
      }

      setErrorReason(randomItem(SCAN_ERRORS));
      setStep('error');
    }, 1500 + Math.random() * 650);
  };

  const resetToIdle = () => {
    setStep('idle');
    setScannedProduct(null);
    setScanResult(null);
    setErrorReason('');
    setPriceInput('');
    setPriceError('');
  };

  const handleCalculate = () => {
    if (!scannedProduct) {
      return;
    }

    const parsed = Number.parseFloat(priceInput.replaceAll(/[^0-9.]/g, ''));

    if (Number.isNaN(parsed) || parsed <= 0) {
      setPriceError('Please enter a valid price');
      return;
    }

    const amazonFees = Number((scannedProduct.price * 0.15).toFixed(2));
    const shipping = 3.5;
    const profit = Number((scannedProduct.price - parsed - amazonFees - shipping).toFixed(2));
    const profitPct = Number(((profit / scannedProduct.price) * 100).toFixed(1));

    setScanResult({
      foundPrice: parsed,
      amazonFees,
      shipping,
      profit,
      profitPct,
    });
    setStep('result');
  };

  const handleOpenProduct = () => {
    if (!scannedProduct || !scanResult) {
      return;
    }

    const created = addScannedProduct(sessionId, {
      ...scannedProduct,
      foundPrice: scanResult.foundPrice,
    });

    router.push(`/session/${sessionId}/product/${created.id}`);
  };

  const scanToneLabel = step === 'scanning' ? 'Scanning' : 'Scan';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgStrong} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={styles.headerBackButton} onPress={() => router.replace(`/session/${sessionId}`)}>
            <ChevronLeft size={20} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>

          <View style={styles.headerMetaRow}>
            <View style={styles.scannerBadge}>
              <ScanLine size={14} color={colors.accent} strokeWidth={2.4} />
              <Text style={styles.scannerBadgeText}>Scanner</Text>
            </View>
            {scanCount > 0 ? <Text style={styles.scanCountText}>{scanCount} scanned</Text> : null}
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <ScannerFinder
          step={step}
          sheetVisible={sheetVisible}
          pulseAnimation={pulseAnimation}
          scanLineTranslate={scanLineTranslate}
        />

        {sheetVisible ? null : (
          <View style={styles.scanButtonWrap}>
            <Pressable style={styles.scanButtonPressable} onPress={triggerScan}>
              <LinearGradient colors={gradients.amber} style={styles.scanButton}>
                <ScanLine size={30} color={colors.accentText} strokeWidth={2.1} />
              </LinearGradient>
            </Pressable>
            <Text style={styles.scanButtonLabel}>{scanToneLabel}</Text>
          </View>
        )}

        {sheetVisible ? (
          <ScannerSheet
            step={step}
            scannedProduct={scannedProduct}
            priceInput={priceInput}
            priceError={priceError}
            errorReason={errorReason}
            scanResult={scanResult}
            profitTone={profitTone}
            onPriceChange={(value) => {
              setPriceInput(value);
              if (priceError) {
                setPriceError('');
              }
            }}
            onCancel={resetToIdle}
            onCalculate={handleCalculate}
            onScanAgain={resetToIdle}
            onOpenProduct={handleOpenProduct}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgStrong,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgStrong,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMetaRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scannerBadgeText: {
    color: colors.accent,
    fontSize: font.sizeXs,
    fontWeight: font.weightSemibold,
  },
  scanCountText: {
    color: colors.textSubtle,
    fontSize: font.sizeXs,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  viewfinder: {
    width: 288,
    height: 208,
    borderRadius: radius.xl,
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.18)',
  },
  pulseOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    backgroundColor: colors.accent,
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: colors.accent,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: radius.lg,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: radius.lg,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: radius.lg,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: radius.lg,
  },
  scanLineWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 0,
  },
  scanLine: {
    height: 1,
  },
  finderContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  finderCaption: {
    color: colors.textFaint,
    fontSize: font.sizeXs,
  },
  finderCaptionAmber: {
    color: colors.accent,
    fontSize: font.sizeXs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  scanButtonWrap: {
    marginTop: 48,
    alignItems: 'center',
    gap: 8,
  },
  scanButtonPressable: {
    borderRadius: radius.full,
  },
  scanButton: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.amber,
  },
  scanButtonLabel: {
    color: colors.textSubtle,
    fontSize: font.sizeXs,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingBottom: 20,
    ...shadows.card,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.textSubtle,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
    opacity: 0.7,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  successBadgeText: {
    color: colors.success,
    fontSize: font.sizeXs,
    fontWeight: font.weightSemibold,
  },
  asinText: {
    marginLeft: 'auto',
    color: colors.textFaint,
    fontSize: font.sizeXs,
  },
  asinTextLeft: {
    color: colors.textFaint,
    fontSize: font.sizeXs,
    marginTop: 2,
  },
  productPreviewCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
    padding: 12,
  },
  previewImage: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
  },
  previewBody: {
    flex: 1,
  },
  previewTitle: {
    color: colors.text,
    fontSize: font.sizeXs,
    lineHeight: 18,
  },
  previewCaption: {
    color: colors.textSubtle,
    fontSize: font.sizeXs,
    marginTop: 6,
  },
  previewCaptionValue: {
    color: colors.textMuted,
    fontWeight: font.weightMedium,
  },
  inputPrompt: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
  },
  priceEntryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 14,
  },
  priceEntryPrefix: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: font.weightSemibold,
    marginRight: 8,
  },
  priceEntryInput: {
    flex: 1,
    minHeight: 56,
    color: colors.text,
    fontSize: 28,
  },
  errorText: {
    color: colors.danger,
    fontSize: font.sizeXs,
  },
  errorSpacer: {
    height: 16,
  },
  sheetButtonRow: {
    flexDirection: 'row',
    gap: 10,
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
  primarySheetButtonPressable: {
    flex: 1,
    borderRadius: radius.lg,
  },
  primarySheetButton: {
    minHeight: 44,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primarySheetButtonText: {
    color: colors.accentText,
    fontSize: font.sizeSm,
    fontWeight: font.weightSemibold,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultImage: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
  },
  resultHeaderBody: {
    flex: 1,
  },
  breakdownCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgPanel,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  breakdownRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownLabel: {
    color: colors.textSubtle,
    fontSize: font.sizeXs,
  },
  breakdownValue: {
    fontSize: font.sizeXs,
    fontWeight: font.weightMedium,
  },
  breakdownProfitRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  breakdownProfitLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownProfitLabel: {
    fontSize: font.sizeXs,
    fontWeight: font.weightSemibold,
  },
  breakdownProfitValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  breakdownProfitValue: {
    fontSize: 24,
    fontWeight: font.weightBold,
  },
  breakdownPercent: {
    color: colors.textSubtle,
    fontSize: font.sizeXs,
  },
  errorBadgeIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBadgeText: {
    color: colors.danger,
    fontSize: font.sizeXs,
    fontWeight: font.weightSemibold,
  },
  errorCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorCardText: {
    flex: 1,
    color: '#fca5a5',
    fontSize: font.sizeSm,
    lineHeight: 20,
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: colors.bgStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  fallbackTitle: {
    color: colors.text,
    fontSize: font.sizeLg,
    fontWeight: font.weightSemibold,
    marginTop: 24,
  },
  fallbackSubtitle: {
    color: colors.textMuted,
    fontSize: font.sizeSm,
    marginTop: 8,
    textAlign: 'center',
  },
});