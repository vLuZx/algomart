import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  DollarSign,
  Package,
} from 'lucide-react-native';
import { colors, font, radius, shadows } from '../../../../constants/theme';
import { RatingStars } from '../../../../components/RatingStars';
import { ImageWithFallback } from '../../../../components/ImageWithFallback';
import { BuySignalCard } from '../../../../components/BuySignalCard';
import { ProfitOutlookCard } from '../../../../components/ProfitOutlookCard';
import { useSessions } from '../../../../store/sessions';
import type { CompetitionLevel, SellerPopularity } from '../../../../types/product';

type PopularityLevel = SellerPopularity;

const popularityCfg: Record<PopularityLevel, { color: string; bg: string; border: string }> = {
  Low: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.10)', border: 'rgba(248, 113, 113, 0.20)' },
  Medium: { color: '#facc15', bg: 'rgba(250, 204, 21, 0.10)', border: 'rgba(250, 204, 21, 0.20)' },
  High: { color: '#34d399', bg: 'rgba(52, 211, 153, 0.10)', border: 'rgba(52, 211, 153, 0.20)' },
  'Very High': { color: '#34d399', bg: 'rgba(52, 211, 153, 0.10)', border: 'rgba(52, 211, 153, 0.20)' },
};

const competitionCfg: Record<CompetitionLevel, { color: string; bg: string; border: string }> = {
  Low: { color: '#34d399', bg: 'rgba(52, 211, 153, 0.10)', border: 'rgba(52, 211, 153, 0.20)' },
  Medium: { color: '#facc15', bg: 'rgba(250, 204, 21, 0.10)', border: 'rgba(250, 204, 21, 0.20)' },
  High: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.10)', border: 'rgba(248, 113, 113, 0.20)' },
  'Very High': { color: '#f87171', bg: 'rgba(248, 113, 113, 0.10)', border: 'rgba(248, 113, 113, 0.20)' },
};

function getRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function marginColor(margin: number, foundPrice: number) {
  const pct = (margin / foundPrice) * 100;
  if (pct > 15) return '#34d399';
  if (pct > 8) return '#facc15';
  return '#f87171';
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId: string; productId: string }>();
  const sessionId = getRouteParam(params.sessionId);
  const productId = getRouteParam(params.productId);
  const { getProduct } = useSessions();
  const product = sessionId && productId ? getProduct(sessionId, productId) : undefined;

  if (!sessionId || !productId || !product) {
    return (
      <SafeAreaView style={styles.fallbackContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <Pressable style={styles.backButton} onPress={() => router.replace('/')}>
          <ChevronLeft size={20} color={colors.textMuted} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.fallbackTitle}>Product not found</Text>
        <Text style={styles.fallbackSubtitle}>The product details are unavailable for this session.</Text>
      </SafeAreaView>
    );
  }

  const profitC = marginColor(product.profitMargin, product.foundPrice);
  const profitPct = ((product.profitMargin / product.foundPrice) * 100).toFixed(1);
  const popCfg = popularityCfg[product.sellerPopularity];
  const compCfg = competitionCfg[product.competitionLevel];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Top bar */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.replace(`/session/${sessionId}`)}>
            <ChevronLeft size={20} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.headerTitle}>Product Details</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 1. Product Header */}
        <View style={styles.accentCard}>
          <View style={styles.accentLine} />
          <View style={styles.accentCardBody}>
            <View style={styles.productRow}>
              <View style={styles.thumbWrap}>
                <ImageWithFallback
                  source={{ uri: product.image }}
                  style={styles.thumb}
                />
              </View>
              <View style={styles.productInfoWrap}>
                <Text style={styles.productTitle} numberOfLines={2}>
                  {product.title}
                </Text>
                <View style={styles.ratingRow}>
                  <RatingStars rating={product.rating} size={14} />
                  <Text style={styles.ratingText}>
                    {product.rating.toFixed(1)} · {product.reviewCount.toLocaleString()} reviews
                  </Text>
                </View>
                <View style={styles.pillRow}>
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryPillText}>{product.category}</Text>
                  </View>
                  {product.requiresApproval ? (
                    <View style={styles.approvalPillWarn}>
                      <AlertCircle size={10} color="#facc15" strokeWidth={2} />
                      <Text style={styles.approvalPillWarnText}>Approval required</Text>
                    </View>
                  ) : (
                    <View style={styles.approvalPillOk}>
                      <CheckCircle2 size={10} color="#34d399" strokeWidth={2} />
                      <Text style={styles.approvalPillOkText}>Open to sell</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 2. Buy Signal */}
        <BuySignalCard
          product={{
            profitMargin: product.profitMargin,
            foundPrice: product.foundPrice,
            sellerPopularity: product.sellerPopularity,
            competitionLevel: product.competitionLevel,
            monthlySalesEstimate: product.monthlySalesEstimate,
            requiresApproval: product.requiresApproval,
            restrictions: product.restrictions,
            category: product.category,
            weight: product.weight,
          }}
        />

        {/* 3. Profit Outlook */}
        <ProfitOutlookCard />

        {/* 4. Profit Analysis */}
        <View style={styles.accentCard}>
          <View style={styles.accentLine} />
          <View style={styles.accentCardBody}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconWrap}>
                <DollarSign size={14} color={colors.accent} strokeWidth={2} />
              </View>
              <Text style={styles.sectionTitle}>Profit Analysis</Text>
            </View>

            <Text style={styles.subSectionLabel}>COST BREAKDOWN</Text>
            <View style={styles.twoColumnGrid}>
              <View style={styles.metricTile}>
                <Text style={styles.metricTileLabel}>Amazon Price</Text>
                <Text style={styles.metricTileValue}>${product.price.toFixed(2)}</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricTileLabel}>Found Price</Text>
                <Text style={styles.metricTileValue}>${product.foundPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricTileLabel}>Est. Shipping</Text>
                <Text style={styles.metricTileValue}>${product.estimatedShipping.toFixed(2)}</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricTileLabel}>Amazon Fees</Text>
                <Text style={styles.metricTileValue}>${product.amazonFees.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.profitRow}>
              <View>
                <Text style={styles.profitLabel}>NET PROFIT / UNIT</Text>
                <Text style={styles.profitSub}>After all fees & shipping</Text>
              </View>
              <View style={styles.profitValueWrap}>
                <Text style={[styles.profitValue, { color: profitC }]}>
                  +${product.profitMargin.toFixed(2)}
                </Text>
                <Text style={[styles.profitPct, { color: profitC, opacity: 0.7 }]}>
                  {profitPct}% margin
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 5. Market Statistics */}
        <View style={styles.accentCard}>
          <View style={styles.accentLine} />
          <View style={styles.accentCardBody}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconWrap}>
                <BarChart3 size={14} color={colors.accent} strokeWidth={2} />
              </View>
              <Text style={styles.sectionTitle}>Market Statistics</Text>
            </View>

            <Text style={styles.subSectionLabel}>MARKET SIGNAL</Text>
            <View style={styles.twoColumnGrid}>
              <View style={styles.metricTile}>
                <Text style={styles.metricTileLabel}>Seller Popularity</Text>
                <View style={[styles.stateBadge, { backgroundColor: popCfg.bg, borderColor: popCfg.border }]}>
                  <Text style={[styles.stateBadgeText, { color: popCfg.color }]}>
                    {product.sellerPopularity}
                  </Text>
                </View>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricTileLabel}>Competition</Text>
                <View style={[styles.stateBadge, { backgroundColor: compCfg.bg, borderColor: compCfg.border }]}>
                  <Text style={[styles.stateBadgeText, { color: compCfg.color }]}>
                    {product.competitionLevel}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.salesDivider} />
            <Text style={styles.subSectionLabel}>SALES DATA</Text>
            <View style={styles.twoColumnGrid}>
              <View style={styles.metricTile}>
                <Text style={styles.metricTileLabel}>Best Sellers Rank</Text>
                <Text style={styles.metricTileValue}>#{product.bsr.toLocaleString()}</Text>
                <Text style={styles.metricTileSub}>Cat. #{product.salesRank.toLocaleString()}</Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricTileLabel}>Monthly Sales</Text>
                <Text style={[styles.metricTileValue, { color: '#34d399' }]}>
                  ~{product.monthlySalesEstimate.toLocaleString()}
                </Text>
                <Text style={styles.metricTileSub}>units / month</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 6. Specifications */}
        <View style={styles.accentCard}>
          <View style={styles.accentLine} />
          <View style={styles.accentCardBody}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconWrap}>
                <Package size={14} color={colors.accent} strokeWidth={2} />
              </View>
              <Text style={styles.sectionTitle}>Specifications</Text>
            </View>

            <View style={styles.specTable}>
              <View style={[styles.specRow, styles.specRowBorder]}>
                <Text style={styles.specLabel}>Dimensions</Text>
                <Text style={styles.specValue}>{product.dimensions}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Weight</Text>
                <Text style={styles.specValue}>{product.weight}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 7. Restrictions */}
        {product.restrictions.length > 0 && (
          <View style={styles.restrictionCard}>
            <View style={[styles.accentLine, { backgroundColor: 'rgba(250, 204, 21, 0.50)' }]} />
            <View style={styles.accentCardBody}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconWrap, { backgroundColor: 'rgba(250, 204, 21, 0.10)' }]}>
                  <AlertCircle size={14} color="#facc15" strokeWidth={2} />
                </View>
                <Text style={styles.sectionTitle}>Restrictions</Text>
              </View>

              <View style={styles.specTable}>
                {product.restrictions.map((r, i) => (
                  <View
                    key={r}
                    style={[
                      styles.restrictionRow,
                      i < product.restrictions.length - 1 && styles.specRowBorder,
                    ]}
                  >
                    <View style={styles.restrictionDot} />
                    <Text style={styles.restrictionText}>{r}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18181b',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(39, 39, 42, 0.50)',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    ...shadows.soft,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: font.sizeMd,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },

  // Accent card (shared wrapper for sections with top gradient line)
  accentCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.50)',
    backgroundColor: 'rgba(39, 39, 42, 0.40)',
    overflow: 'hidden',
  },
  accentLine: {
    height: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.40)',
  },
  accentCardBody: {
    padding: 16,
  },

  // Product header
  productRow: {
    flexDirection: 'row',
    gap: 14,
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
  },
  thumb: {
    width: 72,
    height: 72,
  },
  productInfoWrap: {
    flex: 1,
    minWidth: 0,
  },
  productTitle: {
    color: colors.text,
    fontSize: font.sizeSm,
    lineHeight: 20,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  ratingText: {
    color: colors.textFaint,
    fontSize: 11,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(39, 39, 42, 0.80)',
    borderWidth: 1,
    borderColor: 'rgba(63, 63, 70, 0.40)',
  },
  categoryPillText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  approvalPillOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(52, 211, 153, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.20)',
  },
  approvalPillOkText: {
    color: '#34d399',
    fontSize: 11,
  },
  approvalPillWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(250, 204, 21, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.20)',
  },
  approvalPillWarnText: {
    color: '#facc15',
    fontSize: 11,
  },

  // Section titles with icon wrap
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: font.sizeSm,
  },
  subSectionLabel: {
    color: colors.textFaint,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 10,
  },

  // Metric tiles (dark bg)
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricTile: {
    width: '48%',
    backgroundColor: 'rgba(9, 9, 11, 0.50)',
    borderRadius: radius.lg,
    padding: 12,
  },
  metricTileLabel: {
    color: colors.textFaint,
    fontSize: 10,
    marginBottom: 6,
  },
  metricTileValue: {
    color: colors.textMuted,
    fontSize: font.sizeSm,
  },
  metricTileSub: {
    color: colors.textFaint,
    fontSize: 10,
    marginTop: 2,
  },

  // State badges (pill)
  stateBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    marginTop: 2,
  },
  stateBadgeText: {
    fontSize: 11,
  },

  salesDivider: {
    height: 1,
    backgroundColor: 'rgba(63, 63, 70, 0.40)',
    marginVertical: 16,
  },

  // Profit row
  profitRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(63, 63, 70, 0.40)',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  profitLabel: {
    color: colors.textFaint,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  profitSub: {
    color: colors.textFaint,
    fontSize: 11,
  },
  profitValueWrap: {
    alignItems: 'flex-end',
  },
  profitValue: {
    fontSize: font.size2xl,
    fontWeight: font.weightBold,
  },
  profitPct: {
    fontSize: 11,
  },

  // Specifications table
  specTable: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(63, 63, 70, 0.30)',
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  specRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(63, 63, 70, 0.30)',
  },
  specLabel: {
    color: colors.textFaint,
    fontSize: 11,
  },
  specValue: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
  },

  // Restrictions
  restrictionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.25)',
    backgroundColor: 'rgba(39, 39, 42, 0.40)',
    overflow: 'hidden',
  },
  restrictionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  restrictionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#facc15',
    marginTop: 5,
  },
  restrictionText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: font.sizeXs,
    lineHeight: 20,
  },

  // Fallback
  fallbackContainer: {
    flex: 1,
    backgroundColor: colors.bg,
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